import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import InvoiceForm from './pages/InvoiceForm';
import PartyList from './pages/PartyList';
import InvoiceHistory from './pages/InvoiceHistory';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold">
                  Invoice Generator
                </Link>
              </div>
              <div className="flex space-x-4">
                <Link
                  to="/"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
                >
                  New Invoice
                </Link>
                <Link
                  to="/parties"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
                >
                  Clients
                </Link>
                <Link
                  to="/history"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
                >
                  History
                </Link>
                <Link
                  to="/settings"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
                >
                  Settings
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<InvoiceForm />} />
            <Route path="/parties" element={<PartyList />} />
            <Route path="/history" element={<InvoiceHistory />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
