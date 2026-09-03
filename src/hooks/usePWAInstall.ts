import { useEffect, useState, useCallback, useRef } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISSAL_STORAGE_KEY = 'diblo_pwa_install_dismissed_at';
const DISMISSAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  // Keep a ref to the deferred prompt to prevent stale closures
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Check if dismissal is still valid in localStorage
  const checkIsDismissed = useCallback((): boolean => {
    try {
      const dismissedAt = localStorage.getItem(DISMISSAL_STORAGE_KEY);
      if (!dismissedAt) return false;
      const timestamp = parseInt(dismissedAt, 10);
      if (isNaN(timestamp)) return false;
      return Date.now() - timestamp < DISMISSAL_DURATION_MS;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    // 1. Detect standalone mode (already installed & running as PWA)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const checkStandalone = () => {
      const standalone =
        mediaQuery.matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(standalone);
      setIsInstalled(standalone);
      return standalone;
    };

    const isAppStandalone = checkStandalone();
    mediaQuery.addEventListener?.('change', checkStandalone);

    // 2. Detect iOS device (iPhone, iPad, iPod)
    const userAgent = window.navigator.userAgent || '';
    const isIOSDevice =
      /iphone|ipad|ipod/i.test(userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // 3. Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser's default mini-infobar or ambient badge
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = promptEvent;
      setDeferredPrompt(promptEvent);

      // If not running in standalone and not recently dismissed, schedule popup
      if (!isAppStandalone && !checkIsDismissed()) {
        setTimeout(() => {
          setShowPopup(true);
        }, 1500); // 1.5 seconds delay after load
      }
    };

    // 4. Handle appinstalled event
    const handleAppInstalled = () => {
      console.log('[Diblo PWA] App installed successfully');
      setIsInstalled(true);
      setIsStandalone(true);
      setDeferredPrompt(null);
      deferredPromptRef.current = null;
      setShowPopup(false);
      try {
        localStorage.removeItem(DISMISSAL_STORAGE_KEY);
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. For iOS Safari or browsers where beforeinstallprompt doesn't fire:
    // If on iOS and not standalone and not dismissed, show popup after delay with iOS instructions
    if (!isAppStandalone && isIOSDevice && !checkIsDismissed()) {
      const iosTimer = setTimeout(() => {
        setShowPopup(true);
      }, 1800);
      return () => {
        clearTimeout(iosTimer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
        mediaQuery.removeEventListener?.('change', checkStandalone);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener?.('change', checkStandalone);
    };
  }, [checkIsDismissed]);

  // Install handler called when user clicks "Install"
  const install = useCallback(async (): Promise<boolean> => {
    const promptEvent = deferredPromptRef.current || deferredPrompt;
    if (!promptEvent) {
      return false;
    }

    try {
      setIsInstalling(true);
      // Trigger the browser native installation prompt
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;

      if (choice.outcome === 'accepted') {
        console.log('[Diblo PWA] User accepted installation prompt');
        setIsInstalled(true);
        setShowPopup(false);
        setDeferredPrompt(null);
        deferredPromptRef.current = null;
        return true;
      } else {
        console.log('[Diblo PWA] User dismissed installation prompt');
        // Do not break anything, cleanly close popup
        setShowPopup(false);
        try {
          localStorage.setItem(DISMISSAL_STORAGE_KEY, Date.now().toString());
        } catch {}
        return false;
      }
    } catch (err) {
      console.error('[Diblo PWA] Error during prompt execution:', err);
      setShowPopup(false);
      return false;
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt]);

  // Dismiss handler called when user clicks "Not Now" or closes the popup
  const dismiss = useCallback(() => {
    setShowPopup(false);
    try {
      localStorage.setItem(DISMISSAL_STORAGE_KEY, Date.now().toString());
    } catch {}
  }, []);

  // Open popup manually (e.g. from app settings, header, or footer install button)
  const openPopup = useCallback(() => {
    setShowPopup(true);
  }, []);

  const closePopup = useCallback(() => {
    setShowPopup(false);
  }, []);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isStandalone,
    isIOS,
    showPopup,
    isInstalling,
    install,
    dismiss,
    openPopup,
    closePopup,
  };
}
