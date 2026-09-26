import React, { createContext, useContext, useEffect, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { api } from '../../lib/api';
import appletConfig from '../../../firebase-applet-config.json';

interface GoogleMapsContextValue {
  apiKey: string | null;
  isConfigured: boolean;
  isLoading: boolean;
  authError?: boolean;
  authErrorDetails?: string | null;
}

const isValidMapsKey = (key: string | null | undefined): boolean => {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length < 20) return false;
  const lower = trimmed.toLowerCase();
  if (lower.includes('your_') || lower.includes('placeholder') || lower.includes('replace')) {
    return false;
  }
  return true;
};

const envMapsKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
const fallbackConfigKey = (appletConfig as any)?.apiKey || '';
const initialResolvedKey = isValidMapsKey(envMapsKey)
  ? envMapsKey.trim()
  : isValidMapsKey(fallbackConfigKey)
  ? fallbackConfigKey.trim()
  : null;

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  apiKey: initialResolvedKey,
  isConfigured: Boolean(initialResolvedKey),
  isLoading: false,
  authError: false,
  authErrorDetails: null
});

export const useGoogleMapsConfig = () => useContext(GoogleMapsContext);
export const useGoogleMaps = () => useContext(GoogleMapsContext);

export const GoogleMapsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string | null>(initialResolvedKey);
  const [isLoading, setIsLoading] = useState<boolean>(!initialResolvedKey);

  useEffect(() => {
    let mounted = true;
    api
      .getMapsConfig()
      .then((res) => {
        if (!mounted) return;
        if (res.configured && isValidMapsKey(res.apiKey)) {
          setApiKey(res.apiKey!.trim());
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const isConfigured = isValidMapsKey(apiKey);

  return (
    <GoogleMapsContext.Provider value={{ apiKey, isConfigured, isLoading }}>
      {isConfigured && apiKey ? (
        <APIProvider apiKey={apiKey} libraries={['places', 'geometry', 'marker']}>
          {children}
        </APIProvider>
      ) : (
        children
      )}
    </GoogleMapsContext.Provider>
  );
};
