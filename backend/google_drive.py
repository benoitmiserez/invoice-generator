import os
import pickle
from typing import Tuple
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from io import BytesIO

# Scopes required for Google Drive API
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def get_credentials():
    """Get valid user credentials from storage or prompt for authorization"""
    creds = None
    credentials_dir = os.path.join(os.path.dirname(__file__), "..", "credentials")
    token_path = os.path.join(credentials_dir, "token.pickle")
    
    # Create credentials directory if it doesn't exist
    os.makedirs(credentials_dir, exist_ok=True)
    
    # Find credentials file (could be credentials.json or client_secret_*.json)
    credentials_path = None
    possible_names = [
        "credentials.json",
        "client_secret_*.json",
    ]
    
    # First try exact match
    exact_path = os.path.join(credentials_dir, "credentials.json")
    if os.path.exists(exact_path):
        credentials_path = exact_path
    else:
        # Look for client_secret files
        import glob
        client_secret_files = glob.glob(os.path.join(credentials_dir, "client_secret_*.json"))
        if client_secret_files:
            credentials_path = client_secret_files[0]
    
    # Load existing token if available
    if os.path.exists(token_path):
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)
    
    # If there are no (valid) credentials available, let the user log in
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not credentials_path:
                raise FileNotFoundError(
                    f"Google credentials not found in {credentials_dir}. "
                    "Please download credentials.json (or client_secret_*.json) from Google Cloud Console "
                    "and place it in the credentials/ folder."
                )
            flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save the credentials for the next run
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
    
    return creds

def get_or_create_folder(service, folder_name, parent_id=None):
    """Get existing folder or create it if it doesn't exist"""
    # Build query to find folder in the specified parent
    if parent_id:
        query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and '{parent_id}' in parents and trashed=false"
    else:
        # For root, check both 'root' in parents and also check if it's in the actual root
        # First try the standard root query
        query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false"
    
    results = service.files().list(q=query, spaces='drive', fields='files(id, name, parents)').execute()
    files_list = results.get('files', [])
    
    if files_list:
        # Found existing folder - use the first one
        folder_id = files_list[0]['id']
        folder_parents = files_list[0].get('parents', [])
        
        # Ensure folder_parents is a list (not a function or other type)
        if not isinstance(folder_parents, list):
            folder_parents = []
        
        # Verify it's in the correct location
        if parent_id:
            # For subfolders, verify parent matches
            if parent_id in folder_parents:
                return folder_id
        else:
            # For root folders, accept any folder found (it's in root or a valid location)
            return folder_id
    
    # Folder doesn't exist - create it
    folder_metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    if parent_id:
        folder_metadata['parents'] = [parent_id]
    # If parent_id is None, don't specify parents - it will be created in root
    
    folder = service.files().create(body=folder_metadata, fields='id').execute()
    return folder.get('id')

def upload_to_drive(pdf_bytes: bytes, filename: str, client_name: str, invoice_number: str = None) -> Tuple[str, str, str]:
    """
    Upload PDF to Google Drive, organized by client name and invoice number
    
    Returns:
        tuple: (file_id, file_url, folder_id)
    """
    creds = get_credentials()
    service = build('drive', 'v3', credentials=creds)
    
    # Get or create root "Invoices" folder
    invoices_folder_id = get_or_create_folder(service, "Invoices")
    
    # Get or create client folder
    client_folder_id = get_or_create_folder(service, client_name, invoices_folder_id)
    
    # Get or create invoice-specific folder if invoice number provided
    invoice_folder_id = client_folder_id
    if invoice_number:
        invoice_folder_id = get_or_create_folder(service, invoice_number, client_folder_id)
    
    # Upload file to invoice folder
    file_metadata = {
        'name': filename,
        'parents': [invoice_folder_id]
    }
    
    media = MediaIoBaseUpload(
        BytesIO(pdf_bytes),
        mimetype='application/pdf',
        resumable=True
    )
    
    file = service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id, webViewLink'
    ).execute()
    
    file_id = file.get('id')
    file_url = file.get('webViewLink')
    
    return file_id, file_url, invoice_folder_id

def upload_file_to_invoice_folder(folder_id: str, file_bytes: bytes, filename: str, mime_type: str = None) -> Tuple[str, str]:
    """
    Upload a file to a specific invoice folder in Google Drive
    
    Args:
        folder_id: The Google Drive folder ID for the invoice
        file_bytes: The file content as bytes
        filename: The name of the file
        mime_type: The MIME type of the file (auto-detected if not provided)
    
    Returns:
        tuple: (file_id, file_url)
    """
    import mimetypes
    
    creds = get_credentials()
    service = build('drive', 'v3', credentials=creds)
    
    # Auto-detect MIME type if not provided
    if not mime_type:
        mime_type, _ = mimetypes.guess_type(filename)
        if not mime_type:
            mime_type = 'application/octet-stream'
    
    file_metadata = {
        'name': filename,
        'parents': [folder_id]
    }
    
    media = MediaIoBaseUpload(
        BytesIO(file_bytes),
        mimetype=mime_type,
        resumable=True
    )
    
    file = service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id, webViewLink'
    ).execute()
    
    file_id = file.get('id')
    file_url = file.get('webViewLink')
    
    return file_id, file_url

def delete_from_drive(file_id: str):
    """
    Delete a file from Google Drive by its file ID
    
    Args:
        file_id: The Google Drive file ID to delete
    """
    try:
        creds = get_credentials()
        service = build('drive', 'v3', credentials=creds)
        service.files().delete(fileId=file_id).execute()
    except Exception as e:
        # Log error but don't raise - file might already be deleted
        print(f"Error deleting file {file_id} from Google Drive: {e}")
        # Don't raise - we don't want to fail invoice deletion if Drive deletion fails

