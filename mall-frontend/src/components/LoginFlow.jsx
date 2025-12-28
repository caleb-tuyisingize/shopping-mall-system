import React, { useState, useEffect } from 'react';

const API = 'http://localhost/shopping-mall-system/kigali-mall/api/main.php';

export const LoginForm = ({ onNext }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.status === 'otp_sent') {
        // 1. Show the success message (e.g., "OTP sent to your email...")
        alert(data.message);

        // 2. DEBUG MODE: Only show the code on screen if email failed or no email exists
        if (data.debug_otp) {
          alert(`⚠️ DEBUG MODE: Your Login Code is ${data.debug_otp}`);
        }

        // 3. Save username for the verification step
        localStorage.setItem('pending_user', username);
        
        // 4. Move to the next screen (Enter OTP)
        onNext(username);
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Connection error. Please ensure XAMPP Apache is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 px-4">
      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md border-t-8 border-blue-600">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 mb-2">KIGALI MALL</h1>
          <p className="text-gray-500 text-sm">Inventory Management System</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
            <input
              type="text"
              placeholder="Enter username"
              required
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter password"
              required
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]'
            }`}
          >
            {loading ? 'Verifying...' : 'Continue to OTP →'}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Default: admin / admin123
        </p>
      </form>
    </div>
  );
};

export const OTPVerify = ({ username, onVerify, onBack }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}?action=verify_otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, otp })
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        onVerify(data.user);
      } else {
        setError(data.error || 'Invalid or expired OTP code');
        setOtp('');
      }
    } catch (err) {
      setError('Verification error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendCountdown(60);
    // Re-request OTP (you'd call login again)
    alert('Please log in again to receive a new OTP');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 px-4">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md border-t-8 border-emerald-500">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 mb-2">Security Verification</h2>
          <p className="text-gray-500 text-sm">Enter the 6-digit code sent to your device</p>
          <p className="text-xs text-gray-400 mt-2">User: <span className="font-bold">{username}</span></p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div className="mb-6">
            <input
              type="text"
              maxLength="6"
              placeholder="000000"
              required
              className="w-full p-4 border-4 border-blue-100 rounded-xl text-center text-4xl font-mono tracking-[0.5em] focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none transition"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setOtp(value);
                setError('');
              }}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
              loading || otp.length !== 6
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg active:scale-[0.98]'
            }`}
          >
            {loading ? 'Verifying...' : '✓ Verify & Enter Dashboard'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {resendCountdown > 0 ? (
            <p className="text-xs text-gray-400">
              Resend code in {resendCountdown}s
            </p>
          ) : (
            <button
              onClick={handleResend}
              className="text-xs text-blue-600 hover:underline"
            >
              Resend OTP Code
            </button>
          )}
          <button
            onClick={onBack}
            className="block w-full text-xs text-gray-500 hover:text-gray-700 mt-4"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};
