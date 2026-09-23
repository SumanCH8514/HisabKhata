import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { usePWAInstall } from '../utils/pwaUtils';

const DISMISS_KEY = 'hk_pwa_banner_dismissed_until';

const PWAInstallBanner = () => {
  const location = useLocation();
  const { canInstall, isInstalled, triggerInstall } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (location.pathname !== '/' || !canInstall || isInstalled) {
      setIsVisible(false);
      return;
    }

    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      setIsVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [location.pathname, canInstall, isInstalled]);

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      await triggerInstall();
    } finally {
      setInstalling(false);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(nextWeek));
  };

  if (location.pathname !== '/' || !isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[95] animate-in fade-in slide-in-from-bottom-3 duration-250 no-print">
      <div className="bg-slate-900/95 backdrop-blur-xl text-white pl-3.5 pr-2.5 py-2.5 rounded-2xl shadow-2xl border border-slate-700/70 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shrink-0 flex items-center justify-center bg-[#0057BB]">
          <img src="/icons/icon.svg" alt="HisabKhata" className="w-full h-full object-cover" />
        </div>

        <div className="pr-1">
          <div className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Install HisabKhata</div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            disabled={installing}
            className="px-3.5 py-1.5 bg-[#0057BB] hover:bg-[#004596] active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {installing ? 'Installing...' : 'Install'}
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss Install Prompt"
            className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
