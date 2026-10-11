/**
 * BOTTOM NAV - Fixed Thumb Navigation for Android & Mobile
 * Warung Medan Finance
 */

import React from 'react';
import { useApp, type ActiveTab } from '../../context/AppContext';
import { LayoutDashboard, ArrowLeftRight, Package, FileSpreadsheet, Settings } from 'lucide-react';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transaksi', icon: ArrowLeftRight },
  { id: 'inventory', label: 'Stok', icon: Package },
  { id: 'reports', label: 'Laporan', icon: FileSpreadsheet },
  { id: 'settings', label: 'Pengaturan', icon: Settings }
];

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] no-print">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-16 pb-safe">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-all ${
                isActive ? 'text-[#800020] font-semibold' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <div
                className={`relative flex items-center justify-center p-1 rounded-xl transition-all ${
                  isActive ? 'bg-[#800020]/10 scale-105' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#800020]' : 'text-slate-500'}`} />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'text-[#800020] font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
