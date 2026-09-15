import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Service Worker handling
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // In development mode, clean up any active service workers and clear caches
    // to prevent caching of outdated Vite modules and duplicate React singletons
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
  } else {
    // Only register service worker in production builds
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[Diblo PWA] Service Worker active with scope:', registration.scope);
        })
        .catch((error) => {
          console.warn('[Diblo PWA] Service Worker registration notice:', error);
        });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
