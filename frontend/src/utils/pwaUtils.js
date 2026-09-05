import { useState, useEffect } from 'react';

// Global holder for install prompt event
let deferredInstallPrompt = null;
const installListeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installListeners.forEach((listener) => listener(deferredInstallPrompt));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener(null));
    console.log('[PWA] HisabKhata successfully installed on device');
  });
}

/**
 * Register Service Worker in production / supported browsers
 */
export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New content available; please refresh.');
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
};

/**
 * React hook to manage PWA installation state
 */
export const usePWAInstall = () => {
  const [canInstall, setCanInstall] = useState(Boolean(deferredInstallPrompt));
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      setCanInstall(false);
      return;
    }

    const handlePromptChange = (promptEvent) => {
      setCanInstall(Boolean(promptEvent));
    };

    installListeners.add(handlePromptChange);
    setCanInstall(Boolean(deferredInstallPrompt));

    return () => {
      installListeners.delete(handlePromptChange);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredInstallPrompt) return false;

    deferredInstallPrompt.prompt();
    const choiceResult = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    setCanInstall(false);
    return choiceResult.outcome === 'accepted';
  };

  return { canInstall, isInstalled, triggerInstall };
};

/**
 * React hook to monitor online/offline connectivity
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
