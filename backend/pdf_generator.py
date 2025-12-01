from jinja2 import Template
from weasyprint import HTML
from io import BytesIO
import os
from models import Invoice, Party, Config, LineItem
from typing import List

def generate_pdf(invoice: Invoice, party: Party, config: Config, line_items: List[LineItem]) -> bytes:
    """Generate PDF invoice from template"""
    
    # Calculate total
    total = sum(item.rate * item.quantity for item in line_items)
    
    # Format date
    formatted_date = invoice.date.strftime("%d %B %Y")
    
    # Format line items for display, grouped by group_name
    from collections import defaultdict
    
    # Group items by group_name
    grouped_items = defaultdict(list)
    ungrouped_items = []
    
    for item in line_items:
        formatted_item = {
            'description': item.description,
            'rate': f"{item.rate:.2f}",
            'quantity': f"{item.quantity:.2f}",
            'unit': item.unit,
            'total': f"{(item.rate * item.quantity):.2f}"
        }
        if item.group_name:
            grouped_items[item.group_name].append(formatted_item)
        else:
            ungrouped_items.append(formatted_item)
    
    # Build formatted_line_items: groups first, then ungrouped items
    formatted_line_items = []
    
    # Add grouped items with group headers
    for group_name, group_items in grouped_items.items():
        formatted_line_items.append({
            'is_group_header': True,
            'group_name': group_name,
            'items': group_items
        })
    
    # Add ungrouped items (as regular items, not grouped)
    for item in ungrouped_items:
        formatted_line_items.append(item)
    
    # Format total
    formatted_total = f"{total:,.2f}".replace(",", " ")
    
    # Load template
    template_path = os.path.join(os.path.dirname(__file__), "templates", "invoice.html")
    with open(template_path, "r") as f:
        template_content = f.read()
    
    template = Template(template_content)
    
    # Render template with data
    html_content = template.render(
        brand_name=config.brand_name,
        invoice_number=invoice.invoice_number,
        date=formatted_date,
        party=party,
        line_items=formatted_line_items,
        total=formatted_total,
        config=config,
        payment_term=invoice.payment_term
    )
    
    # Generate PDF
    html = HTML(string=html_content)
    pdf_bytes = html.write_pdf()
    
    return pdf_bytes

