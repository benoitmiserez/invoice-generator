import { useState, useEffect } from 'react';
import { getInvoices, deleteInvoice, uploadInvoiceFile, type Invoice } from '../api';

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingInvoiceId, setUploadingInvoiceId] = useState<number | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const response = await getInvoices();
      setInvoices(response.data);
    } catch (error) {
      console.error('Error loading invoices:', error);
      alert('Error loading invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (invoice: Invoice) => {
    return invoice.line_items.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
  };

  const handleDelete = async (id: number, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete invoice #${invoiceNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteInvoice(id);
      // Reload the invoice list
      loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Error deleting invoice. Please try again.');
    }
  };

  const handleFileUpload = async (invoiceId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingInvoiceId(invoiceId);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadInvoiceFile(invoiceId, files[i]);
      }
      alert('Files uploaded successfully!');
      loadInvoices(); // Reload to get updated info
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files. Please try again.');
    } finally {
      setUploadingInvoiceId(null);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Invoice History</h1>
        <button
          onClick={loadInvoices}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Term
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {invoice.invoice_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(invoice.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {invoice.party.company_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  €{calculateTotal(invoice).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {invoice.payment_term}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-3">
                    {invoice.drive_folder_id ? (
                      <a
                        href={`https://drive.google.com/drive/folders/${invoice.drive_folder_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900"
                        title="View invoice folder in Drive"
                      >
                        View Folder
                      </a>
                    ) : invoice.drive_file_url ? (
                      <a
                        href={invoice.drive_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View PDF
                      </a>
                    ) : (
                      <span className="text-gray-400">Not uploaded</span>
                    )}
                    {invoice.drive_folder_id && (
                      <label className="text-indigo-600 hover:text-indigo-900 cursor-pointer">
                        <input
                          type="file"
                          multiple
                          onChange={(e) => handleFileUpload(invoice.id, e)}
                          className="hidden"
                          disabled={uploadingInvoiceId === invoice.id}
                        />
                        {uploadingInvoiceId === invoice.id ? 'Uploading...' : 'Add Files'}
                      </label>
                    )}
                    <button
                      onClick={() => handleDelete(invoice.id, invoice.invoice_number)}
                      className="text-red-600 hover:text-red-900 font-medium"
                      title="Delete invoice"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No invoices yet. Create your first invoice to get started.
          </div>
        )}
      </div>
    </div>
  );
}

