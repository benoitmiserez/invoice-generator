from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from typing import List
from datetime import date
import os

from database import get_db, init_db
from models import Party, Invoice, LineItem, Config
from schemas import (
    Party as PartySchema, PartyCreate,
    Invoice as InvoiceSchema, InvoiceCreate,
    LineItem as LineItemSchema,
    Config as ConfigSchema, ConfigCreate
)
from pdf_generator import generate_pdf
from google_drive import upload_to_drive, upload_file_to_invoice_folder

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    yield
    # Shutdown (if needed)

app = FastAPI(lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Party endpoints
@app.get("/api/parties", response_model=List[PartySchema])
def list_parties(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    parties = db.query(Party).offset(skip).limit(limit).all()
    return parties

@app.post("/api/parties", response_model=PartySchema)
def create_party(party: PartyCreate, db: Session = Depends(get_db)):
    db_party = Party(**party.model_dump())
    db.add(db_party)
    db.commit()
    db.refresh(db_party)
    return db_party

@app.get("/api/parties/{party_id}", response_model=PartySchema)
def get_party(party_id: int, db: Session = Depends(get_db)):
    party = db.query(Party).filter(Party.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    return party

@app.put("/api/parties/{party_id}", response_model=PartySchema)
def update_party(party_id: int, party: PartyCreate, db: Session = Depends(get_db)):
    db_party = db.query(Party).filter(Party.id == party_id).first()
    if not db_party:
        raise HTTPException(status_code=404, detail="Party not found")
    for key, value in party.model_dump().items():
        setattr(db_party, key, value)
    db.commit()
    db.refresh(db_party)
    return db_party

@app.delete("/api/parties/{party_id}")
def delete_party(party_id: int, db: Session = Depends(get_db)):
    db_party = db.query(Party).filter(Party.id == party_id).first()
    if not db_party:
        raise HTTPException(status_code=404, detail="Party not found")
    db.delete(db_party)
    db.commit()
    return {"message": "Party deleted"}

# Invoice endpoints
@app.get("/api/invoices", response_model=List[InvoiceSchema])
def list_invoices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    try:
        invoices = db.query(Invoice).options(
            joinedload(Invoice.party),
            joinedload(Invoice.line_items)
        ).order_by(Invoice.date.desc()).offset(skip).limit(limit).all()
        
        # Convert to schema manually to ensure proper serialization
        result = [InvoiceSchema.model_validate(inv) for inv in invoices]
        return result
    except Exception as e:
        import traceback
        print(f"Error in list_invoices: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error loading invoices: {str(e)}")

@app.post("/api/invoices", response_model=InvoiceSchema)
def create_invoice(invoice: InvoiceCreate, db: Session = Depends(get_db)):
    try:
        # Create invoice
        invoice_data = invoice.model_dump()
        line_items_data = invoice_data.pop("line_items")
        
        db_invoice = Invoice(**invoice_data)
        db.add(db_invoice)
        db.commit()
        db.refresh(db_invoice)
        
        # Create line items
        for item_data in line_items_data:
            db_line_item = LineItem(invoice_id=db_invoice.id, **item_data)
            db.add(db_line_item)
        
        db.commit()
        db.refresh(db_invoice)
        
        # Load relationships
        party = db.query(Party).filter(Party.id == db_invoice.party_id).first()
        if not party:
            raise HTTPException(status_code=404, detail="Party not found")
        
        # Reload invoice with relationships
        from sqlalchemy.orm import joinedload
        db_invoice = db.query(Invoice).options(
            joinedload(Invoice.party),
            joinedload(Invoice.line_items)
        ).filter(Invoice.id == db_invoice.id).first()
        
        # Ensure line_items is a list (not a lazy loader)
        line_items = list(db_invoice.line_items)
        
        # Generate PDF
        config = db.query(Config).first()
        if not config:
            raise HTTPException(status_code=400, detail="Business config not set. Please configure your business details first.")
        
        pdf_bytes = generate_pdf(db_invoice, party, config, line_items)
        
        # Upload to Google Drive
        try:
            file_id, file_url, folder_id = upload_to_drive(
                pdf_bytes,
                f"invoice_{db_invoice.invoice_number}.pdf",
                party.company_name,
                db_invoice.invoice_number
            )
            db_invoice.drive_file_id = file_id
            db_invoice.drive_file_url = file_url
            db_invoice.drive_folder_id = folder_id
            db.commit()
            # Reload with relationships again after update
            db_invoice = db.query(Invoice).options(
                joinedload(Invoice.party),
                joinedload(Invoice.line_items)
            ).filter(Invoice.id == db_invoice.id).first()
        except FileNotFoundError as e:
            # Credentials not found - this is expected on first run
            print(f"Google Drive credentials not found: {e}")
            print("Invoice created but not uploaded to Drive. Please set up Google Drive credentials.")
        except Exception as e:
            # Log error but don't fail the invoice creation
            import traceback
            print(f"Error uploading to Google Drive: {e}")
            traceback.print_exc()
        
        # Return the invoice with relationships loaded
        # FastAPI will serialize it using the response_model
        return db_invoice
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error creating invoice: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating invoice: {str(e)}")

@app.get("/api/invoices/next-number")
def get_next_invoice_number(db: Session = Depends(get_db)):
    """Generate next invoice number in YYYYMM## format where ## is the invoice number for the month"""
    today = date.today()
    year_month = today.strftime("%Y%m")
    
    # Find all invoices for this month (starting with YYYYMM)
    month_invoices = db.query(Invoice).filter(
        Invoice.invoice_number.like(f"{year_month}%")
    ).all()
    
    # Extract the sequence numbers from existing invoices
    sequence_numbers = []
    for inv in month_invoices:
        # Invoice number format: YYYYMM## (8 digits total)
        # Handle both old format (YYYYMMDD) and new format (YYYYMM##)
        if len(inv.invoice_number) >= 8 and inv.invoice_number[:6] == year_month:
            try:
                # Try to extract last 2 digits as sequence
                # For old format (YYYYMMDD), we'll use the day as sequence
                # For new format (YYYYMM##), we'll use the ## as sequence
                if len(inv.invoice_number) == 8:
                    seq = int(inv.invoice_number[6:8])
                    sequence_numbers.append(seq)
            except ValueError:
                # Skip if not in expected format
                pass
    
    # Get the next sequence number
    if sequence_numbers:
        next_sequence = max(sequence_numbers) + 1
    else:
        next_sequence = 1
    
    # Format as YYYYMM## with zero-padded sequence (always 2 digits)
    invoice_number = f"{year_month}{next_sequence:02d}"
    
    # Double-check uniqueness (in case of edge cases)
    existing = db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()
    if existing:
        # If somehow it exists, increment
        next_sequence += 1
        invoice_number = f"{year_month}{next_sequence:02d}"
    
    return {"invoice_number": invoice_number}

@app.get("/api/invoices/{invoice_id}", response_model=InvoiceSchema)
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@app.delete("/api/invoices/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Delete from Google Drive if folder exists (this will delete the folder and all contents)
    if invoice.drive_folder_id:
        try:
            from google_drive import delete_from_drive
            # Delete the entire invoice folder (which contains the PDF and all attachments)
            delete_from_drive(invoice.drive_folder_id)
        except Exception as e:
            # Log error but don't fail - continue with database deletion
            print(f"Warning: Could not delete folder from Google Drive: {e}")
    elif invoice.drive_file_id:
        # Fallback: delete just the PDF file if folder ID doesn't exist
        try:
            from google_drive import delete_from_drive
            delete_from_drive(invoice.drive_file_id)
        except Exception as e:
            print(f"Warning: Could not delete file from Google Drive: {e}")
    
    # Delete the invoice (line items will be cascade deleted)
    db.delete(invoice)
    db.commit()
    return {"message": "Invoice deleted successfully"}

@app.post("/api/invoices/{invoice_id}/files")
async def upload_invoice_file(
    invoice_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a file attachment to an existing invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Ensure invoice has a folder in Drive
    if not invoice.drive_folder_id:
        # Create folder if it doesn't exist
        try:
            party = db.query(Party).filter(Party.id == invoice.party_id).first()
            if not party:
                raise HTTPException(status_code=404, detail="Party not found")
            
            from google_drive import get_credentials, get_or_create_folder
            from googleapiclient.discovery import build
            
            creds = get_credentials()
            service = build('drive', 'v3', credentials=creds)
            
            invoices_folder_id = get_or_create_folder(service, "Invoices")
            client_folder_id = get_or_create_folder(service, party.company_name, invoices_folder_id)
            invoice_folder_id = get_or_create_folder(service, invoice.invoice_number, client_folder_id)
            
            invoice.drive_folder_id = invoice_folder_id
            db.commit()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating invoice folder: {str(e)}")
    
    # Read file content
    file_content = await file.read()
    
    # Upload to Drive
    try:
        file_id, file_url = upload_file_to_invoice_folder(
            invoice.drive_folder_id,
            file_content,
            file.filename,
            file.content_type
        )
        return {
            "message": "File uploaded successfully",
            "file_id": file_id,
            "file_url": file_url,
            "filename": file.filename
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

# Config endpoints
@app.get("/api/config", response_model=ConfigSchema)
def get_config(db: Session = Depends(get_db)):
    config = db.query(Config).first()
    if not config:
        # Return default config
        return ConfigSchema(
            brand_name="YOUR BRAND NAME",
            legal_name="YOUR LEGAL NAME",
            vat_note="VAT not applicable, Art. 293 B of the French Tax Code"
        )
    return config

@app.put("/api/config", response_model=ConfigSchema)
def update_config(config: ConfigCreate, db: Session = Depends(get_db)):
    db_config = db.query(Config).first()
    if not db_config:
        db_config = Config(**config.model_dump())
        db.add(db_config)
    else:
        for key, value in config.model_dump().items():
            setattr(db_config, key, value)
    db.commit()
    db.refresh(db_config)
    return db_config

