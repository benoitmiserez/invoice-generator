import { useState, useEffect } from 'react';
import { getParties, createParty, createInvoice, getInvoice, getNextInvoiceNumber, uploadInvoiceFile, type Party, type PartyCreate, type InvoiceCreate } from '../api';
import { unitOptions, rateOptions, groupNameOptions, descriptionSuggestionsByGroup } from '../config';

export default function InvoiceForm() {
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<number | ''>('');
  const [showNewPartyModal, setShowNewPartyModal] = useState(false);
  const [newParty, setNewParty] = useState<PartyCreate>({
    company_name: '',
    contact_person: '',
    address: '',
    city: '',
    vat_number: '',
    payment_term: '',
  });
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [suggestedInvoiceNumber, setSuggestedInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState([
    { description: '', rate: 0, quantity: 0, unit: '', group_name: '' }
  ]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ message: string; url?: string } | null>(null);

  useEffect(() => {
    loadParties();
    loadNextInvoiceNumber();
  }, []);

  const loadParties = async () => {
    try {
      const response = await getParties();
      setParties(response.data);
    } catch (error) {
      console.error('Error loading parties:', error);
    }
  };

  const loadNextInvoiceNumber = async () => {
    try {
      const response = await getNextInvoiceNumber();
      setSuggestedInvoiceNumber(response.data.invoice_number);
    } catch (error) {
      console.error('Error loading invoice number:', error);
    }
  };

  const handleAddParty = async () => {
    try {
      const response = await createParty(newParty);
      setParties([...parties, response.data]);
      setSelectedPartyId(response.data.id);
      setShowNewPartyModal(false);
      setNewParty({
        company_name: '',
        contact_person: '',
        address: '',
        city: '',
        vat_number: '',
        payment_term: '',
      });
    } catch (error) {
      console.error('Error creating party:', error);
      alert('Error creating client. Please try again.');
    }
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: '', rate: 0, quantity: 0, unit: '', group_name: '' }]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: string, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
  };

  // Generate month/year suggestions for AI Engineering Services (previous month only)
  const getMonthYearSuggestions = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();
    
    // Calculate previous month
    let previousMonthIndex = currentMonth - 1;
    let previousYear = currentYear;
    
    // Handle year rollover (if current month is January, previous month is December of previous year)
    if (previousMonthIndex < 0) {
      previousMonthIndex = 11; // December
      previousYear = currentYear - 1;
    }
    
    const previousMonthName = months[previousMonthIndex];
    
    return [`${previousMonthName} ${previousYear}`];
  };

  // Get description suggestions based on group name (from env; empty list for a group = use dynamic previous month)
  const getDescriptionSuggestions = (groupName: string) => {
    const fromEnv = descriptionSuggestionsByGroup[groupName];
    if (fromEnv && fromEnv.length > 0) return fromEnv;
    if (groupName in descriptionSuggestionsByGroup) return getMonthYearSuggestions();
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPartyId) {
      alert('Please select or create a client');
      return;
    }

    if (lineItems.some(item => !item.description || item.rate <= 0 || item.quantity <= 0)) {
      alert('Please fill in all line items with valid values');
      return;
    }

    setLoading(true);
    try {
      const invoiceData: InvoiceCreate = {
        invoice_number: invoiceNumber,
        date: invoiceDate,
        party_id: selectedPartyId as number,
        line_items: lineItems.map(item => ({
          description: item.description,
          rate: item.rate,
          quantity: item.quantity,
          unit: item.unit,
          group_name: item.group_name || undefined,
        })),
      };

      const response = await createInvoice(invoiceData);
      
      // Upload attached files if any
      let finalInvoice = response.data;
      if (attachedFiles.length > 0) {
        try {
          for (const file of attachedFiles) {
            await uploadInvoiceFile(response.data.id, file);
          }
          // Refetch invoice to get updated drive_folder_id after file uploads
          const updatedResponse = await getInvoice(response.data.id);
          finalInvoice = updatedResponse.data;
        } catch (error) {
          console.error('Error uploading files:', error);
          // Don't fail the whole operation if file upload fails
        }
      }
      
      // Use folder link if files were uploaded and folder exists, otherwise use file link
      const driveUrl = (attachedFiles.length > 0 && finalInvoice.drive_folder_id)
        ? `https://drive.google.com/drive/folders/${finalInvoice.drive_folder_id}`
        : finalInvoice.drive_file_url;
      
      setSuccess({
        message: 'Invoice generated successfully!',
        url: driveUrl,
      });

      // Reset form
      setSelectedPartyId('');
      setInvoiceNumber('');
      setLineItems([{ description: '', rate: 0, quantity: 0, unit: '', group_name: '' }]);
      setAttachedFiles([]);
      loadNextInvoiceNumber();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      alert(error.response?.data?.detail || 'Error generating invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Invoice</h1>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success.message}</p>
          {success.url ? (
            <a
              href={success.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 underline mt-2 inline-block mr-4"
            >
              View in Google Drive
            </a>
          ) : (
            <p className="text-yellow-700 text-sm mt-2">
              Note: Invoice created but not uploaded to Google Drive. Please check your Google Drive credentials setup.
            </p>
          )}
          <a
            href="/history"
            className="text-indigo-600 underline mt-2 inline-block"
          >
            View in Invoice History
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client
            </label>
            <div className="flex gap-2">
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value ? Number(e.target.value) : '')}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                <option value="">Select a client</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.company_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewPartyModal(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Add New
              </button>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Number
              </label>
              <input
                type="text"
                list="invoice-number-suggestions"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Invoice Number"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
              {suggestedInvoiceNumber && (
                <datalist id="invoice-number-suggestions">
                  <option value={suggestedInvoiceNumber} />
                </datalist>
              )}
              <p className="mt-1 text-xs text-gray-500">Suggested: {suggestedInvoiceNumber || 'Loading...'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Line Items
            </label>
            <div className="space-y-4">
              {lineItems.map((item, index) => {
                const descriptionSuggestions = getDescriptionSuggestions(item.group_name || '');
                return (
                <div key={index} className="space-y-2 p-3 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 mb-2">
                      <input
                        type="text"
                        list={groupNameOptions.length > 0 ? `group-name-${index}` : undefined}
                        placeholder="Group Name (optional)"
                        value={item.group_name || ''}
                        onChange={(e) => handleLineItemChange(index, 'group_name', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                      />
                      {groupNameOptions.length > 0 && (
                        <datalist id={`group-name-${index}`}>
                          {groupNameOptions.map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      )}
                      <p className="mt-1 text-xs text-gray-500">Items with the same group name will be grouped together in the invoice</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <input
                        type="text"
                        list={descriptionSuggestions.length > 0 ? `description-${index}` : undefined}
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                      />
                      {descriptionSuggestions.length > 0 && (
                        <datalist id={`description-${index}`}>
                          {descriptionSuggestions.map((suggestion, idx) => (
                            <option key={idx} value={suggestion} />
                          ))}
                        </datalist>
                      )}
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        list={rateOptions.length > 0 ? `rate-${index}` : undefined}
                        placeholder="Rate"
                        value={item.rate || ''}
                        onChange={(e) => handleLineItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                        min="0"
                        step="0.01"
                      />
                      {rateOptions.length > 0 && (
                        <datalist id={`rate-${index}`}>
                          {rateOptions.map((rate) => (
                            <option key={rate} value={rate} />
                          ))}
                        </datalist>
                      )}
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={item.quantity || ''}
                        onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        list={unitOptions.length > 0 ? `unit-${index}` : undefined}
                        placeholder="Unit"
                        value={item.unit}
                        onChange={(e) => handleLineItemChange(index, 'unit', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                      />
                      {unitOptions.length > 0 && (
                        <datalist id={`unit-${index}`}>
                          {unitOptions.map((unit) => (
                            <option key={unit} value={unit} />
                          ))}
                        </datalist>
                      )}
                    </div>
                    <div className="col-span-1">
                      <span className="text-gray-700 font-medium">
                        €{(item.rate * item.quantity).toFixed(2)}
                      </span>
                    </div>
                    <div className="col-span-1">
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
              <button
                type="button"
                onClick={handleAddLineItem}
                className="text-indigo-600 hover:text-indigo-800"
              >
                + Add Line Item
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="text-right">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">€{calculateTotal().toFixed(2)}</p>
            </div>
          </div>

          {/* File Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (e.g., proof of expenses)
            </label>
            <input
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setAttachedFiles([...attachedFiles, ...files]);
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            {attachedFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachedFiles(attachedFiles.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>
        </div>
      </form>

      {/* New Party Modal */}
      {showNewPartyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add New Client</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={newParty.company_name}
                  onChange={(e) => setNewParty({ ...newParty, company_name: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={newParty.contact_person}
                  onChange={(e) => setNewParty({ ...newParty, contact_person: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newParty.address}
                  onChange={(e) => setNewParty({ ...newParty, address: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={newParty.city}
                  onChange={(e) => setNewParty({ ...newParty, city: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VAT Number
                </label>
                <input
                  type="text"
                  value={newParty.vat_number}
                  onChange={(e) => setNewParty({ ...newParty, vat_number: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Term
                </label>
                <input
                  type="text"
                  value={newParty.payment_term || ''}
                  onChange={(e) => setNewParty({ ...newParty, payment_term: e.target.value })}
                  placeholder="e.g. 30 days"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewPartyModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddParty}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

