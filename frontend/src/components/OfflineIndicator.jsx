import React from 'react';
import { useNetworkStatus } from '../utils/pwaUtils';

const OfflineIndicator = () => {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 md:top-4 inset-x-4 max-w-sm mx-auto z-[120] animate-in fade-in slide-in-from-top-3 duration-200 no-print">
      <div className="bg-amber-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs font-bold border border-amber-500">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] animate-pulse">wifi_off</span>
          <span>You are currently offline</span>
        </div>
        <span className="text-[10px] bg-amber-700/80 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
          Cached Mode
        </span>
      </div>
    </div>
  );
};

export default OfflineIndicator;
