import React, { createContext, useContext, useState, useEffect } from 'react';
import { APIProvider, APILoadingStatus } from '@vis.gl/react-google-maps';
import { api } from '../../lib/api';

interface GoogleMapsContextType {
  apiKey: string | null;
  isConfigured: boolean;
  isLoading: boolean;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  apiKey: null,
  isConfigured: false,
  isLoading: true
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    const envKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
    return envKey && typeof envKey === 'string' && envKey.trim().length > 0 ? envKey.trim() : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!apiKey);

  useEffect(() => {
    let isMounted = true;

    async function fetchKey() {
      if (apiKey) {
        setIsLoading(false);
        return;
      }

      try {
        const config = await api.getMapsConfig();
        if (isMounted) {
          if (config.apiKey && config.apiKey.trim().length > 0) {
            setApiKey(config.apiKey.trim());
          }
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchKey();

    return () => {
      isMounted = false;
    };
  }, []);

  const isConfigured = Boolean(apiKey && apiKey.length > 0);

  // If no API key is available yet, provide context with graceful fallback for components
  if (!isConfigured) {
    return (
      <GoogleMapsContext.Provider value={{ apiKey: null, isConfigured: false, isLoading }}>
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
      onError={(err) => {
        console.warn('[DIBLO MAPS] Maps API Provider notification');
      }}
    >
      <GoogleMapsContext.Provider value={{ apiKey, isConfigured: true, isLoading }}>
        {children}
      </GoogleMapsContext.Provider>
    </APIProvider>
  );
};
