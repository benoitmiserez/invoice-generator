from pydantic import BaseModel
from datetime import date
from typing import List, Optional

# Party schemas
class PartyBase(BaseModel):
    company_name: str
    contact_person: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    vat_number: Optional[str] = None
    payment_term: Optional[str] = "30 days"

class PartyCreate(PartyBase):
    pass

class Party(PartyBase):
    id: int
    
    class Config:
        from_attributes = True

# LineItem schemas
class LineItemBase(BaseModel):
    description: str
    rate: float
    quantity: float
    unit: str = "days"
    group_name: Optional[str] = None  # Optional group name for grouping line items

class LineItemCreate(LineItemBase):
    pass

class LineItem(LineItemBase):
    id: int
    invoice_id: int
    
    class Config:
        from_attributes = True

# Invoice schemas (payment_term is set from party on create)
class InvoiceBase(BaseModel):
    invoice_number: str
    date: date
    party_id: int
    payment_term: str = "30 days"

class InvoiceCreate(BaseModel):
    invoice_number: str
    date: date
    party_id: int
    line_items: List[LineItemCreate]

class Invoice(InvoiceBase):
    id: int
    drive_file_id: Optional[str] = None
    drive_file_url: Optional[str] = None
    drive_folder_id: Optional[str] = None
    party: Party
    line_items: List[LineItem]
    
    class Config:
        from_attributes = True

# Config schemas
class ConfigBase(BaseModel):
    brand_name: str
    legal_name: str
    siret: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    iban: Optional[str] = None
    bic: Optional[str] = None
    vat_note: str

class ConfigCreate(ConfigBase):
    pass

class Config(ConfigBase):
    id: int
    
    class Config:
        from_attributes = True

