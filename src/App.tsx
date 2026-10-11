/**
 * WARUNG MEDAN FINANCE - MAIN APP CONTAINER
 * Warung Medan CT Catering
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { BottomNav } from './components/common/BottomNav';
import { DashboardView } from './features/dashboard/DashboardView';
import { TransactionsView } from './features/transactions/TransactionsView';
import { InventoryView } from './features/inventory/InventoryView';
import { ReportsView } from './features/reports/ReportsView';
import { SettingsView } from './features/settings/SettingsView';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab, toastMessage, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBF8F5] p-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#800020] text-amber-300 font-extrabold flex items-center justify-center text-xl shadow-lg animate-pulse mb-3">
          WM
        </div>
        <h2 className="text-base font-bold text-slate-900">Warung Medan Finance</h2>
        <p className="text-xs text-slate-500 mt-1">Menyiapkan database keuangan offline-first...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF8F5] text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-3.5 pt-4 pb-20">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'transactions' && <TransactionsView />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto pointer-events-none flex justify-center">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2 pointer-events-auto transition-all animate-bounce ${
              toastMessage.type === 'error'
                ? 'bg-rose-600 text-white border-rose-700'
                : toastMessage.type === 'info'
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-emerald-700 text-white border-emerald-800'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : toastMessage.type === 'info' ? (
              <Info className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
