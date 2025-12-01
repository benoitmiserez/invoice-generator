import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Party {
  id: number;
  company_name: string;
  contact_person?: string;
  address?: string;
  city?: string;
  vat_number?: string;
}

export interface PartyCreate {
  company_name: string;
  contact_person?: string;
  address?: string;
  city?: string;
  vat_number?: string;
}

export interface LineItem {
  id?: number;
  description: string;
  rate: number;
  quantity: number;
  unit: string;
  group_name?: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  date: string;
  party_id: number;
  payment_term: string;
  drive_file_id?: string;
  drive_file_url?: string;
  drive_folder_id?: string;
  party: Party;
  line_items: LineItem[];
}

export interface InvoiceCreate {
  invoice_number: string;
  date: string;
  party_id: number;
  payment_term: string;
  line_items: LineItem[];
}

export interface Config {
  id?: number;
  brand_name: string;
  legal_name: string;
  siret?: string;
  phone?: string;
  email?: string;
  address?: string;
  iban?: string;
  bic?: string;
  vat_note: string;
}

// Party API
export const getParties = () => api.get<Party[]>('/api/parties');
export const createParty = (data: PartyCreate) => api.post<Party>('/api/parties', data);
export const updateParty = (id: number, data: PartyCreate) => api.put<Party>(`/api/parties/${id}`, data);
export const deleteParty = (id: number) => api.delete(`/api/parties/${id}`);

// Invoice API
export const getInvoices = () => api.get<Invoice[]>('/api/invoices');
export const createInvoice = (data: InvoiceCreate) => api.post<Invoice>('/api/invoices', data);
export const getInvoice = (id: number) => api.get<Invoice>(`/api/invoices/${id}`);
export const deleteInvoice = (id: number) => api.delete(`/api/invoices/${id}`);
export const getNextInvoiceNumber = () => api.get<{ invoice_number: string }>('/api/invoices/next-number');
export const uploadInvoiceFile = (invoiceId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post<{ message: string; file_id: string; file_url: string; filename: string }>(
    `/api/invoices/${invoiceId}/files`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
};

// Config API
export const getConfig = () => api.get<Config>('/api/config');
export const updateConfig = (data: Config) => api.put<Config>('/api/config', data);

