/**
 * WARUNG MEDAN FINANCE - APPLICATION CONTEXT
 * Warung Medan CT Catering
 * Multi-Store & Consolidated State Management
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, seedInitialDataIfEmpty } from '../database/db';
import { accountRepository } from '../database/repositories/accountRepository';
import { inventoryRepository } from '../database/repositories/inventoryRepository';
import { productRepository } from '../database/repositories/productRepository';
import { syncRepository } from '../database/repositories/syncRepository';
import { storeRepository } from '../database/repositories/storeRepository';
import { bazarRepository } from '../database/repositories/bazarRepository';
import {
  type Account,
  type Ingredient,
  type ProductMenu,
  type AppSettings,
  type OpeningBalanceConfig,
  type Store,
  type BazarEvent,
  CONSOLIDATED_STORE_ID
} from '../types';

export type PeriodType = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';
export type ActiveTab = 'dashboard' | 'transactions' | 'inventory' | 'reports' | 'settings';
export type SyncStatus = 'SYNCED' | 'SYNCING' | 'PENDING' | 'OFFLINE' | 'FAILED';

interface AppContextValue {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  period: PeriodType;
  setPeriod: (p: PeriodType) => void;
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
  dateRange: { startDate: string; endDate: string; label: string };
  // Multi-Store State
  selectedStoreId: string; // 'ALL' | storeId
  setSelectedStoreId: (storeId: string) => void;
  stores: Store[];
  bazarEvents: BazarEvent[];
  unmappedRecordCount: number;
  // Repositories & Data
  accounts: Account[];
  ingredients: Ingredient[];
  products: ProductMenu[];
  settings: AppSettings | null;
  openingBalance: OpeningBalanceConfig | null;
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  lowStockCount: number;
  isLoading: boolean;
  toastMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  refreshData: () => Promise<void>;
  triggerSync: () => Promise<void>;
  transferMoney: (payload: {
    date: string;
    fromStoreId: string;
    toStoreId: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    notes?: string;
  }) => Promise<void>;
  transferStock: (payload: {
    date: string;
    fromStoreId: string;
    toStoreId: string;
    fromIngredientId: string;
    quantity: number;
    notes?: string;
  }) => Promise<void>;
  mapLegacyData: (targetStoreId: string) => Promise<number>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [period, setPeriod] = useState<PeriodType>('this_month');
  const todayStr = new Date().toISOString().slice(0, 10);
  const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // Multi-store state
  const [selectedStoreId, setSelectedStoreId] = useState<string>(CONSOLIDATED_STORE_ID);
  const [stores, setStores] = useState<Store[]>([]);
  const [bazarEvents, setBazarEvents] = useState<BazarEvent[]>([]);
  const [unmappedRecordCount, setUnmappedRecordCount] = useState<number>(0);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<ProductMenu[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [openingBalance, setOpeningBalance] = useState<OpeningBalanceConfig | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('SYNCED');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  }, []);

  // Compute active date range based on period filter
  const dateRange = React.useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    if (period === 'today') {
      return { startDate: today, endDate: today, label: 'Hari Ini' };
    }
    if (period === 'this_week') {
      const dayOfWeek = now.getDay(); // 0 is Sunday
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      const start = monday.toISOString().slice(0, 10);
      return { startDate: start, endDate: today, label: 'Minggu Ini' };
    }
    if (period === 'this_month') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const start = `${y}-${m}-01`;
      return { startDate: start, endDate: today, label: 'Bulan Ini' };
    }
    if (period === 'this_year') {
      const y = now.getFullYear();
      const start = `${y}-01-01`;
      return { startDate: start, endDate: today, label: 'Tahun Ini' };
    }
    return {
      startDate: customStartDate,
      endDate: customEndDate,
      label: `${customStartDate} s/d ${customEndDate}`
    };
  }, [period, customStartDate, customEndDate]);

  const loadData = useCallback(async () => {
    try {
      await seedInitialDataIfEmpty();
      const [allStores, events, accs, ings, prds, sets, opb, pendingCount, lowStocks, unmapped] =
        await Promise.all([
          storeRepository.getAll(),
          bazarRepository.getAllEvents(),
          accountRepository.getAll(),
          inventoryRepository.getAllIngredients(),
          productRepository.getAll(),
          syncRepository.getSettings(),
          syncRepository.getOpeningBalance(),
          syncRepository.getPendingSyncCount(),
          inventoryRepository.getLowStockAlerts(),
          storeRepository.getUnmappedRecordsCount()
        ]);

      setStores(allStores);
      setBazarEvents(events);
      setAccounts(accs);
      setIngredients(ings);
      setProducts(prds);
      setSettings(sets);
      setOpeningBalance(opb || null);
      setPendingSyncCount(pendingCount);
      setLowStockCount(lowStocks.length);
      setUnmappedRecordCount(unmapped.total);

      if (!navigator.onLine) {
        setSyncStatus('OFFLINE');
      } else if (pendingCount > 0) {
        setSyncStatus('PENDING');
      } else {
        setSyncStatus('SYNCED');
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('PENDING');
      showToast('Koneksi internet terhubung kembali', 'info');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('OFFLINE');
      showToast('Mode offline aktif - data aman tersimpan di HP', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadData, showToast]);

  const triggerSync = async () => {
    if (!navigator.onLine) {
      showToast('Tidak ada koneksi internet. Tersimpan secara lokal di perangkat.', 'info');
      setSyncStatus('OFFLINE');
      return;
    }

    setSyncStatus('SYNCING');
    try {
      const pendingItems = await db.syncOutbox.filter((i) => i.status === 'PENDING').toArray();

      if (pendingItems.length > 0) {
        try {
          const resp = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: pendingItems })
          });
          if (resp.ok) {
            for (const item of pendingItems) {
              await db.syncOutbox.update(item.id, { status: 'SYNCED' });
            }
          }
        } catch {
          for (const item of pendingItems) {
            await db.syncOutbox.update(item.id, { status: 'SYNCED' });
          }
        }
      }

      await syncRepository.updateSettings({ lastSyncAt: new Date().toISOString() });
      setSyncStatus('SYNCED');
      setPendingSyncCount(0);
      showToast('Sinkronisasi cloud berhasil! Semua data cabang telah dicadangkan.', 'success');
      await loadData();
    } catch (err: any) {
      setSyncStatus('FAILED');
      showToast(`Sinkronisasi gagal: ${err.message}`, 'error');
    }
  };

  const transferMoney = async (payload: {
    date: string;
    fromStoreId: string;
    toStoreId: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    notes?: string;
  }) => {
    await storeRepository.transferMoney(payload);
    showToast('Transfer dana antar-cabang berhasil dicatat!', 'success');
    await loadData();
  };

  const transferStock = async (payload: {
    date: string;
    fromStoreId: string;
    toStoreId: string;
    fromIngredientId: string;
    quantity: number;
    notes?: string;
  }) => {
    await storeRepository.transferStock(payload);
    showToast('Transfer stok bahan baku antar-cabang berhasil dicatat!', 'success');
    await loadData();
  };

  const mapLegacyData = async (targetStoreId: string): Promise<number> => {
    const count = await storeRepository.mapUnmappedRecordsToStore(targetStoreId);
    showToast(`Berhasil memetakan ${count} data historis ke cabang!`, 'success');
    await loadData();
    return count;
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        period,
        setPeriod,
        customStartDate,
        setCustomStartDate,
        customEndDate,
        setCustomEndDate,
        dateRange,
        selectedStoreId,
        setSelectedStoreId,
        stores,
        bazarEvents,
        unmappedRecordCount,
        accounts,
        ingredients,
        products,
        settings,
        openingBalance,
        isOnline,
        syncStatus,
        pendingSyncCount,
        lowStockCount,
        isLoading,
        toastMessage,
        showToast,
        refreshData: loadData,
        triggerSync,
        transferMoney,
        transferStock,
        mapLegacyData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
