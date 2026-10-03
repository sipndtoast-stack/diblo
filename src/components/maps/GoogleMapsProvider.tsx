import React, { createContext, useContext, useEffect, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { api } from '../../lib/api';

interface GoogleMapsContextValue {
  apiKey: string | null;
  isConfigured: boolean;
  isLoading: boolean;
  authError?: boolean;
  authErrorDetails?: string | null;
}

const KNOWN_FIREBASE_ONLY_KEY = 'AIzaSyBZgAbbS7_cTo7ml3EkUf5yKxPiADy5k1U';

export const isValidMapsKey = (key: string | null | undefined): boolean => {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed === KNOWN_FIREBASE_ONLY_KEY) return false;
  if (trimmed === (import.meta.env.VITE_FIREBASE_API_KEY as string)?.trim()) return false;
  const lower = trimmed.toLowerCase();
  if (lower.includes('your_') || lower.includes('placeholder') || lower.includes('replace')) {
    return false;
  }
  return /^AIza[0-9A-Za-z_-]{33,45}$/.test(trimmed);
};

const FALLBACK_KEY = 'AIzaSyCb0Fq3FsC-C1mTfM7pugmioQO7fL6Z_MM';

export const getInitialMapsKey = (): string | null => {
  const envKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string)?.trim();
  if (isValidMapsKey(envKey)) return envKey;
  if (isValidMapsKey(FALLBACK_KEY)) return FALLBACK_KEY;
  return null;
};

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  apiKey: null,
  isConfigured: false,
  isLoading: true,
  authError: false,
  authErrorDetails: null
});

export const useGoogleMapsConfig = () => useContext(GoogleMapsContext);
export const useGoogleMaps = () => useContext(GoogleMapsContext);

export const GoogleMapsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string | null>(getInitialMapsKey);
  const [isLoading, setIsLoading] = useState<boolean>(!getInitialMapsKey());
  const [authError, setAuthError] = useState<boolean>(false);
  const [authErrorDetails, setAuthErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Listen for Google Maps JS SDK authentication / target blocked callback
    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      if (mounted) {
        setAuthError(true);
        setAuthErrorDetails('Google Maps API key target blocked or unauthorized');
      }
      if (typeof prevAuthFailure === 'function') {
        try {
          prevAuthFailure();
        } catch {
          // ignore
        }
      }
    };

    api
      .getMapsConfig()
      .then((res) => {
        if (!mounted) return;
        if (res.configured && isValidMapsKey(res.apiKey)) {
          setApiKey(res.apiKey!.trim());
          setAuthError(false);
        } else if (!apiKey) {
          const fallback = getInitialMapsKey();
          if (fallback) setApiKey(fallback);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (mounted) {
          if (!apiKey) {
            const fallback = getInitialMapsKey();
            if (fallback) setApiKey(fallback);
          }
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const isConfigured = isValidMapsKey(apiKey) && !authError;

  return (
    <GoogleMapsContext.Provider
      value={{
        apiKey,
        isConfigured,
        isLoading,
        authError,
        authErrorDetails
      }}
    >
      {isConfigured && apiKey ? (
        <APIProvider apiKey={apiKey} libraries={['places', 'geometry', 'marker', 'routes']}>
          {children}
        </APIProvider>
      ) : (
        children
      )}
    </GoogleMapsContext.Provider>
  );
};
