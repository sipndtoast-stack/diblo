import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Shield,
  Smartphone,
  Lock,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ChevronDown,
  Phone,
  ShieldCheck,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { connectGoogleWorkspace } from '../../lib/googleSheets';

interface UnifiedLoginProps {
  initialMode?: 'CUSTOMER' | 'STAFF';
  onCustomerSuccess: () => void;
  onStaffSuccess: (role: 'Assistant' | 'Admin') => void;
  onApplyAssistant?: () => void;
  onModeChange?: (mode: 'CUSTOMER' | 'STAFF') => void;
  onBackToCustomer?: () => void;
}

/**
 * Maps Firebase Auth error codes to helpful, user-friendly error messages
 */
function formatFirebasePhoneError(err: any): string {
  const code = (err?.code || '').toLowerCase();
  const msg = (err?.message || '').toLowerCase();

  if (code.includes('invalid-phone-number') || msg.includes('invalid-phone-number')) {
    return 'Please enter a valid 10-digit Indian mobile number (+91).';
  }
  if (code.includes('too-many-requests') || msg.includes('too-many-requests')) {
    return 'Too many attempts. Please wait a few minutes before requesting another OTP.';
  }
  if (code.includes('quota-exceeded') || msg.includes('quota-exceeded')) {
    return 'SMS quota exceeded for this project. If you are testing, please use Firebase test phone numbers.';
  }
  if (code.includes('captcha-check-failed') || msg.includes('captcha-check-failed')) {
    return 'Security verification (reCAPTCHA) failed. Please solve the security check to proceed.';
  }
  if (code.includes('captcha-expired') || msg.includes('captcha-expired')) {
    return 'reCAPTCHA verification expired. Please request a new OTP.';
  }
  if (code.includes('network-request-failed') || msg.includes('network-request-failed')) {
    return 'Network connection error. Please verify your internet connection and retry.';
  }
  if (code.includes('invalid-verification-code') || msg.includes('invalid-verification-code')) {
    return 'Invalid 6-digit verification code. Please check your SMS and enter the code again.';
  }
  if (code.includes('code-expired') || msg.includes('code-expired') || code.includes('session-expired')) {
    return 'The verification code has expired. Please tap "Resend OTP" to receive a fresh code.';
  }
  if (code.includes('app-not-authorized') || msg.includes('app-not-authorized')) {
    return 'Domain not authorized in Firebase Console. Please add this domain to Firebase Authentication > Settings > Authorized Domains.';
  }
  if (code.includes('operation-not-allowed') || msg.includes('operation-not-allowed')) {
    return 'Phone Sign-In is not enabled in Firebase Console. Please enable Phone provider under Firebase Authentication.';
  }
  return err?.message || 'Verification failed. Please try again.';
}

