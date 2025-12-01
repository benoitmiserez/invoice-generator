# Invoice Generator

A local invoice generation app with React frontend, Python/FastAPI backend, PDF generation, and Google Drive integration.

## Features

- Create invoices with a web-based form
- Generate PDF invoices matching your existing invoice style
- Automatically upload invoices to Google Drive (organized by client)
- Manage client/party information
- View invoice history with links to Google Drive files
- Configure your business details

## Prerequisites

- Python 3.8+
- Node.js 16+
- Google Cloud account (for Google Drive API)

## Setup

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the Google Drive API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Desktop app"
   - Name it (e.g., "Invoice Generator")
   - Click "Create"
   - Download the JSON file
5. Place the downloaded file in `credentials/credentials.json`

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

## Running the Application

### Option 1: Use the start script

```bash
chmod +x start.sh
./start.sh
```

### Option 2: Manual start

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## First Run

1. **Configure your business details:**
   - Navigate to Settings
   - Fill in your business information (brand name, legal name, SIRET, contact info, bank details, etc.)
   - Click "Save Settings"

2. **Authorize Google Drive:**
   - When you create your first invoice, the app will prompt you to authorize Google Drive access
   - A browser window will open for authentication
   - After authorization, a token will be saved locally for future use

3. **Add a client:**
   - Go to "New Invoice"
   - Click "Add New" next to the client dropdown
   - Fill in client details and click "Add Client"

4. **Create your first invoice:**
   - Select a client
   - Add line items (description, rate, quantity, unit)
   - Click "Generate Invoice"
   - The PDF will be generated and uploaded to Google Drive automatically

## Project Structure

```
invoice-generator/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models.py            # SQLAlchemy database models
│   ├── database.py          # Database connection
│   ├── schemas.py           # Pydantic schemas
│   ├── pdf_generator.py     # PDF generation logic
│   ├── google_drive.py      # Google Drive integration
│   ├── templates/
│   │   └── invoice.html     # Invoice PDF template
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main app component
│   │   ├── api.ts           # API client
│   │   ├── pages/           # Page components
│   │   └── components/      # Reusable components
│   └── package.json        # Node dependencies
├── credentials/             # Google credentials (gitignored)
├── start.sh                # Start script
└── README.md
```

## Invoice Numbering

Invoice numbers are generated in `YYYYMMDD` format (e.g., `20251001`). If multiple invoices are created on the same day, a suffix is added (e.g., `20251001_1`).

## Google Drive Organization

Invoices are organized in Google Drive as follows:
```
Invoices/
  └── Client Name/
      └── invoice_20251001_Client_Name.pdf
```

## Troubleshooting

### Google Drive Authorization Issues
- Make sure `credentials/credentials.json` exists
- Delete `credentials/token.pickle` and re-authenticate if needed
- Check that Google Drive API is enabled in your Google Cloud project

### PDF Generation Issues
- Ensure WeasyPrint dependencies are installed (may require system libraries on Linux)
- Check that the template file exists at `backend/templates/invoice.html`

### Database Issues
- The SQLite database is created automatically on first run
- If you need to reset, delete `backend/invoice_generator.db`

## License

MIT

