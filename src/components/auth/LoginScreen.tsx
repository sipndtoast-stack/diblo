import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { UserRole } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';
import {
  Phone,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Loader2,
  RotateCcw,
  User,
  Briefcase,
  Shield
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { loginWithPhoneOtp, loginWithEmailPassword, loginDemoUser, isFirebaseLive } = useAuth();

  // Auth modes: 'PHONE' | 'EMAIL' | 'DEMO'
  const [activeTab, setActiveTab] = useState<'PHONE' | 'EMAIL' | 'DEMO'>('PHONE');

  // Phone OTP state
  const [phone, setPhone] = useState('9820123456');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [demoOtpCode, setDemoOtpCode] = useState('1234');
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // General state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // OTP input refs
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // OTP Countdown timer
  useEffect(() => {
    let interval: any;
    if (otpSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  // Handle Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.sendOtp(cleanPhone);
      if (res.success) {
        setOtpSent(true);
        setTimer(30);
        setCanResend(false);
        if (res.demoOtp) {
          setDemoOtpCode(res.demoOtp);
        }
        setSuccessMessage(`OTP sent to +91 ${cleanPhone.slice(-10)}`);
        setTimeout(() => {
          otpInputsRef.current[0]?.focus();
        }, 100);
      } else {
        setErrorMessage(res.error || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to deliver verification code. Please check your network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP digit change
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Pasting full code
      const pasted = value.replace(/\D/g, '').slice(0, 4).split('');
      const newOtp = [...otp];
      pasted.forEach((char, i) => {
        newOtp[i] = char;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(pasted.length, 3);
      otpInputsRef.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '');
    setOtp(newOtp);

    if (value && index < 3) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Quick fill demo OTP
  const handleUseDemoOtp = () => {
    const chars = demoOtpCode.split('').slice(0, 4);
    setOtp(chars);
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const fullOtp = otp.join('').trim();
    if (fullOtp.length < 4) {
      setErrorMessage('Please enter the 4-digit OTP code.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginWithPhoneOtp(phone, fullOtp, role, name.trim() || undefined);
      if (!result.success) {
        setErrorMessage(result.error || 'Invalid OTP code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification error.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email login/signup
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginWithEmailPassword(email, password, role, name.trim() || undefined, isSignUp);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to authenticate.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle 1-Click Demo Login
  const handleDemoSignIn = async (demoRole: UserRole) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await loginDemoUser(demoRole);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to sign in demo user.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="diblo-login-screen"
      className="min-h-screen bg-radial from-[#FFF5F8] via-[#FAFAFA] to-white flex flex-col justify-between py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-[#14213D]"
    >
      {/* Top Bar with PWA install and location badge */}
      <div className="max-w-xl mx-auto w-full flex items-center justify-between pb-6">
        <div className="flex items-center gap-2">
          <img
            src="/icon.svg"
            alt="Diblo Emblem"
            className="w-8 h-8 rounded-xl shadow-xs"
            referrerPolicy="no-referrer"
          />
          <span className="font-black text-lg tracking-tight text-[#14213D]">
            diblo<span className="text-[#F42F73]">.</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PWAInstallButton
            variant="pill"
            className="bg-white/80 border border-gray-200 text-[#14213D] shadow-xs text-xs font-bold"
          />
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-md mx-auto w-full bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-[#FFF0F5] text-[#F42F73] text-[11px] font-bold px-3 py-1 rounded-full border border-[#F42F73]/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mumbai's Verified Assistance Network</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#14213D] tracking-tight">
            Welcome to Diblo
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Login or create an account to book verified on-demand urban assistance
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 p-1 bg-gray-100/80 rounded-2xl gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('PHONE');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'PHONE'
                ? 'bg-white text-[#14213D] shadow-xs font-extrabold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5 text-[#F42F73]" />
            <span>Mobile OTP</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('EMAIL');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'EMAIL'
                ? 'bg-white text-[#14213D] shadow-xs font-extrabold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-[#F42F73]" />
            <span>Email</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('DEMO');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'DEMO'
                ? 'bg-[#14213D] text-white shadow-xs font-extrabold'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F42F73]" />
            <span>1-Click Demo</span>
          </button>
        </div>

        {/* Firebase Authentication Status Pill */}
        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-gray-500 bg-gray-50/80 rounded-xl border border-gray-100">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isFirebaseLive ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-amber-500 ring-2 ring-amber-200'
              }`}
            />
            <span>
              Auth Engine:{' '}
              <strong className="text-gray-700 font-semibold">
                {isFirebaseLive ? 'Firebase Cloud' : 'Developer Sandbox'}
              </strong>
            </span>
          </div>
          <span className="text-gray-400 font-mono text-[10px]">diblo-39440</span>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              {errorMessage.includes('[') && errorMessage.includes(']') ? (
                <div className="flex flex-col gap-1">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-red-100 border border-red-300 font-mono text-[10px] text-red-800 font-bold self-start">
                    {errorMessage.slice(errorMessage.indexOf('[') + 1, errorMessage.indexOf(']'))}
                  </span>
                  <span className="font-medium text-xs text-red-700">
                    {errorMessage.slice(errorMessage.indexOf(']') + 1).trim()}
                  </span>
                </div>
              ) : (
                <div className="font-medium">{errorMessage}</div>
              )}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* TAB 1: PHONE OTP FLOW */}
        {activeTab === 'PHONE' && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                {/* Mobile Number Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block">
                    Enter Mobile Number
                  </label>
                  <div className="flex items-center rounded-2xl border border-gray-200 focus-within:border-[#F42F73] focus-within:ring-2 focus-within:ring-[#F42F73]/20 bg-gray-50/50 overflow-hidden transition-all">
                    <span className="px-3.5 py-3 text-xs font-bold text-gray-600 bg-gray-100 border-r border-gray-200 select-none">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9820123456"
                      maxLength={10}
                      className="w-full px-3.5 py-3 text-sm font-semibold bg-transparent focus:outline-none text-[#14213D]"
                      required
                    />
                  </div>
                  <div className="text-[11px] text-gray-400">
                    We'll send a 4-digit verification code to this number.
                  </div>
                </div>

                {/* Optional Name (For New Users) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block">
                    Full Name <span className="text-gray-400 font-normal">(Optional if signing up)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aarav Mehta"
                    className="w-full px-3.5 py-3 text-sm rounded-2xl border border-gray-200 focus:border-[#F42F73] focus:ring-2 focus:ring-[#F42F73]/20 bg-gray-50/50 focus:outline-none transition-all"
                  />
                </div>

                {/* Role Choice */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block">
                    Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('CUSTOMER')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        role === 'CUSTOMER'
                          ? 'border-[#F42F73] bg-[#FFF0F5] text-[#F42F73]'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Customer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('ASSISTANT')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        role === 'ASSISTANT'
                          ? 'border-[#F42F73] bg-[#FFF0F5] text-[#F42F73]'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Assistant Partner</span>
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-[#F42F73] hover:bg-[#e02465] text-white rounded-2xl font-bold text-sm shadow-md shadow-[#F42F73]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Get OTP Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">
                    Code sent to <strong className="text-[#14213D]">+91 {phone}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp(['', '', '', '']);
                    }}
                    className="text-[#F42F73] font-bold hover:underline"
                  >
                    Change
                  </button>
                </div>

                {/* 4-digit OTP Inputs */}
                <div className="flex justify-center gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { otpInputsRef.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-13 h-14 text-center text-xl font-black bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-[#F42F73] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#F42F73]/10 transition-all text-[#14213D]"
                      required
                    />
                  ))}
                </div>

                {/* Demo Hint Banner */}
                <div className="bg-[#FFF0F5] border border-[#F42F73]/20 rounded-2xl p-3 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-gray-500 font-medium">Sandbox Mode OTP: </span>
                    <strong className="text-[#F42F73] font-black">{demoOtpCode}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseDemoOtp}
                    className="text-[11px] font-bold text-[#F42F73] bg-white px-2.5 py-1 rounded-xl shadow-xs border border-[#F42F73]/20 hover:bg-[#FFF0F5]"
                  >
                    Auto-Fill
                  </button>
                </div>

                {/* Resend OTP */}
                <div className="text-center text-xs text-gray-500">
                  {timer > 0 ? (
                    <span>Resend code in <strong className="text-[#14213D]">{timer}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={isLoading}
                      className="text-[#F42F73] font-bold hover:underline flex items-center gap-1 mx-auto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Resend OTP Code</span>
                    </button>
                  )}
                </div>

                {/* Verify Button */}
                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length < 4}
                  className="w-full py-3.5 px-4 bg-[#F42F73] hover:bg-[#e02465] text-white rounded-2xl font-bold text-sm shadow-md shadow-[#F42F73]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Session...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify & Enter Diblo</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: EMAIL & PASSWORD FLOW */}
        {activeTab === 'EMAIL' && (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aarav Mehta"
                    className="w-full pl-10 pr-3.5 py-3 text-sm rounded-2xl border border-gray-200 focus:border-[#F42F73] focus:ring-2 focus:ring-[#F42F73]/20 bg-gray-50/50 focus:outline-none transition-all"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-3 text-sm rounded-2xl border border-gray-200 focus:border-[#F42F73] focus:ring-2 focus:ring-[#F42F73]/20 bg-gray-50/50 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3.5 py-3 text-sm rounded-2xl border border-gray-200 focus:border-[#F42F73] focus:ring-2 focus:ring-[#F42F73]/20 bg-gray-50/50 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">Sign in as</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('CUSTOMER')}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                    role === 'CUSTOMER'
                      ? 'border-[#F42F73] bg-[#FFF0F5] text-[#F42F73]'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('ASSISTANT')}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                    role === 'ASSISTANT'
                      ? 'border-[#F42F73] bg-[#FFF0F5] text-[#F42F73]'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Assistant</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-[#F42F73] hover:bg-[#e02465] text-white rounded-2xl font-bold text-sm shadow-md shadow-[#F42F73]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Diblo Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-gray-600 hover:text-[#F42F73] font-semibold transition-colors"
              >
                {isSignUp ? 'Already have an account? Log In' : "Don't have an account yet? Sign Up"}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: 1-CLICK DEMO ACCESS (Evaluator friendly) */}
        {activeTab === 'DEMO' && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-[11px] text-blue-800 font-medium">
              💡 Instantly access pre-seeded Mumbai demo profiles without typing passwords.
            </div>

            {/* Customer Profile Card */}
            <button
              type="button"
              onClick={() => handleDemoSignIn('CUSTOMER')}
              disabled={isLoading}
              className="w-full p-3.5 rounded-2xl border border-gray-200 hover:border-[#F42F73] hover:bg-[#FFF0F5]/50 transition-all text-left flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80"
                  alt="Aarav"
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
                />
                <div>
                  <div className="text-xs font-bold text-[#14213D] group-hover:text-[#F42F73] transition-colors">
                    Aarav Mehta
                  </div>
                  <div className="text-[10px] text-gray-500">Customer • Bandra West • ₹350 Wallet</div>
                </div>
              </div>
              <span className="text-xs font-bold text-[#F42F73] bg-[#FFF0F5] px-2.5 py-1 rounded-xl">
                Open Home
              </span>
            </button>

            {/* Assistant Profile Card */}
            <button
              type="button"
              onClick={() => handleDemoSignIn('ASSISTANT')}
              disabled={isLoading}
              className="w-full p-3.5 rounded-2xl border border-gray-200 hover:border-[#F42F73] hover:bg-[#FFF0F5]/50 transition-all text-left flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80"
                  alt="Rajesh"
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
                />
                <div>
                  <div className="text-xs font-bold text-[#14213D] group-hover:text-[#F42F73] transition-colors">
                    Rajesh Sharma
                  </div>
                  <div className="text-[10px] text-gray-500">Assistant Partner • 4.9★ • Verified</div>
                </div>
              </div>
              <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-xl">
                Assistant Panel
              </span>
            </button>

            {/* Admin Profile Card */}
            <button
              type="button"
              onClick={() => handleDemoSignIn('ADMIN')}
              disabled={isLoading}
              className="w-full p-3.5 rounded-2xl border border-gray-200 hover:border-[#F42F73] hover:bg-[#FFF0F5]/50 transition-all text-left flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#14213D] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <Shield className="w-5 h-5 text-[#F42F73]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#14213D] group-hover:text-[#F42F73] transition-colors">
                    Kabir Varma
                  </div>
                  <div className="text-[10px] text-gray-500">Operations Admin • Mumbai Dispatch</div>
                </div>
              </div>
              <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-xl">
                Admin Console
              </span>
            </button>
          </div>
        )}

        {/* Security & Verification Badges */}
        <div className="pt-2 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
          <div className="space-y-0.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto" />
            <div className="text-[10px] font-bold text-gray-700">100% Verified</div>
            <div className="text-[9px] text-gray-400">Police Checked</div>
          </div>
          <div className="space-y-0.5">
            <Lock className="w-4 h-4 text-[#14213D] mx-auto" />
            <div className="text-[10px] font-bold text-gray-700">256-Bit SSL</div>
            <div className="text-[9px] text-gray-400">Encrypted Auth</div>
          </div>
          <div className="space-y-0.5">
            <CheckCircle2 className="w-4 h-4 text-[#F42F73] mx-auto" />
            <div className="text-[10px] font-bold text-gray-700">Razorpay</div>
            <div className="text-[9px] text-gray-400">Safe Escrow</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md mx-auto w-full text-center text-xs text-gray-400 pt-6">
        <span>© 2026 Diblo Technologies Pvt. Ltd. Mumbai, MH</span>
      </div>
    </div>
  );
};
