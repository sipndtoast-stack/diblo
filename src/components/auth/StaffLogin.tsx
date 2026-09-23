import React, { useState } from 'react';
import { Shield, Lock, Phone, AlertCircle, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface StaffLoginProps {
  onSuccess: (role: 'Assistant' | 'Admin') => void;
  onBackToSelection: () => void;
  onApplyAssistant?: () => void;
  initialMessage?: string;
}

/**
 * Diagnostic logging function in the StaffLogin component that wraps the fetch request to the Apps Script URL.
 * - Ensures the URL is correctly constructed using the STAFF_AUTH_APPS_SCRIPT_URL environment variable.
 * - Logs with console.error if this variable is missing or empty before making the call.
 * - Uses console.error to output the full Response object, request headers, and the target URL when the status is not 200.
 */
export const requestAppsScriptWithDiagnostics = async (
  payload?: any,
  customHeaders?: Record<string, string> | HeadersInit,
  init?: RequestInit
): Promise<Response | null> => {
  // Retrieve environment variable across Vite and process.env runtimes
  const rawEnvUrl =
    (typeof process !== 'undefined' && process.env && process.env.STAFF_AUTH_APPS_SCRIPT_URL) ||
    (import.meta as any).env?.STAFF_AUTH_APPS_SCRIPT_URL ||
    (import.meta as any).env?.VITE_STAFF_AUTH_APPS_SCRIPT_URL ||
    '';

  const appsScriptEnvVar = typeof rawEnvUrl === 'string' ? rawEnvUrl.trim() : '';

  // Log if this variable is missing or empty before making the call
  if (!appsScriptEnvVar) {
    console.error(
      '[StaffLogin Apps Script Diagnostic] STAFF_AUTH_APPS_SCRIPT_URL environment variable is missing or empty before making the call.'
    );
    return null;
  }

  // Ensure the URL is correctly constructed using the STAFF_AUTH_APPS_SCRIPT_URL environment variable
  let targetUrl = appsScriptEnvVar;
  try {
    let normalized = appsScriptEnvVar;
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = normalized.startsWith('//') ? `https:${normalized}` : `https://${normalized.replace(/^\/+/, '')}`;
    }
    const parsedUrl = new URL(normalized);
    targetUrl = parsedUrl.toString();
  } catch (urlConstructError) {
    console.error(
      '[StaffLogin Apps Script Diagnostic] Failed to construct target URL from STAFF_AUTH_APPS_SCRIPT_URL:',
      appsScriptEnvVar,
      urlConstructError
    );
    targetUrl = appsScriptEnvVar;
  }

  // Build and normalize request headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(customHeaders instanceof Headers
      ? Object.fromEntries(customHeaders.entries())
      : Array.isArray(customHeaders)
      ? Object.fromEntries(customHeaders)
      : (customHeaders as Record<string, string>) || {})
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const signal = init?.signal || controller.signal;

    const response = await fetch(targetUrl, {
      method: init?.method || (payload ? 'POST' : 'GET'),
      headers: requestHeaders,
      body: payload !== undefined
        ? (typeof payload === 'string' ? payload : JSON.stringify(payload))
        : undefined,
      redirect: 'follow',
      signal,
      ...init
    });

    clearTimeout(timeoutId);

    // Use console.error to output the full request object, response status, and headers when the status is not 200 or request fails
    if (!response.ok) {
      const responseHeadersObj: Record<string, string> = {};
      try {
        response.headers.forEach((val, key) => {
          responseHeadersObj[key] = val;
        });
      } catch (hErr) {
        // fallback
      }

      const requestDetails = {
        url: targetUrl,
        method: init?.method || (payload ? 'POST' : 'GET'),
        headers: requestHeaders,
        body: payload,
        mode: init?.mode,
        credentials: init?.credentials
      };

      console.error(
        '[StaffLogin Diagnostic] Fetch request failed with non-OK status:',
        {
          request: requestDetails,
          responseStatus: response.status,
          responseStatusText: response.statusText,
          responseHeaders: responseHeadersObj,
          response
        }
      );
      console.error('[StaffLogin Diagnostic] Full Request Object:', requestDetails);
      console.error('[StaffLogin Diagnostic] Response Status:', response.status, response.statusText);
      console.error('[StaffLogin Diagnostic] Response Headers:', responseHeadersObj);
    }

    return response;
  } catch (networkError: any) {
    const requestDetails = {
      url: targetUrl,
      method: init?.method || (payload ? 'POST' : 'GET'),
      headers: requestHeaders,
      body: payload,
      mode: init?.mode,
      credentials: init?.credentials
    };

    console.error(
      '[StaffLogin Diagnostic] Network exception occurred while executing fetch request:',
      {
        request: requestDetails,
        error: networkError
      }
    );
    console.error('[StaffLogin Diagnostic] Full Request Object:', requestDetails);
    console.error('[StaffLogin Diagnostic] Request Headers:', requestHeaders);
    console.error('[StaffLogin Diagnostic] Connection Error:', networkError);
    throw networkError;
  }
};

