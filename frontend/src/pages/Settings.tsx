import { useState, useEffect } from 'react';
import { getConfig, updateConfig, getDriveStatus, type Config } from '../api';

export default function Settings() {
  const [config, setConfig] = useState<Config>({
    brand_name: 'YOUR BRAND NAME',
    legal_name: 'YOUR LEGAL NAME',
    vat_note: 'VAT not applicable, Art. 293 B of the French Tax Code',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [driveStatus, setDriveStatus] = useState<{ status: string; message: string } | null>(null);
  const [checkingDrive, setCheckingDrive] = useState(false);

  useEffect(() => {
    loadConfig();
    checkDrive();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await getConfig();
      setConfig(response.data);
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const checkDrive = async () => {
    setCheckingDrive(true);
    try {
      const response = await getDriveStatus();
      setDriveStatus(response.data);
    } catch (error) {
      setDriveStatus({ status: 'error', message: 'Could not connect to backend' });
    } finally {
      setCheckingDrive(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      await updateConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error updating config:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>

      {saved && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">Settings saved successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Google Drive Integration</h2>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Status</p>
                {checkingDrive ? (
                  <p className="text-gray-500 italic">Checking...</p>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-3 h-3 rounded-full ${driveStatus?.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <p className={driveStatus?.status === 'ok' ? 'text-green-700' : 'text-red-700'}>
                      {driveStatus?.message || 'Unknown status'}
                    </p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={checkDrive}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Refresh Status
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Note: If status is error, you may need to delete `credentials/token.pickle` and run the backend manually once to re-authenticate.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand Name
            </label>
            <input
              type="text"
              value={config.brand_name}
              onChange={(e) => setConfig({ ...config, brand_name: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Legal Name
            </label>
            <input
              type="text"
              value={config.legal_name}
              onChange={(e) => setConfig({ ...config, legal_name: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SIRET
            </label>
            <input
              type="text"
              value={config.siret || ''}
              onChange={(e) => setConfig({ ...config, siret: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="text"
              value={config.phone || ''}
              onChange={(e) => setConfig({ ...config, phone: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={config.email || ''}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              value={config.address || ''}
              onChange={(e) => setConfig({ ...config, address: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IBAN
            </label>
            <input
              type="text"
              value={config.iban || ''}
              onChange={(e) => setConfig({ ...config, iban: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              BIC
            </label>
            <input
              type="text"
              value={config.bic || ''}
              onChange={(e) => setConfig({ ...config, bic: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VAT Note
            </label>
            <textarea
              value={config.vat_note}
              onChange={(e) => setConfig({ ...config, vat_note: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={2}
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

