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
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorDetails, setAuthErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    // Intercept Google Maps authentication failures and log diagnostics
    (window as any).gm_authFailure = () => {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const diagnosticMsg =
        `[DIBLO MAPS AUTH NOTIFICATION] Google Maps JavaScript API key is restricted or unauthorized for origin: ${currentOrigin}.\n` +
        `The app has automatically switched to OpenStreetMap / Leaflet to ensure uninterrupted service.\n` +
        `To use your Google Maps key directly in AI Studio, add "${currentOrigin}/*" to the authorized HTTP Referrers in Google Cloud Console.`;
      console.warn(diagnosticMsg);
      setAuthError('AUTH_FAILURE');
      setAuthErrorDetails(
        `Google Maps authorization failed for ${currentOrigin}. To authorize, add ${currentOrigin}/* to HTTP Referrers in Google Cloud Console.`
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