export const UnifiedLogin: React.FC<UnifiedLoginProps> = ({
  initialMode = 'CUSTOMER',
  onCustomerSuccess,
  onStaffSuccess,
  onApplyAssistant,
  onModeChange,
  onBackToCustomer
}) => {
  const { syncFirebaseCustomer, loginStaff, staffUser } = useAuth();

  // Active Mode: 'CUSTOMER' | 'STAFF'
  const [mode, setMode] = useState<'CUSTOMER' | 'STAFF'>(initialMode);

  // Sync mode if initialMode prop changes externally
  useEffect(() => {
    if (initialMode && initialMode !== mode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  const handleToggleMode = (newMode: 'CUSTOMER' | 'STAFF') => {
    setMode(newMode);
    setErrorMessage('');
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  // -------------------------------------------------------------
  // CUSTOMER STATE & FIREBASE PHONE AUTH LOGIC
  // -------------------------------------------------------------
  const [customerStep, setCustomerStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [customerPhone, setCustomerPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [useVisibleRecaptcha, setUseVisibleRecaptcha] = useState(false);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // -------------------------------------------------------------
  // STAFF STATE
  // -------------------------------------------------------------
  const [staffMobile, setStaffMobile] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  // General Loading & Error State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (customerStep === 'OTP' && countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [customerStep, countdown]);

  // Cleanup RecaptchaVerifier on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          console.warn('Recaptcha unmount cleanup notice:', e);
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  const setupRecaptcha = (visible = false) => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch (e) {
        console.warn('Recaptcha clear notice:', e);
      }
      recaptchaVerifierRef.current = null;
    }

    const container = recaptchaContainerRef.current || 'recaptcha-container';
    const verifier = new RecaptchaVerifier(auth, container, {
      size: visible ? 'normal' : 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        setErrorMessage('reCAPTCHA expired. Please tap "Resend OTP".');
        resetRecaptcha();
      }
    });

    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  const resetRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch (e) {
        // ignore
      }
      recaptchaVerifierRef.current = null;
    }
  };

  const cleanCustomerDigits = customerPhone.replace(/\D/g, '').slice(-10);
  const isCustomerPhoneValid =
    cleanCustomerDigits.length === 10 && /^[6-9]\d{9}$/.test(cleanCustomerDigits);

  const formattedDisplayPhone =
    cleanCustomerDigits.length === 10
      ? `+91 ${cleanCustomerDigits.slice(0, 5)} ${cleanCustomerDigits.slice(5)}`
      : `+91 ${cleanCustomerDigits}`;

  // Customer: Send SMS OTP via Firebase Phone Auth
  const handleSendOtp = async (e?: React.FormEvent, forceVisible = false) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!isCustomerPhoneValid) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    const e164Number = `+91${cleanCustomerDigits}`;
    setIsLoading(true);

    try {
      const verifier = setupRecaptcha(forceVisible || useVisibleRecaptcha);
      const confirmation = await signInWithPhoneNumber(auth, e164Number, verifier);

      setConfirmationResult(confirmation);
      setCustomerStep('OTP');
      setCountdown(30);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);

      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      console.error('Firebase signInWithPhoneNumber error:', err);
      resetRecaptcha();

      const code = (err?.code || '').toLowerCase();
      if (code.includes('captcha') || code.includes('internal-error')) {
        setUseVisibleRecaptcha(true);
      }
      setErrorMessage(formatFirebasePhoneError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Google Workspace Sign-in (Sheets & Drive Integration)
  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      const res = await connectGoogleWorkspace();
      if (res.success && res.user) {
        onCustomerSuccess();
      } else {
        setErrorMessage(res.error || 'Failed to sign in with Google.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Customer: Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || isLoading) return;
    setErrorMessage('');
    await handleSendOtp(undefined, useVisibleRecaptcha);
  };

  // Customer: Change Mobile Number
  const handleChangeNumber = () => {
    setCustomerStep('PHONE');
    setErrorMessage('');
    setOtp(['', '', '', '', '', '']);
    setConfirmationResult(null);
    resetRecaptcha();
  };

  // Customer: Handle OTP Input
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    if (digit && index === 5 && newOtp.every((d) => d !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = ['', '', '', '', '', ''];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || '';
      }
      setOtp(newOtp);
      const nextIdx = Math.min(pasted.length, 5);
      otpInputsRef.current[nextIdx]?.focus();
      if (pasted.length === 6) {
        handleVerifyOtp(pasted);
      }
    }
  };

  // Customer: Verify OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const finalCode = (codeToVerify || otp.join('')).trim();
    if (finalCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP code.');
      return;
    }

    if (!confirmationResult) {
      setErrorMessage('Verification session expired. Please request a new OTP.');
      setCustomerStep('PHONE');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const userCredential = await confirmationResult.confirm(finalCode);
      if (userCredential && userCredential.user) {
        await syncFirebaseCustomer(userCredential.user);
        onCustomerSuccess();
      } else {
        setErrorMessage('Verification failed. Please check the code and retry.');
      }
    } catch (err: any) {
      console.error('Firebase confirmationResult.confirm error:', err);
      setErrorMessage(formatFirebasePhoneError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Staff: Handle Submit
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanMobile = staffMobile.trim();
    const cleanPass = staffPassword.trim();

    if (!cleanMobile || !cleanPass) {
      setErrorMessage('Invalid mobile number or password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginStaff(cleanMobile, cleanPass);
      if (res.success && res.role) {
        onStaffSuccess(res.role);
      } else {
        setErrorMessage(res.message || 'Invalid mobile number or password.');
      }
    } catch {
      setErrorMessage('Assistance login service is temporarily unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (demoPhone: string, demoPass: string) => {
    setStaffMobile(demoPhone);
    setStaffPassword(demoPass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-[#FAF9FB] flex flex-col justify-between relative overflow-hidden font-sans text-[#14213D] selection:bg-[#F42F73] selection:text-white">
      {/* Background Ambient Radial Glows (Reference design style) */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#F42F73]/8 blur-3xl pointer-events-none" />
      <div className="absolute -top-20 -right-24 w-80 h-80 rounded-full bg-[#F42F73]/6 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#F42F73]/8 blur-3xl pointer-events-none" />

      {/* Mumbai Skyline Watermark Silhouette (Soft pink/mauve at bottom) */}
      <div className="absolute bottom-0 inset-x-0 w-full pointer-events-none select-none z-0 overflow-hidden h-40 sm:h-52 flex items-end opacity-20">
        <svg
          viewBox="0 0 1440 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto text-[#F42F73] preserve-3d"
        >
          {/* Sea Link on Left */}
          <path
            d="M 0 280 L 0 230 L 60 230 L 110 110 L 120 110 L 160 230 L 220 230 L 220 280 Z"
            fill="currentColor"
            opacity="0.6"
          />
          <line x1="115" y1="115" x2="30" y2="230" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          <line x1="115" y1="115" x2="60" y2="230" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          <line x1="115" y1="115" x2="90" y2="230" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          <line x1="115" y1="115" x2="140" y2="230" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          <line x1="115" y1="115" x2="180" y2="230" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          <line x1="115" y1="115" x2="210" y2="230" stroke="currentColor" strokeWidth="2" opacity="0.4" />

          {/* Central Mumbai Towers */}
          <path
            d="M 230 280 L 230 190 L 260 190 L 260 280 L 270 280 L 270 140 L 300 140 L 300 280 L 315 280 L 315 160 L 340 160 L 340 280 L 350 280 L 350 120 L 375 100 L 400 120 L 400 280 L 415 280 L 415 170 L 445 170 L 445 280 L 460 280 L 460 150 L 490 150 L 490 280 L 510 280 L 510 180 L 540 180 L 540 280 L 560 280 L 560 130 L 590 130 L 590 280 L 610 280 L 610 165 L 640 165 L 640 280 L 660 280 L 660 140 L 690 140 L 690 280 L 710 280 L 710 180 L 750 180 L 750 280 L 770 280 L 770 150 L 810 150 L 810 280 L 830 280 L 830 170 L 870 170 L 870 280 L 890 280 L 890 135 L 930 135 L 930 280 L 950 280 L 950 160 L 990 160 L 990 280 L 1010 280 L 1010 175 L 1050 175 L 1050 280 L 1080 280 L 1080 150 L 1120 150 L 1120 280 Z"
            fill="currentColor"
            opacity="0.45"
          />

          {/* Gateway of India on Right */}
          <path
            d="M 1200 280 L 1200 160 L 1230 160 L 1230 145 L 1250 125 L 1280 125 L 1300 145 L 1300 160 L 1330 160 L 1330 280 L 1300 280 L 1300 200 C 1300 180 1230 180 1230 200 L 1230 280 Z"
            fill="currentColor"
            opacity="0.65"
          />
          {/* Arch dome detail */}
          <path
            d="M 1250 125 C 1250 100 1280 100 1280 125 Z"
            fill="currentColor"
            opacity="0.8"
          />
          {/* Base waterline */}
          <rect x="0" y="274" width="1440" height="6" fill="currentColor" opacity="0.7" />
        </svg>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center relative z-10">
        {/* Top Header: Diblo Brand & Titles */}
        <div className="w-full text-center space-y-2.5 mb-7 sm:mb-8">
          {/* Diblo Logo with Heart on the 'i' */}
          <div className="flex items-center justify-center mb-1 select-none">
            <span className="text-4xl sm:text-5xl font-black text-[#F42F73] tracking-tight font-sans inline-flex items-center">
              D
              <span className="relative inline-block">
                ı
                {/* Heart dot over the i */}
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F42F73] fill-current absolute -top-1 sm:-top-1.5 left-1/2 -translate-x-1/2"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </span>
              blo
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#14213D] tracking-tight leading-tight">
            {mode === 'CUSTOMER' ? 'Customer' : 'Assistance Login'}
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-gray-500 max-w-md sm:max-w-lg mx-auto leading-relaxed">
            {mode === 'CUSTOMER'
              ? 'Book verified on-demand hourly assistants across Mumbai.'
              : 'Sign in to your Diblo Assistance Workspace.'}
          </p>
        </div>

        {/* ONE Unified Login Card */}
        <div className="w-full max-w-[460px] bg-white rounded-3xl sm:rounded-[32px] p-6 sm:p-8 shadow-xl shadow-pink-950/[0.04] border border-gray-100 relative z-20">
          {/* Back button for Assistance Login mode */}
          {mode === 'STAFF' && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => {
                  if (onBackToCustomer) {
                    onBackToCustomer();
                  } else {
                    handleToggleMode('CUSTOMER');
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#F42F73] transition-colors cursor-pointer group"
                id="btn-back-to-customer"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Back to Customer</span>
              </button>
            </div>
          )}

          {/* Error Message Notice */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 font-medium animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <span>{errorMessage}</span>
                {errorMessage.includes('reCAPTCHA') && !useVisibleRecaptcha && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setUseVisibleRecaptcha(true);
                        setErrorMessage('');
                      }}
                      className="font-bold underline text-rose-900 hover:text-rose-700 mt-1 cursor-pointer"
                    >
                      Show visible security verification
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Invisible / Visible reCAPTCHA Container */}
          <div
            id="recaptcha-container"
            ref={recaptchaContainerRef}
            className="flex justify-center my-2"
          />

          {/* Smooth Transition Container for Mode Content */}
          <AnimatePresence mode="wait">
            {mode === 'CUSTOMER' ? (
              /* ========================================================= */
              /* CUSTOMER MODE                                             */
              /* ========================================================= */
              <motion.div
                key="customer-mode"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                {customerStep === 'PHONE' ? (
                  <>
                    {/* Customer Icon Badge */}
                    <div className="text-center">
                      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#FFF0F5] border border-pink-100 flex items-center justify-center text-[#F42F73] mx-auto mb-2.5 shadow-xs">
                        <User className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight">
                        Customer Login
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
                        Enter your mobile number to receive an OTP and access your account.
                      </p>
                    </div>

                    {/* Mobile Number Input Form */}
                    <form onSubmit={(e) => handleSendOtp(e, useVisibleRecaptcha)} className="space-y-4">
                      <div>
                        {/* Rounded Input Container matching Reference Image */}
                        <div className="h-13 sm:h-14 rounded-2xl border border-gray-200 bg-white flex items-center px-4 hover:border-gray-300 focus-within:border-[#F42F73] focus-within:ring-2 focus-within:ring-[#F42F73]/15 transition-all">
                          {/* Smartphone Icon */}
                          <Smartphone className="w-5 h-5 text-gray-400 mr-2 shrink-0" />

                          {/* Country Code +91 with Chevron */}
                          <div className="flex items-center gap-1 shrink-0 select-none">
                            <span className="text-sm sm:text-base font-bold text-[#14213D]">+91</span>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          </div>

                          {/* Subtle Divider */}
                          <div className="h-5 w-px bg-gray-200 mx-3 shrink-0" />

                          {/* Input */}
                          <input
                            id="input-customer-phone"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            autoFocus
                            placeholder="Enter mobile number"
                            value={customerPhone}
                            onChange={(e) => {
                              setErrorMessage('');
                              setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                            }}
                            className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-[#14213D] placeholder-gray-400 outline-none w-full"
                          />
                        </div>
                        {customerPhone && !isCustomerPhoneValid && (
                          <p className="mt-1.5 text-[11px] text-rose-500 font-semibold text-left">
                            Please enter a valid 10-digit Indian mobile number
                          </p>
                        )}
                      </div>

                      {/* Visible reCAPTCHA notice if triggered */}
                      {useVisibleRecaptcha && (
                        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 text-center">
                          Please complete the security checkbox above.
                        </div>
                      )}

                      {/* Primary Pink Button: Send OTP → */}
                      <button
                        type="submit"
                        disabled={isLoading || !isCustomerPhoneValid}
                        id="btn-customer-send-otp"
                        className="w-full h-12 sm:h-13 bg-[#F42F73] hover:bg-[#E01E62] text-white rounded-2xl font-bold text-sm sm:text-base shadow-lg shadow-[#F42F73]/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Sending OTP via SMS...</span>
                          </>
                        ) : (
                          <>
                            <span>Send OTP</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>

                    {/* Official Sign in with Google button */}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        id="btn-customer-google-signin"
                        className="w-full h-12 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-2xl font-bold text-xs sm:text-sm shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99] disabled:opacity-50"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Sign in with Google</span>
                      </button>
                    </div>

                    {/* OR Divider Line */}
                    <div className="my-4 flex items-center before:flex-1 before:border-t before:border-gray-200 after:flex-1 after:border-t after:border-gray-200 text-[11px] font-bold tracking-widest text-gray-400 px-1 gap-3">
                      OR
                    </div>

                    {/* Assistant Login Option Button right below Google Sign-In */}
                    <button
                      type="button"
                      onClick={() => handleToggleMode('STAFF')}
                      id="btn-switch-to-assistant-login"
                      className="w-full h-12 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-[#14213D] rounded-2xl font-bold text-xs sm:text-sm shadow-xs hover:shadow-sm transition-all flex items-center justify-between px-4 cursor-pointer active:scale-[0.99] group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#14213D] group-hover:text-[#F42F73] transition-colors">
                          <Shield className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-gray-800 group-hover:text-[#14213D]">
                          Assistants Log In
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#F42F73] group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </>
                ) : (
                  /* CUSTOMER STEP 2: 6-DIGIT OTP VERIFICATION */
                  <div className="space-y-5">
                    <div className="text-center">
                      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#FFF0F5] border border-pink-100 flex items-center justify-center text-[#F42F73] mx-auto mb-2.5 shadow-xs">
                        <Lock className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight">
                        Enter OTP
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-xs mx-auto">
                        OTP sent to <strong className="text-[#14213D]">{formattedDisplayPhone}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={handleChangeNumber}
                        className="mt-1.5 text-xs font-bold text-[#F42F73] hover:underline cursor-pointer"
                        id="btn-change-number-link"
                      >
                        Change Mobile Number
                      </button>
                    </div>

                    {/* 6-Digit OTP Boxes */}
                    <div className="space-y-2">
                      <div className="flex justify-center gap-2 sm:gap-2.5">
                        {otp.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => {
                              otpInputsRef.current[idx] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            onPaste={handlePaste}
                            className="w-10 h-13 sm:w-12 sm:h-14 text-center font-black text-xl sm:text-2xl border-2 border-gray-200 focus:border-[#F42F73] focus:ring-2 focus:ring-[#F42F73]/20 rounded-xl sm:rounded-2xl outline-none transition-all bg-gray-50 focus:bg-white"
                            id={`input-customer-otp-${idx}`}
                            autoFocus={idx === 0}
                          />
                        ))}
                      </div>
                      <p className="text-center text-[11px] text-gray-400">
                        Tip: You can paste the full 6-digit code directly
                      </p>
                    </div>

                    {/* Verify OTP Button */}
                    <button
                      type="button"
                      onClick={() => handleVerifyOtp()}
                      disabled={isLoading || otp.some((d) => !d)}
                      id="btn-customer-verify-otp"
                      className="w-full h-12 sm:h-13 bg-[#F42F73] hover:bg-[#E01E62] disabled:opacity-50 text-white rounded-2xl font-bold text-sm sm:text-base shadow-lg shadow-[#F42F73]/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify OTP</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {/* Resend & Change Number Navigation */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={handleChangeNumber}
                        className="text-gray-500 hover:text-[#14213D] font-semibold cursor-pointer"
                      >
                        Change Number
                      </button>

                      {canResend ? (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 font-bold text-[#F42F73] hover:underline cursor-pointer disabled:opacity-50"
                          id="btn-customer-resend-otp"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Resend OTP</span>
                        </button>
                      ) : (
                        <span className="text-gray-400 font-medium">
                          Resend in {countdown}s
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              /* ========================================================= */
              /* STAFF MODE                                                */
              /* ========================================================= */
              <motion.div
                key="staff-mode"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                {/* Assistance Icon Badge */}
                <div className="text-center">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[#14213D] mx-auto mb-2.5 shadow-xs">
                    <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-[#14213D]" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight">
                    Assistance Login
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
                    Sign in to your Diblo Assistance Workspace.
                  </p>
                </div>

                {/* Active Session Notice if already authenticated as staff */}
                {staffUser && staffUser.authenticated && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">Active Session Found</p>
                      <p className="text-emerald-700 mt-0.5">
                        Signed in as <strong>{staffUser.name}</strong> ({staffUser.role})
                      </p>
                      <button
                        type="button"
                        onClick={() => onStaffSuccess(staffUser.role)}
                        className="mt-1.5 text-xs font-bold text-emerald-800 underline hover:text-emerald-950 block"
                      >
                        Continue to {staffUser.role} Panel →
                      </button>
                    </div>
                  </div>
                )}

                {/* Assistance Login Form */}
                <form onSubmit={handleStaffSubmit} className="space-y-4">
                  {/* Mobile Number Input */}
                  <div>
                    <label
                      htmlFor="staff-mobile-input"
                      className="block text-xs font-bold text-gray-700 mb-1.5 text-left"
                    >
                      Mobile Number
                    </label>
                    <div className="h-12 sm:h-13 rounded-2xl border border-gray-200 bg-white flex items-center px-4 hover:border-gray-300 focus-within:border-[#F42F73] focus-within:ring-2 focus-within:ring-[#F42F73]/15 transition-all">
                      <Phone className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
                      <input
                        id="staff-mobile-input"
                        name="mobileNumber"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        placeholder="Enter mobile number"
                        value={staffMobile}
                        onChange={(e) => setStaffMobile(e.target.value)}
                        className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-[#14213D] placeholder-gray-400 outline-none w-full"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label
                      htmlFor="staff-password-input"
                      className="block text-xs font-bold text-gray-700 mb-1.5 text-left"
                    >
                      Password
                    </label>
                    <div className="h-12 sm:h-13 rounded-2xl border border-gray-200 bg-white flex items-center px-4 hover:border-gray-300 focus-within:border-[#F42F73] focus-within:ring-2 focus-within:ring-[#F42F73]/15 transition-all">
                      <Lock className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
                      <input
                        id="staff-password-input"
                        name="password"
                        type={showStaffPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        placeholder="Enter password"
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-[#14213D] placeholder-gray-400 outline-none w-full"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStaffPassword(!showStaffPassword)}
                        className="text-gray-400 hover:text-gray-600 transition-colors ml-2 cursor-pointer p-1"
                        aria-label={showStaffPassword ? 'Hide password' : 'Show password'}
                      >
                        {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button: Assistance Login → */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    id="btn-staff-login-submit"
                    className="w-full h-12 sm:h-13 bg-[#F42F73] hover:bg-[#E01E62] text-white rounded-2xl font-bold text-sm sm:text-base shadow-lg shadow-[#F42F73]/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Assistance Login</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Demo Credentials Quick-Fill Helper */}
                <div className="pt-2">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
                    Demo Credentials (from Google Sheet)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => fillDemoCredentials('9876543210', '123456')}
                      className="text-left p-2.5 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-gray-100/90 transition-colors text-xs cursor-pointer"
                    >
                      <div className="font-bold text-[#14213D] flex items-center justify-between">
                        <span>Assistant</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                          9876543210
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">Pass: 123456</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => fillDemoCredentials('9876543211', '123456')}
                      className="text-left p-2.5 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-gray-100/90 transition-colors text-xs cursor-pointer"
                    >
                      <div className="font-bold text-[#14213D] flex items-center justify-between">
                        <span>Admin</span>
                        <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-mono font-bold">
                          9876543211
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">Pass: 123456</div>
                    </button>
                  </div>
                </div>

                {/* Apply as Assistant Link */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (onApplyAssistant) {
                        onApplyAssistant();
                      } else if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/apply-assistant');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }
                    }}
                    className="text-xs font-bold text-[#F42F73] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    id="btn-apply-assistant-link"
                  >
                    <span>Apply to become a Diblo Assistant</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* OR Divider Line */}
                <div className="my-5 flex items-center before:flex-1 before:border-t before:border-gray-200 after:flex-1 after:border-t after:border-gray-200 text-[11px] font-bold tracking-widest text-gray-400 px-1 gap-3">
                  OR
                </div>

                {/* Secondary Customer Login Shortcut Card */}
                <div
                  onClick={() => {
                    if (onBackToCustomer) {
                      onBackToCustomer();
                    } else {
                      handleToggleMode('CUSTOMER');
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (onBackToCustomer) {
                        onBackToCustomer();
                      } else {
                        handleToggleMode('CUSTOMER');
                      }
                    }
                  }}
                  id="card-switch-to-customer"
                  className="bg-[#FFF8FA] hover:bg-[#FFF0F5] border border-pink-100 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-pink-100 flex items-center justify-center text-[#F42F73] shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                      <User className="w-5 h-5 text-[#F42F73]" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm text-[#14213D] group-hover:text-[#F42F73] transition-colors">
                        Customer
                      </div>
                      <div className="text-xs text-gray-500">
                        Book verified on-demand hourly assistants
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#F42F73] group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Subtle Bottom Footer with Obscured Assistance Login link for employees */}
      <footer className="w-full py-4 px-4 text-center text-xs text-gray-400 relative z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <p>© {new Date().getFullYear()} Diblo Technologies Pvt. Ltd. • Mumbai's On-Demand Assistance</p>
        <span className="text-gray-300 select-none">•</span>
        <a
          href="/assistance-login"
          onClick={(e) => {
            e.preventDefault();
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/assistance-login');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          }}
          className="text-gray-400/80 hover:text-gray-600 text-[11px] font-normal transition-colors cursor-pointer"
          title="Diblo Internal Workspace"
          id="link-obscured-assistance-portal"
        >
          Assistance Login
        </a>
      </footer>
    </div>
  );
};
