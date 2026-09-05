import React, { useState } from 'react';
import { Shield, Lock, Phone, AlertCircle, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface StaffLoginProps {
  onSuccess: (role: 'Assistant' | 'Admin') => void;
  onBackToSelection: () => void;
  initialMessage?: string;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({
  onSuccess,
  onBackToSelection,
  initialMessage
}) => {
  const { loginStaff, staffUser } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialMessage || '');

  // If already authenticated as staff, allow 1-click redirect
  const handleExistingSessionRedirect = () => {
    if (staffUser && staffUser.authenticated) {
      onSuccess(staffUser.role);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanMobile = mobileNumber.trim();
    const cleanPass = password.trim();

    if (!cleanMobile || !cleanPass) {
      setErrorMessage('Invalid mobile number or password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginStaff(cleanMobile, cleanPass);
      if (res.success && res.role) {
        onSuccess(res.role);
      } else {
        setErrorMessage(res.message || 'Invalid mobile number or password.');
      }
    } catch {
      setErrorMessage('Staff login service is temporarily unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (demoPhone: string, demoPass: string) => {
    setMobileNumber(demoPhone);
    setPassword(demoPass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Subtle Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-gradient-to-b from-[#14213D]/5 to-transparent pointer-events-none" />

      {/* Top Header Navigation */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-6">
        <button
          type="button"
          onClick={onBackToSelection}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#14213D] transition-colors group mb-4 cursor-pointer"
          id="btn-back-to-selection"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Access Selection</span>
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#14213D] text-white shadow-lg mb-3">
            <Shield className="w-7 h-7 text-[#F42F73]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#14213D] tracking-tight">
            Staff Login
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Internal access for Diblo Field Assistants & Operations Admins
          </p>
        </div>
      </div>

      {/* Login Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-black/5 rounded-3xl border border-gray-100 sm:px-10">
          {/* Active Session Notice if already logged in */}
          {staffUser && staffUser.authenticated && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-emerald-900">
                <p className="font-semibold text-sm">Active Session Found</p>
                <p className="text-emerald-700 mt-0.5">
                  Signed in as <strong>{staffUser.name}</strong> ({staffUser.role})
                </p>
                <button
                  type="button"
                  onClick={handleExistingSessionRedirect}
                  className="mt-2 text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
                >
                  Continue to {staffUser.role} Panel →
                </button>
              </div>
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-rose-800 font-medium">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Form: Mobile Number & Password */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="staff-mobile-input"
                className="block text-xs font-extrabold uppercase tracking-wider text-[#14213D] mb-1.5"
              >
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="staff-mobile-input"
                  name="mobileNumber"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  placeholder="Enter 10-digit mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F42F73] focus:border-transparent transition-all bg-gray-50/50 hover:bg-white focus:bg-white font-medium"
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                Registered employee phone in Staff Details sheet
              </p>
            </div>

            <div>
              <label
                htmlFor="staff-password-input"
                className="block text-xs font-extrabold uppercase tracking-wider text-[#14213D] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="staff-password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your staff password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F42F73] focus:border-transparent transition-all bg-gray-50/50 hover:bg-white focus:bg-white font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                id="btn-staff-login-submit"
                className="w-full bg-[#14213D] hover:bg-black text-white py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#F42F73]" />
                    <span>Verifying with Google Sheet...</span>
                  </>
                ) : (
                  <span>Login</span>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Helper */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 text-center">
              Demo Credentials (from Google Sheet)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemoCredentials('9876543210', '123456')}
                className="text-left p-2.5 rounded-xl border border-gray-200 bg-gray-50/80 hover:bg-gray-100 transition-colors text-xs"
              >
                <div className="font-bold text-[#14213D] flex items-center gap-1">
                  <span>Assistant</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
                    9876543210
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono mt-0.5">Pass: 123456</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoCredentials('9876543211', '123456')}
                className="text-left p-2.5 rounded-xl border border-gray-200 bg-gray-50/80 hover:bg-gray-100 transition-colors text-xs"
              >
                <div className="font-bold text-[#14213D] flex items-center gap-1">
                  <span>Admin</span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-mono">
                    9876543211
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono mt-0.5">Pass: 123456</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