export const fetchAppsScriptWithDiagnostics = requestAppsScriptWithDiagnostics;

if (typeof window !== 'undefined') {
  (window as any).requestAppsScriptWithDiagnostics = requestAppsScriptWithDiagnostics;
  (window as any).fetchAppsScriptWithDiagnostics = fetchAppsScriptWithDiagnostics;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({
  onSuccess,
  onBackToSelection,
  onApplyAssistant,
  initialMessage
}) => {
  const { loginStaff, staffUser } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialMessage || '');
  const [diagnosticInfo, setDiagnosticInfo] = useState<{
    targetUrl?: string;
    status?: number;
    code?: string;
    message?: string;
    details?: string;
    timestamp?: string;
  } | null>(null);

  // If already authenticated as staff, allow 1-click redirect
  const handleExistingSessionRedirect = () => {
    if (staffUser && staffUser.authenticated) {
      onSuccess(staffUser.role);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setDiagnosticInfo(null);

    const cleanMobile = mobileNumber.trim();
    const cleanPass = password.trim();

    if (!cleanMobile || !cleanPass) {
      setErrorMessage('Mobile number or password is incorrect.');
      return;
    }

    setIsLoading(true);

    // Verify and log target URL format beforehand
    const envProj = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string)?.trim();
    const projectId = (envProj && envProj.length > 3 && !/^\d+$/.test(envProj)) ? envProj : 'diblo-39440';
    const customApiBase = (import.meta.env.VITE_API_URL as string)?.replace(/\/+$/, '');
    const primaryTargetUrl = customApiBase ? `${customApiBase}/api/staff/login` : '/api/staff/login';
    const cloudFunctionTargetUrl = `https://us-central1-${projectId}.cloudfunctions.net/api/staff/login`;

    // Validate URL formats (relative path or valid HTTP/HTTPS URL)
    const isValidUrlFormat = (url: string) => {
      if (url.startsWith('/')) return true;
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    };

    console.group('[StaffLogin Diagnostic] Form Submission Initiated');
    console.log('[StaffLogin Diagnostic] Target URL Format Verification:', {
      primaryTargetUrl,
      isPrimaryFormatValid: isValidUrlFormat(primaryTargetUrl),
      cloudFunctionTargetUrl,
      isCloudFunctionFormatValid: isValidUrlFormat(cloudFunctionTargetUrl),
      projectId,
      hasCustomApiBase: Boolean(customApiBase),
      timestamp: new Date().toISOString()
    });
    console.groupEnd();

    // Trigger diagnostic logging for Apps Script request wrapping
    requestAppsScriptWithDiagnostics({
      action: 'verifyStaff',
      mobileNumber: cleanMobile,
      password: cleanPass
    }).catch(() => {
      // All error logging is cleanly handled via console.error inside requestAppsScriptWithDiagnostics
    });

    try {
      const res = await loginStaff(cleanMobile, cleanPass);
      console.log('[StaffLogin Diagnostic] loginStaff response:', {
        success: res.success,
        role: res.role,
        code: res.code,
        message: res.message
      });

      if (res.success && res.role) {
        onSuccess(res.role);
      } else {
        const displayMsg = res.message || 'Mobile number or password is incorrect.';
        setErrorMessage(displayMsg);
        setDiagnosticInfo({
          targetUrl: primaryTargetUrl,
          code: res.code,
          message: displayMsg,
          timestamp: new Date().toLocaleTimeString()
        });

        // Log connection failure details to help pinpoint connection and verification issues
        if (res.code === 'NETWORK_ERROR' || res.code === 'SERVER_CONFIG_ERROR' || !res.success) {
          console.error('[StaffLogin Diagnostic] Authentication request returned failure:', {
            request: {
              url: primaryTargetUrl,
              fallbackUrl: cloudFunctionTargetUrl,
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: { mobile: cleanMobile, mobileNumber: cleanMobile, password: '***' }
            },
            responseStatus: res.code,
            responseMessage: res.message,
            code: res.code
          });
        }
      }
    } catch (err: any) {
      const fullRequestObject = {
        primaryTargetUrl,
        cloudFunctionTargetUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: {
          mobile: cleanMobile,
          mobileNumber: cleanMobile,
          password: '***'
        }
      };

      console.error('[StaffLogin Diagnostic] Connection Failure — Fetch request failed:', {
        request: fullRequestObject,
        responseStatus: err?.status ?? 'NETWORK_FAILURE',
        headers: err?.response?.headers || err?.headers || 'N/A (No HTTP response received)',
        errorName: err?.name,
        errorMessage: err?.message,
        stack: err?.stack,
        timestamp: new Date().toISOString()
      });
      console.error('[StaffLogin Diagnostic] Full Request Object:', fullRequestObject);
      console.error('[StaffLogin Diagnostic] Response Status:', err?.status ?? 'NETWORK_FAILURE');
      console.error('[StaffLogin Diagnostic] Response Headers:', err?.response?.headers || err?.headers || 'N/A');

      const failureMsg = 'Assistance login service is temporarily unavailable. Please try again.';
      setErrorMessage(failureMsg);
      setDiagnosticInfo({
        targetUrl: primaryTargetUrl,
        code: 'NETWORK_ERROR',
        message: failureMsg,
        details: err?.message || 'Network request failed or was aborted',
        timestamp: new Date().toLocaleTimeString()
      });
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
          <span>Back to Customer</span>
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#14213D] text-white shadow-lg mb-3">
            <Shield className="w-7 h-7 text-[#F42F73]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#14213D] tracking-tight">
            Assistance Login
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            For Diblo Field Assistants & Operations Admins
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

          {/* Error Message Box with Diagnostic Details */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-rose-800 font-medium">
                  {errorMessage}
                </div>
              </div>

              {diagnosticInfo && (
                <div className="mt-3 pt-2.5 border-t border-rose-200/60 text-[11px] text-rose-900 font-mono">
                  <div className="flex items-center justify-between text-rose-700 font-semibold mb-1">
                    <span>Network Diagnostic:</span>
                    <span>{diagnosticInfo.timestamp}</span>
                  </div>
                  <div className="bg-rose-100/70 p-2 rounded-lg space-y-0.5 break-all">
                    <div><span className="text-gray-500">Target URL:</span> {diagnosticInfo.targetUrl}</div>
                    {diagnosticInfo.code && <div><span className="text-gray-500">Error Code:</span> {diagnosticInfo.code}</div>}
                    {diagnosticInfo.details && <div><span className="text-gray-500">Details:</span> {diagnosticInfo.details}</div>}
                  </div>
                </div>
              )}
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
                  placeholder="Enter your password"
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
                  <span>Assistance Login</span>
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

          {/* New Assistant Join Callout */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 mb-2">Want to become a verified Diblo Assistant in Mumbai?</p>
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
              className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-[#F42F73] text-[#F42F73] hover:bg-[#FFF0F5] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              id="btn-apply-assistant"
            >
              <span>Apply as New Assistant (8-Step Onboarding)</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
