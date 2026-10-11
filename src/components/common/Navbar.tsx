/**
 * NAVBAR - Top App Bar for Warung Medan Finance
 * Warung Medan CT Catering
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { RefreshCw, Wifi, WifiOff, ShieldCheck, AlertCircle } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { syncStatus, pendingSyncCount, triggerSync, lowStockCount, setActiveTab, settings } = useApp();

  const getSyncBadge = () => {
    switch (syncStatus) {
      case 'SYNCED':
        return {
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Tersinkron',
          textColor: 'text-emerald-700'
        };
      case 'SYNCING':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />,
          label: 'Menyinkronkan...',
          textColor: 'text-amber-700'
        };
      case 'PENDING':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-600" />,
          label: `${pendingSyncCount} Tertunda`,
          textColor: 'text-amber-700'
        };
      case 'OFFLINE':
        return {
          icon: <WifiOff className="w-3.5 h-3.5 text-slate-500" />,
          label: 'Offline (Disimpan di HP)',
          textColor: 'text-slate-600'
        };
      case 'FAILED':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
          label: 'Gagal Sinkron',
          textColor: 'text-rose-700'
        };
    }
  };

  const badge = getSyncBadge();

  return (
    <header className="sticky top-0 z-40 bg-[#800020] text-white shadow-sm border-b border-[#660019]">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand Zone */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-300/30 flex items-center justify-center font-bold text-amber-300 text-sm tracking-tight">
            WM
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">
              Warung Medan Finance
            </h1>
            <p className="text-[11px] text-amber-200/80 mt-0.5 leading-none">
              CT Catering · Medan
            </p>
          </div>
        </div>

        {/* Right Action & Sync Status */}
        <div className="flex items-center gap-2">
          {/* Demo Mode Badge */}
          {settings?.isDemoMode && (
            <button
              onClick={() => setActiveTab('settings')}
              className="min-h-[38px] px-2 rounded-lg bg-amber-400 text-slate-900 text-[11px] font-bold flex items-center gap-1 shadow-xs hover:bg-amber-300"
              title="Aplikasi sedang dalam Mode Simulasi / Demo Data. Klik untuk mulai pembukuan nyata."
            >
              <span>DATA DEMO</span>
            </button>
          )}

          {/* Low Stock Indicator if any */}
          {lowStockCount > 0 && (
            <button
              onClick={() => setActiveTab('inventory')}
              className="min-h-[38px] px-2.5 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-medium flex items-center gap-1.5 transition-colors hover:bg-amber-500/30"
              title={`${lowStockCount} bahan di bawah stok minimum`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
              <span>{lowStockCount} Stok Menipis</span>
            </button>
          )}

          {/* Cloud Sync Button */}
          <button
            onClick={triggerSync}
            className="min-h-[38px] px-3 py-1 rounded-lg bg-black/20 hover:bg-black/30 border border-white/10 flex items-center gap-1.5 text-xs text-white/90 transition-all active:scale-95"
            title="Klik untuk sinkronkan data ke cloud"
          >
            {badge.icon}
            <span className="hidden sm:inline font-medium">{badge.label}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
