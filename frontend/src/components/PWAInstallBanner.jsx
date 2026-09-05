import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../utils/pwaUtils';

const DISMISS_KEY = 'hk_pwa_banner_dismissed_until';

const PWAInstallBanner = () => {
  const { canInstall, isInstalled, triggerInstall } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!canInstall || isInstalled) {
      setIsVisible(false);
      return;
    }

    // Check if dismissed recently
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      setIsVisible(false);
      return;
    }

    // Small delay for non-intrusive appearance
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [canInstall, isInstalled]);

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
    // Suppress for 7 days
    const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(nextWeek));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-sm z-[95] animate-in fade-in slide-in-from-bottom-4 duration-300 no-print">
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center gap-3.5">
        {/* App Icon */}
        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 border border-white/20 shrink-0 flex items-center justify-center bg-[#0057BB]">
          <img src="/icons/icon.svg" alt="HisabKhata" className="w-full h-full object-cover" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-white tracking-tight leading-tight truncate">Install HisabKhata</h4>
          <p className="text-[11px] text-slate-300 font-medium leading-tight mt-0.5">
            Fast 1-tap ledger &amp; offline access
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            disabled={installing}
            className="px-3.5 py-2 bg-[#0057BB] hover:bg-[#004291] active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {installing ? 'Installing...' : 'Install'}
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss Install Prompt"
            className="w-8 h-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
