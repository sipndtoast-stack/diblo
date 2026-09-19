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
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  apiKey: null,
  isConfigured: false,
  isLoading: false
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    const envKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
    return isValidGoogleMapsKey(envKey) ? envKey.trim() : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Intercept Google Maps auth failures cleanly so no uncaught errors crash the app
    (window as any).gm_authFailure = () => {
      console.warn('[DIBLO MAPS] Google Maps authentication failed or disabled. Operating in native OpenStreetMap / Leaflet mode.');
      setApiKey(null);
    };

    let isMounted = true;

    async function fetchKey() {
      if (apiKey && isValidGoogleMapsKey(apiKey)) {
        return;
      }

      try {
        const config = await api.getMapsConfig();
        if (isMounted) {
          if (config.configured && isValidGoogleMapsKey(config.apiKey)) {
            setApiKey(config.apiKey!.trim());
          } else {
            setApiKey(null);
          }
        }
      } catch {
        if (isMounted) {
          setApiKey(null);
        }
      }
    }

    fetchKey();

    return () => {
      isMounted = false;
    };
  }, []);

  const isConfigured = Boolean(apiKey && isValidGoogleMapsKey(apiKey));

  // If no valid API key is available or user opted out, provide context with graceful fallback
  if (!isConfigured) {
    return (
      <GoogleMapsContext.Provider value={{ apiKey: null, isConfigured: false, isLoading: false }}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  return (
    <APIProvider
      apiKey={apiKey!}
      libraries={['places', 'marker', 'geometry', 'routes']}
      onLoad={() => {
        // Loaded successfully
      }}
      onError={() => {
        console.warn('[DIBLO MAPS] Maps API Provider notification, falling back to Leaflet');
        setApiKey(null);
      }}
    >
      <GoogleMapsContext.Provider value={{ apiKey, isConfigured: true, isLoading: false }}>
        {children}
      </GoogleMapsContext.Provider>
    </APIProvider>
  );
};
