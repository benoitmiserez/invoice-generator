import { useState, useEffect } from 'react';
import { getParties, deleteParty, updateParty, type Party, type PartyCreate } from '../api';

export default function PartyList() {
  const [parties, setParties] = useState<Party[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<PartyCreate | null>(null);

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      const response = await getParties();
      setParties(response.data);
    } catch (error) {
      console.error('Error loading parties:', error);
    }
  };

  const handleEdit = (party: Party) => {
    setEditingId(party.id);
    setEditForm({
      company_name: party.company_name,
      contact_person: party.contact_person || '',
      address: party.address || '',
      city: party.city || '',
      vat_number: party.vat_number || '',
    });
  };

  const handleSave = async (id: number) => {
    if (!editForm) return;
    try {
      await updateParty(id, editForm);
      setEditingId(null);
      setEditForm(null);
      loadParties();
    } catch (error) {
      console.error('Error updating party:', error);
      alert('Error updating client. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      await deleteParty(id);
      loadParties();
    } catch (error) {
      console.error('Error deleting party:', error);
      alert('Error deleting client. Please try again.');
    }
  };

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Clients</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact Person
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                City
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                VAT Number
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parties.map((party) => (
              <tr key={party.id}>
                {editingId === party.id ? (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={editForm?.company_name || ''}
                        onChange={(e) => setEditForm({ ...editForm!, company_name: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={editForm?.contact_person || ''}
                        onChange={(e) => setEditForm({ ...editForm!, contact_person: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={editForm?.address || ''}
                        onChange={(e) => setEditForm({ ...editForm!, address: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={editForm?.city || ''}
                        onChange={(e) => setEditForm({ ...editForm!, city: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={editForm?.vat_number || ''}
                        onChange={(e) => setEditForm({ ...editForm!, vat_number: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleSave(party.id)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditForm(null);
                        }}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {party.company_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {party.contact_person || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {party.address || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {party.city || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {party.vat_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(party)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(party.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {parties.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No clients yet. Add a client when creating an invoice.
          </div>
        )}
      </div>
    </div>
  );
}

