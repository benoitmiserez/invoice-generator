from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from database import Base

class Party(Base):
    __tablename__ = "parties"
    
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, nullable=False)
    contact_person = Column(String)
    address = Column(String)
    city = Column(String)
    vat_number = Column(String)
    payment_term = Column(String, default="30 days")
    
    invoices = relationship("Invoice", back_populates="party")

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, nullable=False, index=True)
    date = Column(Date, nullable=False)
    party_id = Column(Integer, ForeignKey("parties.id"), nullable=False)
    payment_term = Column(String, default="30 days")
    drive_file_id = Column(String)
    drive_file_url = Column(String)
    drive_folder_id = Column(String)  # Folder ID for invoice-specific folder containing PDF and attachments
    
    party = relationship("Party", back_populates="invoices")
    line_items = relationship("LineItem", back_populates="invoice", cascade="all, delete-orphan")

class LineItem(Base):
    __tablename__ = "line_items"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    description = Column(String, nullable=False)
    rate = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, default="days")
    group_name = Column(String, nullable=True)  # Optional group name for grouping line items
    
    invoice = relationship("Invoice", back_populates="line_items")

class Config(Base):
    __tablename__ = "config"
    
    id = Column(Integer, primary_key=True, index=True)
    brand_name = Column(String, default="YOUR BRAND NAME")
    legal_name = Column(String, default="YOUR LEGAL NAME")
    siret = Column(String)
    phone = Column(String)
    email = Column(String)
    address = Column(String)
    iban = Column(String)
    bic = Column(String)
    vat_note = Column(String, default="VAT not applicable, Art. 293 B of the French Tax Code")

