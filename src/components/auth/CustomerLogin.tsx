import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Smartphone
} from 'lucide-react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import {
  auth,
  clearActiveRecaptchaVerifier,
  initRecaptchaVerifier,
  formatFirebasePhoneError,
  normalizeIndianPhoneInput,
  isValidIndianMobileNumber
} from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

interface CustomerLoginProps {
  onSuccess: () => void;
  onBackToSelection: () => void;
}

export const CustomerLogin: React.FC<CustomerLoginProps> = ({ onSuccess, onBackToSelection }) => {
  const { syncFirebaseCustomer } = useAuth();

  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [useVisibleRecaptcha, setUseVisibleRecaptcha] = useState(false);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const isSendingOtpRef = useRef(false);
  const isVerifyingOtpRef = useRef(false);
  const isVerifiedSuccessRef = useRef(false);

  // Timer countdown for Resend OTP button
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'OTP' && countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  // Clean up RecaptchaVerifier properly on unmount
  useEffect(() => {
    return () => {
      resetRecaptcha();
    };
  }, []);

  const resetRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore
      }
      recaptchaVerifierRef.current = null;
    }
    clearActiveRecaptchaVerifier(recaptchaContainerRef.current || 'recaptcha-container-customer');
  };

  // Initialize or reset RecaptchaVerifier
  const setupRecaptcha = (visible = false): RecaptchaVerifier => {
    resetRecaptcha();
    const container =
      recaptchaContainerRef.current ||
      document.getElementById('recaptcha-container-customer') ||
      'recaptcha-container-customer';

    const verifier = initRecaptchaVerifier(container, {
      visible,
      onExpired: () => {
        setErrorMessage('Verification failed. Please try again.');
        resetRecaptcha();
      },
      onError: () => {
        setErrorMessage('Verification failed. Please try again.');
        resetRecaptcha();
      }
    });

    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  const cleanDigits = normalizeIndianPhoneInput(phone);
  const isPhoneValid = isValidIndianMobileNumber(cleanDigits);

  const formattedDisplayPhone =
    cleanDigits.length === 10
      ? `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`
      : `+91 ${cleanDigits}`;

  // STEP 1: Send SMS OTP strictly via Firebase Phone Authentication
  const handleSendOtp = async (
    e?: React.FormEvent,
    forceVisible = false,
    isResend = false
  ) => {
    if (e) e.preventDefault();
    if (isSendingOtpRef.current || isLoading) return;

    setErrorMessage('');
    setSuccessMessage('');

    if (!isPhoneValid) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    const e164Number = `+91${cleanDigits}`;
    isSendingOtpRef.current = true;
    setIsLoading(true);

    console.log('[OTP] Starting phone verification');

    try {
      const verifier = setupRecaptcha(forceVisible || useVisibleRecaptcha);
      const confirmation = await signInWithPhoneNumber(auth, e164Number, verifier);

      if (!confirmation || typeof confirmation.confirm !== 'function') {
        throw new Error('OTP could not be sent. Please try again.');
      }

      console.log('[OTP] Firebase SMS request successful');
      isVerifiedSuccessRef.current = false;
      setConfirmationResult(confirmation);
      setStep('OTP');
      setCountdown(30);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      setSuccessMessage(isResend ? 'OTP resent successfully' : '');

      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      const errorCode = err?.code || 'unknown';
      console.error(`[OTP] Firebase SMS request failed: ${errorCode}`);
      resetRecaptcha();
      setSuccessMessage('');

      const lowerCode = String(errorCode).toLowerCase();
      if (lowerCode.includes('captcha') || lowerCode.includes('internal-error')) {
        setUseVisibleRecaptcha(true);
      }
      setErrorMessage(formatFirebasePhoneError(err, 'SEND'));
    } finally {
      isSendingOtpRef.current = false;
      setIsLoading(false);
    }
  };

  // Resend OTP via Firebase Phone Authentication
  const handleResendOtp = async () => {
    if (!canResend || isLoading || isSendingOtpRef.current) return;
    await handleSendOtp(undefined, useVisibleRecaptcha, true);
  };

  // Change Mobile Number
  const handleChangeNumber = () => {
    setStep('PHONE');
    setErrorMessage('');
    setSuccessMessage('');
    setOtp(['', '', '', '', '', '']);
    setConfirmationResult(null);
    isVerifiedSuccessRef.current = false;
    resetRecaptcha();
  };

  // OTP Input Handling (6 Digits)
  const handleOtpChange = (index: number, value: string) => {
    setErrorMessage('');
    const digitsOnly = value.replace(/\D/g, '');

    if (digitsOnly.length > 1) {
      const chars = digitsOnly.slice(0, 6).split('');
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        if (index + i < 6 && chars[i] !== undefined) {
          newOtp[index + i] = chars[i];
        }
      }
      setOtp(newOtp);
      const nextIdx = Math.min(index + chars.length, 5);
      otpInputsRef.current[nextIdx]?.focus();
      if (newOtp.every((d) => d !== '')) {
        handleVerifyOtp(newOtp.join(''));
      }
      return;
    }

    const digit = digitsOnly.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto advance focus
    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits are filled
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

  // STEP 2: Verify 6-digit OTP code strictly using Firebase confirmationResult.confirm(otp)
  const handleVerifyOtp = async (codeToVerify?: string) => {
    if (isVerifyingOtpRef.current || isLoading || isVerifiedSuccessRef.current) return;

    const finalCode = (codeToVerify || otp.join('')).trim();
    if (finalCode.length !== 6 || !/^\d{6}$/.test(finalCode)) {
      setErrorMessage('Invalid OTP. Please check the OTP and try again.');
      return;
    }

    if (!confirmationResult) {
      console.error('[OTP] Verification failed: auth/code-expired');
      setErrorMessage('This OTP has expired. Please request a new OTP.');
      return;
    }

    isVerifyingOtpRef.current = true;
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const userCredential = await confirmationResult.confirm(finalCode);
      if (userCredential && userCredential.user) {
        console.log('[OTP] Verification successful');
        isVerifiedSuccessRef.current = true;
        resetRecaptcha();
        await syncFirebaseCustomer(userCredential.user);
        onSuccess();
      } else {
        console.error('[OTP] Verification failed: auth/invalid-verification-code');
        setErrorMessage('Invalid OTP. Please check the OTP and try again.');
      }
    } catch (err: any) {
      const errorCode = err?.code || 'unknown';
      console.error(`[OTP] Verification failed: ${errorCode}`);
      setErrorMessage(formatFirebasePhoneError(err, 'VERIFY'));
    } finally {
      isVerifyingOtpRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center py-10 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-[#14213D] selection:bg-[#F42F73] selection:text-white">
      {/* Background Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-72 bg-gradient-to-b from-[#FFF0F5]/80 to-transparent pointer-events-none" />

      {/* Header and Back Navigation */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6 relative z-10">
        <button
          type="button"
          onClick={() => {
            if (step === 'OTP') {
              handleChangeNumber();
            } else {
              resetRecaptcha();
              onBackToSelection();
            }
          }}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#14213D] transition-colors mb-4 cursor-pointer"
          id="btn-customer-login-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step === 'OTP' ? 'Change Mobile Number' : 'Back to Selection'}</span>
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F42F73] text-white shadow-lg shadow-[#F42F73]/25 mb-3">
            {step === 'PHONE' ? <Smartphone className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#14213D] tracking-tight">
            {step === 'PHONE' ? 'Customer Verification' : 'Enter OTP'}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-gray-500 max-w-xs mx-auto">
            {step === 'PHONE'
              ? 'Enter your Indian mobile number to receive a secure SMS OTP'
              : `OTP sent to ${formattedDisplayPhone}`}
          </p>

          {step === 'OTP' && (
            <div className="mt-2">
              <button
                type="button"
                onClick={handleChangeNumber}
                className="text-xs font-bold text-[#F42F73] hover:underline cursor-pointer"
                id="btn-change-number-link"
              >
                Change Mobile Number
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Login Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-7 sm:py-8 px-5 sm:px-10 shadow-xl shadow-black/5 rounded-3xl border border-gray-100 space-y-6">
          {/* Success Message Box (Only displayed after real Firebase SMS dispatch) */}
          {successMessage && !errorMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 font-medium"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span>{errorMessage}</span>
                {errorMessage.includes('Verification failed') && !useVisibleRecaptcha && (
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
            id="recaptcha-container-customer"
            ref={recaptchaContainerRef}
            className="flex justify-center my-2"
          />

          {step === 'PHONE' ? (
            /* STEP 1: Phone Number Input Form */
            <form onSubmit={(e) => handleSendOtp(e, useVisibleRecaptcha, false)} className="space-y-4">
              <div>
                <label
                  htmlFor="input-customer-phone"
                  className="block text-xs font-extrabold uppercase tracking-wider text-[#14213D] mb-1.5"
                >
                  Indian Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 font-bold text-sm">
                    +91
                  </div>
                  <input
                    id="input-customer-phone"
                    type="tel"
                    inputMode="numeric"
                    autoFocus
                    placeholder="98200 00000"
                    value={phone}
                    onChange={(e) => {
                      setErrorMessage('');
                      setSuccessMessage('');
                      setPhone(normalizeIndianPhoneInput(e.target.value));
                    }}
                    className="w-full pl-13 pr-4 py-3.5 border border-gray-200 rounded-2xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#F42F73] focus:border-transparent bg-gray-50/50 hover:bg-white focus:bg-white tracking-wider"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] text-gray-400">
                    We'll send a 6-digit SMS verification code. No password needed.
                  </p>
                  {phone && !isPhoneValid && (
                    <span className="text-[10px] text-rose-500 font-semibold">
                      Must be 10 digits
                    </span>
                  )}
                </div>
              </div>

              {/* Visible reCAPTCHA fallback toggle if needed */}
              {useVisibleRecaptcha && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                  <span>Please complete the security checkbox above.</span>
                </div>
              )}

              {/* Send OTP Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#F42F73] hover:bg-[#D81B60] disabled:opacity-50 text-white py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md shadow-[#F42F73]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                id="btn-customer-send-otp"
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
          ) : (
            /* STEP 2: 6-Digit OTP Verification Screen */
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#14213D] mb-3 text-center">
                  Enter 6-Digit Verification Code
                </label>

                {/* 6-Digit Input Boxes (Responsive for Mobile, Tablet, Desktop) */}
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
                <p className="text-center text-[11px] text-gray-400 mt-2">
                  Tip: You can paste the full 6-digit code directly
                </p>
              </div>

              {/* Verify OTP Button */}
              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={isLoading || otp.some((d) => !d)}
                className="w-full bg-[#14213D] hover:bg-black disabled:opacity-50 text-white py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                id="btn-customer-verify-otp"
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

              {/* Resend OTP with Countdown Timer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleChangeNumber}
                  className="text-xs font-semibold text-gray-500 hover:text-[#14213D] transition-colors cursor-pointer"
                  id="btn-change-mobile-number-footer"
                >
                  Change Mobile Number
                </button>

                <div>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={!canResend || isLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F42F73] hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline disabled:text-gray-400 disabled:cursor-not-allowed"
                    id="btn-customer-resend-otp"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{canResend ? 'Resend OTP' : `Resend OTP (${countdown}s)`}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Customer Privacy & Security Guarantee */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-500 font-medium text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Customer-only area • Powered by Firebase Phone Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
};
