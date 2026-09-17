import React, { useState, useEffect, useRef } from 'react';
import { Phone, ArrowRight, ShieldCheck, RefreshCw, AlertCircle, CheckCircle2, Lock, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

interface CustomerLoginProps {
  onSuccess: () => void;
  onBackToSelection: () => void;
}

export const CustomerLogin: React.FC<CustomerLoginProps> = ({ onSuccess, onBackToSelection }) => {
  const { loginWithPhoneOtp } = useAuth();
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'OTP' && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    if (cleanPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.sendOtp(cleanPhone);
      if (res.success) {
        if (res.demoOtp) {
          setDemoOtp(res.demoOtp);
        }
        setStep('OTP');
        setCountdown(30);
        setCanResend(false);
        setOtp(['', '', '', '']);
        setTimeout(() => {
          otpInputsRef.current[0]?.focus();
        }, 150);
      } else {
        setErrorMessage(res.error || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto advance focus
    if (digit && index < 3) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto submit if all 4 filled
    if (digit && index === 3 && newOtp.every((d) => d !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (otpCode?: string) => {
    const finalOtp = otpCode || otp.join('');
    if (finalOtp.length !== 4) {
      setErrorMessage('Please enter the complete 4-digit OTP');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    try {
      if (loginWithPhoneOtp) {
        const res = await loginWithPhoneOtp(cleanPhone, finalOtp, 'CUSTOMER');
        if (res.success) {
          onSuccess();
          return;
        }
      }
      const verifyRes = await api.verifyOtp(cleanPhone, finalOtp, 'CUSTOMER');
      if (verifyRes.success) {
        onSuccess();
      } else {
        setErrorMessage(verifyRes.error || 'Invalid OTP code. Please check and retry.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-[#14213D] selection:bg-[#F42F73] selection:text-white">
      {/* Background Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-72 bg-gradient-to-b from-[#FFF0F5]/80 to-transparent pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-6">
        <button
          type="button"
          onClick={() => {
            if (step === 'OTP') {
              setStep('PHONE');
              setErrorMessage('');
            } else {
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
            <Phone className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#14213D] tracking-tight">
            Customer Verification
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            {step === 'PHONE'
              ? 'Enter your mobile number to receive a secure OTP'
              : `Enter the 4-digit code sent to +91 ${phone.slice(-10)}`}
          </p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-black/5 rounded-3xl border border-gray-100 sm:px-10 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#14213D] mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 font-bold text-sm">
                    +91
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoFocus
                    placeholder="9820000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full pl-13 pr-4 py-3.5 border border-gray-200 rounded-2xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#F42F73] focus:border-transparent bg-gray-50/50 hover:bg-white focus:bg-white tracking-wider"
                    id="input-customer-phone"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">
                  We'll send an OTP to verify your identity. No password needed.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || phone.replace(/\D/g, '').length !== 10}
                className="w-full bg-[#F42F73] hover:bg-[#D81B60] disabled:opacity-50 text-white py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md shadow-[#F42F73]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                id="btn-customer-send-otp"
              >
                {isLoading ? (
                  <span>Sending OTP...</span>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#14213D] mb-3 text-center">
                  Enter 4-Digit Code
                </label>

                <div className="flex justify-center gap-3">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputsRef.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-13 h-14 text-center font-black text-2xl border-2 border-gray-200 focus:border-[#F42F73] focus:ring-2 focus:ring-[#F42F73]/20 rounded-2xl outline-none transition-all bg-gray-50 focus:bg-white"
                      id={`input-customer-otp-${idx}`}
                    />
                  ))}
                </div>
              </div>

              {demoOtp && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                  <span>Demo OTP code: <strong className="font-mono text-sm">{demoOtp}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      const digits = demoOtp.split('').slice(0, 4);
                      setOtp(digits);
                      handleVerifyOtp(demoOtp);
                    }}
                    className="font-bold text-[#F42F73] underline hover:text-[#D81B60]"
                  >
                    Auto-fill
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={isLoading || otp.some((d) => !d)}
                className="w-full bg-[#14213D] hover:bg-black disabled:opacity-50 text-white py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                id="btn-customer-verify-otp"
              >
                {isLoading ? (
                  <span>Verifying...</span>
                ) : (
                  <>
                    <span>Verify & Enter Customer Panel</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                {canResend ? (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F42F73] hover:underline"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend OTP</span>
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">
                    Resend code in {countdown}s
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Customer Guarantee Note */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-500 font-medium text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Customer-only area. Strict privacy & zero spam guarantee.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
