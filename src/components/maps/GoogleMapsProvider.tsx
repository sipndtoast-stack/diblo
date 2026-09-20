import React, { createContext, useContext, useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { api } from '../../lib/api';

export function isValidGoogleMapsKey(key: string | null | undefined): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  // Valid Google Maps API keys are at least 25 characters and start with AIza
  return trimmed.startsWith('AIza') && trimmed.length >= 25;
}

interface GoogleMapsContextType {
  apiKey: string | null;
  isConfigured: boolean;
  isLoading: boolean;
  authError: string | null;
  authErrorDetails: string | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  apiKey: null,
  isConfigured: false,
  isLoading: false,
  authError: null,
  authErrorDetails: null
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    const envKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
    if (isValidGoogleMapsKey(envKey)) return envKey.trim();
    return 'AIzaSyCb0Fq3FsC-C1mTfM7pugmioQO7fL6Z_MM';
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorDetails, setAuthErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    // Intercept Google Maps authentication failures and log diagnostics
    (window as any).gm_authFailure = () => {
      const diagnosticMsg =
        '[DIBLO MAPS AUTH FAILURE] Google Maps JavaScript API authentication failed.\n' +
        'Please check Google Cloud Console:\n' +
        '1. HTTP Referrers: Ensure "https://diblo-39440.web.app/*" and "http://localhost:5173/*" are allowed.\n' +
        '2. API Restrictions: Ensure Maps JavaScript API, Places API, Geocoding API, and Routes API are enabled.\n' +
        '3. Billing: Ensure a billing account is linked to the Google Cloud project.';
      console.warn(diagnosticMsg);
      setAuthError('AUTH_FAILURE');
      setAuthErrorDetails(
        'Google Maps authentication failed. Expected referrers: https://diblo-39440.web.app/*, http://localhost:5173/*'
      );
    };

    let isMounted = true;

    async function fetchKey() {
      if (apiKey && isValidGoogleMapsKey(apiKey)) {
        return;
      }

      try {
        setIsLoading(true);
        const config = await api.getMapsConfig();
        if (isMounted) {
          if (config.configured && isValidGoogleMapsKey(config.apiKey)) {
            setApiKey(config.apiKey!.trim());
          }
        }
      } catch {
        // keep fallback key
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchKey();

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  const isConfigured = Boolean(apiKey && isValidGoogleMapsKey(apiKey));

  const contextValue: GoogleMapsContextType = {
    apiKey,
    isConfigured,
    isLoading,
    authError,
    authErrorDetails
  };

  if (!isConfigured) {
    return (
      <GoogleMapsContext.Provider value={contextValue}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  return (
    <APIProvider
      apiKey={apiKey!}
      libraries={['places', 'marker', 'geometry', 'routes']}
      onError={(err) => {
        console.warn('[DIBLO MAPS] Maps API Provider load notification:', err);
        setAuthError('LOAD_ERROR');
        setAuthErrorDetails(
          'Failed to load Google Maps script. Please check your network and Google Cloud API restrictions.'
        );
      }}
    >
      <GoogleMapsContext.Provider value={contextValue}>
        {children}
      </GoogleMapsContext.Provider>
    </APIProvider>
  );
};
