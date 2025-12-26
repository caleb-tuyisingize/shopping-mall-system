import React, { useState, useEffect } from 'react';
import { LoginForm, OTPVerify } from './components/LoginFlow';
import { useIdleLogout } from './hooks/useIdleLogout';
import Dashboard from './components/Dashboard';
import StockManagement from './components/StockManagement';
import { exportInventoryPDF } from './components/ReportExport';

const API = 'http://localhost/shopping-mall-system/kigali-mall/api/main.php';

export default function App() {
  const [step, setStep] = useState('login'); // login, otp, dashboard
  const [view, setView] = useState('dashboard'); // dashboard, stock-in, stock-out, adjustments, items, suppliers
  const [user, setUser] = useState(null);
  const [pendingUsername, setPendingUsername] = useState('');

  // Auto-logout after 10 minutes of inactivity
  useIdleLogout(() => {
    if (step === 'dashboard') {
      setUser(null);
      setStep('login');
      localStorage.clear();
    }
  }, step === 'dashboard');

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setStep('dashboard');
    localStorage.setItem('mall_token', userData.token);
  };

  const handleLogout = () => {
    setUser(null);
    setStep('login');
    localStorage.clear();
  };

  // Login screen
  if (step === 'login') {
    return (
      <LoginForm 
        onNext={(username) => {
          setPendingUsername(username);
          setStep('otp');
        }} 
      />
    );
  }

  // OTP verification screen
  if (step === 'otp') {
    return (
      <OTPVerify 
        username={pendingUsername}
        onVerify={handleLoginSuccess}
        onBack={() => setStep('login')}
      />
    );z
  }

  // Main dashboard
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-slate-900 text-white p-6 flex flex-col shadow-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-blue-400 italic mb-2">KIGALI MALL</h1>
          <p className="text-xs text-gray-400">Inventory Management System</p>
          {user && (
            <div className="mt-4 p-3 bg-slate-800 rounded-lg">
              <p className="text-sm font-bold">{user.full_name || user.username}</p>
              <p className="text-xs text-gray-400 capitalize">{user.role}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setView('dashboard')}
            className={`w-full text-left p-4 rounded-xl font-semibold transition-all ${
              view === 'dashboard'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            📊 Dashboard & Analytics
          </button>
          
          <button
            onClick={() => setView('items')}
            className={`w-full text-left p-4 rounded-xl font-semibold transition-all ${
              view === 'items'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            📦 Items Management
          </button>
          
          <button
            onClick={() => setView('stock-in')}
            className={`w-full text-left p-4 rounded-xl font-semibold transition-all ${
              view === 'stock-in'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            📥 Stock In (Receive)
          </button>
          
          <button
            onClick={() => setView('stock-out')}
            className={`w-full text-left p-4 rounded-xl font-semibold transition-all ${
              view === 'stock-out'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            📤 Stock Out (POS/EBM)
          </button>
          
          <button
            onClick={() => setView('adjustments')}
            className={`w-full text-left p-4 rounded-xl font-semibold transition-all ${
              view === 'adjustments'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            ⚠️ Stock Adjustments
          </button>
          
          <button
            onClick={() => setView('suppliers')}
            className={`w-full text-left p-4 rounded-xl font-semibold transition-all ${
              view === 'suppliers'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            🏢 Suppliers
          </button>
          
          <button
            onClick={() => setView('history')}
            className={`w-full text-left p-4 rounded-xl font-semibold transition-all ${
              view === 'history'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            📜 Transaction History
          </button>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full text-left p-4 rounded-xl font-semibold text-red-400 hover:bg-slate-800 transition-all"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {view === 'dashboard' && <Dashboard onExportPDF={exportInventoryPDF} />}
        {view !== 'dashboard' && (
          <StockManagement 
            view={view} 
            userId={user?.id}
            onExportPDF={exportInventoryPDF}
          />
        )}
      </main>
    </div>
  );
}
