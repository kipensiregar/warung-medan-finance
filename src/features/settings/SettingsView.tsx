/**
 * SETTINGS VIEW - Pengaturan Usaha, Saldo Awal per Cabang, Multi-Store Budgets & APK Guide
 * Warung Medan CT Catering
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { syncRepository } from '../../database/repositories/syncRepository';
import { storeRepository } from '../../database/repositories/storeRepository';
import { ProductsView } from '../products/ProductsView';
import { MigrationModal } from './MigrationModal';
import type { AuditLog, OpeningBalanceConfig, StoreBudget } from '../../types';
import { formatRupiah, formatIndonesianDate, downloadFile } from '../../utils/formatters';
import {
  Settings,
  Building,
  Save,
  Download,
  Upload,
  Shield,
  Smartphone,
  History,
  CheckCircle,
  AlertCircle,
  Utensils,
  RefreshCw,
  Building2,
  Tent,
  Layers,
  Target,
  Database
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, stores, openingBalance, unmappedRecordCount, refreshData, triggerSync, showToast } = useApp();

  type SubTab = 'PROFILE' | 'STORES' | 'OPENING' | 'MENU' | 'BACKUP' | 'APK' | 'AUDIT';
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('PROFILE');

  // Business Profile
  const [businessName, setBusinessName] = useState(settings?.businessName || 'Warung Medan CT Catering');
  const [address, setAddress] = useState(settings?.address || 'Jl. R. Sukamto No. 88, Palembang');
  const [phone, setPhone] = useState(settings?.phone || '0812-3456-7890');
  const [timezone, setTimezone] = useState(settings?.timezone || 'Asia/Jakarta');

  // Store & Budget State
  const [selectedBudgetStoreId, setSelectedBudgetStoreId] = useState('store_palembang_center');
  const [budgetMonth, setBudgetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [targetRevenueInput, setTargetRevenueInput] = useState('');
  const [maxExpenseInput, setMaxExpenseInput] = useState('');
  const [targetNetProfitInput, setTargetNetProfitInput] = useState('');

  // Opening Balance per Store state
  const [selectedOpeningStoreId, setSelectedOpeningStoreId] = useState('store_palembang_center');
  const [cashBalanceInput, setCashBalanceInput] = useState('');
  const [bankBalanceInput, setBankBalanceInput] = useState('');
  const [ewalletBalanceInput, setEwalletBalanceInput] = useState('');

  // Modals
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load opening balance for chosen store
  useEffect(() => {
    syncRepository.getOpeningBalance(selectedOpeningStoreId).then((ob) => {
      if (ob) {
        setCashBalanceInput(formatRupiah(ob.cashBalance));
        setBankBalanceInput(formatRupiah(ob.bankBalance));
        setEwalletBalanceInput(formatRupiah(ob.ewalletBalance));
      } else {
        setCashBalanceInput('Rp0');
        setBankBalanceInput('Rp0');
        setEwalletBalanceInput('Rp0');
      }
    });
  }, [selectedOpeningStoreId]);

  // Load budget for chosen store & month
  useEffect(() => {
    storeRepository.getBudget(selectedBudgetStoreId, budgetMonth).then((bgt) => {
      if (bgt) {
        setTargetRevenueInput(formatRupiah(bgt.targetRevenue));
        setMaxExpenseInput(formatRupiah(bgt.maxExpenseBudget));
        setTargetNetProfitInput(formatRupiah(bgt.targetNetProfit));
      } else {
        setTargetRevenueInput('Rp0');
        setMaxExpenseInput('Rp0');
        setTargetNetProfitInput('Rp0');
      }
    });
  }, [selectedBudgetStoreId, budgetMonth]);

  useEffect(() => {
    if (activeSubTab === 'AUDIT') {
      syncRepository.getAuditLogs().then(setAuditLogs);
    }
  }, [activeSubTab]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await syncRepository.updateSettings({
        businessName,
        address,
        phone,
        timezone
      });
      showToast('Profil usaha berhasil disimpan!', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(`Gagal: ${err.message}`, 'error');
    }
  };

  const handleSaveOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const cash = parseInt(cashBalanceInput.replace(/\D/g, ''), 10) || 0;
    const bank = parseInt(bankBalanceInput.replace(/\D/g, ''), 10) || 0;
    const ewallet = parseInt(ewalletBalanceInput.replace(/\D/g, ''), 10) || 0;

    const config: OpeningBalanceConfig = {
      id: `opening_cfg_${selectedOpeningStoreId}`,
      storeId: selectedOpeningStoreId,
      effectiveDate: new Date().toISOString().slice(0, 10),
      cashBalance: cash,
      bankBalance: bank,
      ewalletBalance: ewallet,
      initialInventoryValue: 0,
      initialPayables: 0,
      initialReceivables: 0,
      ownerEquity: cash + bank + ewallet,
      isConfirmed: true,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    try {
      await syncRepository.saveOpeningBalance(config);
      showToast(`Saldo awal cabang ${stores.find(s => s.id === selectedOpeningStoreId)?.name} berhasil disimpan!`, 'success');
      await refreshData();
    } catch (err: any) {
      showToast(`Gagal: ${err.message}`, 'error');
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetRev = parseInt(targetRevenueInput.replace(/\D/g, ''), 10) || 0;
    const maxExp = parseInt(maxExpenseInput.replace(/\D/g, ''), 10) || 0;
    const targetNet = parseInt(targetNetProfitInput.replace(/\D/g, ''), 10) || 0;

    try {
      await storeRepository.saveBudget({
        storeId: selectedBudgetStoreId,
        month: budgetMonth,
        targetRevenue: targetRev,
        maxExpenseBudget: maxExp,
        targetNetProfit: targetNet
      });
      showToast('Target & anggaran cabang berhasil disimpan!', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(`Gagal menyimpan anggaran: ${err.message}`, 'error');
    }
  };

  const handleExportBackup = async () => {
    try {
      const json = await syncRepository.exportFullBackupJson();
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadFile(json, `Backup_Warung_Medan_CT_${dateStr}.json`, 'application/json');
      showToast('File cadangan database multi-store lengkap berhasil diunduh!', 'success');
    } catch (err: any) {
      showToast(`Gagal mencadangkan: ${err.message}`, 'error');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const res = await syncRepository.restoreBackupJson(content);
        if (res.success) {
          showToast(res.message, 'success');
          await refreshData();
        } else {
          showToast(res.message, 'error');
        }
      } catch (err: any) {
        showToast(`Gagal memulihkan: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto">
      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab('PROFILE')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all min-h-[36px] whitespace-nowrap cursor-pointer ${
            activeSubTab === 'PROFILE'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Profil Usaha
        </button>
        <button
          onClick={() => setActiveSubTab('STORES')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all min-h-[36px] whitespace-nowrap cursor-pointer ${
            activeSubTab === 'STORES'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Cabang & Target
        </button>
        <button
          onClick={() => setActiveSubTab('OPENING')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all min-h-[36px] whitespace-nowrap cursor-pointer ${
            activeSubTab === 'OPENING'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Saldo Awal
        </button>
        <button
          onClick={() => setActiveSubTab('MENU')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all min-h-[36px] whitespace-nowrap cursor-pointer ${
            activeSubTab === 'MENU'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Master Menu
        </button>
        <button
          onClick={() => setActiveSubTab('BACKUP')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all min-h-[36px] whitespace-nowrap cursor-pointer ${
            activeSubTab === 'BACKUP'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Backup & Sinkron
        </button>
        <button
          onClick={() => setActiveSubTab('APK')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all min-h-[36px] whitespace-nowrap cursor-pointer ${
            activeSubTab === 'APK'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Build APK Android
        </button>
        <button
          onClick={() => setActiveSubTab('AUDIT')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all min-h-[36px] whitespace-nowrap cursor-pointer ${
            activeSubTab === 'AUDIT'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Jejak Audit
        </button>
      </div>

      {/* Subtab 1: PROFIL USAHA */}
      {activeSubTab === 'PROFILE' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Profil Warung Medan CT Catering
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Identitas usaha yang akan tercantum pada kop laporan dan faktur
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Usaha
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#800020]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Kantor Pusat / Dapur Catering
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#800020]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#800020]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Zona Waktu Operasional
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-[#800020]"
                >
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                  <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                  <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#800020] text-white text-xs font-bold hover:bg-[#660019] shadow-xs min-h-[44px] flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Profil</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subtab 2: CABANG & TARGET ANGGARAN */}
      {activeSubTab === 'STORES' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Daftar Unit Usaha (Multi-Store)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tiga cabang resmi Warung Medan CT Catering
              </p>
            </div>
            {unmappedRecordCount > 0 && (
              <button
                onClick={() => setIsMigrationModalOpen(true)}
                className="px-3 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Petakan Data ({unmappedRecordCount})</span>
              </button>
            )}
          </div>

          {/* Cards 3 Cabang */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stores.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{s.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#800020] text-amber-200">
                    {s.code}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2">{s.address}</p>
                <p className="text-[10px] text-slate-400">Telp: {s.phone || '-'}</p>
              </div>
            ))}
          </div>

          {/* Target & Anggaran Bulanan Form */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-[#800020]" />
              <span>Target & Anggaran Keuangan Bulanan per Cabang</span>
            </h4>

            <form onSubmit={handleSaveBudget} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Unit Cabang
                  </label>
                  <select
                    value={selectedBudgetStoreId}
                    onChange={(e) => setSelectedBudgetStoreId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bulan Anggaran (YYYY-MM)
                  </label>
                  <input
                    type="month"
                    value={budgetMonth}
                    onChange={(e) => setBudgetMonth(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Omzet (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={targetRevenueInput}
                    onChange={(e) => setTargetRevenueInput(e.target.value)}
                    placeholder="0"
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Maks. Anggaran Beban (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={maxExpenseInput}
                    onChange={(e) => setMaxExpenseInput(e.target.value)}
                    placeholder="0"
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Laba Bersih (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={targetNetProfitInput}
                    onChange={(e) => setTargetNetProfitInput(e.target.value)}
                    placeholder="0"
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-bold font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#800020] text-amber-200 text-xs font-bold hover:bg-[#580016] shadow-xs cursor-pointer"
                >
                  Simpan Target Cabang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subtab 3: SALDO AWAL PER CABANG */}
      {activeSubTab === 'OPENING' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Saldo Awal Pembukuan per Cabang
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap unit cabang memiliki saldo awal fisik dan rekening bank yang terpisah
            </p>
          </div>

          <form onSubmit={handleSaveOpeningBalance} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Unit Cabang
              </label>
              <select
                value={selectedOpeningStoreId}
                onChange={(e) => setSelectedOpeningStoreId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-bold bg-white"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) — {s.address}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Saldo Kas Fisik (Laci Cabang)
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={cashBalanceInput}
                onChange={(e) => setCashBalanceInput(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-bold font-mono tabular-nums focus:ring-2 focus:ring-[#800020]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Saldo Rekening Bank Operasional Cabang
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={bankBalanceInput}
                onChange={(e) => setBankBalanceInput(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-bold font-mono tabular-nums focus:ring-2 focus:ring-[#800020]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Saldo QRIS & E-Wallet Cabang
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={ewalletBalanceInput}
                onChange={(e) => setEwalletBalanceInput(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-bold font-mono tabular-nums focus:ring-2 focus:ring-[#800020]"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900">
              <strong className="block mb-1">Catatan Akuntansi:</strong>
              Saldo awal per cabang digunakan untuk menghitung arus kas dan modal pemilik cabang secara konsisten.
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#800020] text-amber-200 text-xs font-bold hover:bg-[#580016] shadow-xs min-h-[44px] flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Saldo Awal Cabang</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subtab 4: MASTER MENU */}
      {activeSubTab === 'MENU' && <ProductsView />}

      {/* Subtab 5: BACKUP & SINKRON */}
      {activeSubTab === 'BACKUP' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Pencadangan & Pemulihan Data Multi-Store (Offline-First)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Lindungi data keuangan seluruh cabang Warung Medan CT Catering jika HP hilang, rusak, atau ganti perangkat
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export JSON */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-emerald-700" />
                <span>Unduh Cadangan Lengkap (JSON)</span>
              </h4>
              <p className="text-[11px] text-slate-600">
                Ekspor seluruh transaksi, cabang, event bazar, rekap penjualan, pergerakan stok, akun, dan pengaturan ke file JSON.
              </p>
              <button
                onClick={handleExportBackup}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 shadow-2xs min-h-[40px] cursor-pointer"
              >
                <span>Unduh File Cadangan</span>
              </button>
            </div>

            {/* Import JSON */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-indigo-700" />
                <span>Pulihkan dari File Cadangan</span>
              </h4>
              <p className="text-[11px] text-slate-600">
                Pulihkan seluruh riwayat keuangan multi-cabang dari file backup JSON sebelumnya. Data divalidasi secara aman.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-[#800020] text-white hover:bg-[#660019] text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs min-h-[40px] cursor-pointer"
              >
                <span>Pilih File JSON & Pulihkan</span>
              </button>
            </div>
          </div>

          {/* Cloud Sync Manual Trigger */}
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-900">Sinkronisasi Cloud Server</span>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Kirim antrean transaksi lokal 3 cabang ke server cloud saat internet online.
              </p>
            </div>
            <button
              onClick={triggerSync}
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold shrink-0 min-h-[40px] cursor-pointer"
            >
              Sinkronkan Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Subtab 6: PANDUAN BUILD APK ANDROID */}
      {activeSubTab === 'APK' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Petunjuk Build APK Android Native
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Langkah lengkap menghasilkan file APK Warung Medan Finance menggunakan Capacitor & Gradle
            </p>
          </div>

          <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <strong className="text-slate-900 font-bold block">1. Konfigurasi Project Capacitor:</strong>
              <div>Package ID: <code className="font-mono text-[#800020]">com.warungmedan.finance</code></div>
              <div>App Name: <code className="font-mono text-[#800020]">Warung Medan Finance</code></div>
              <div>Web Asset Directory: <code className="font-mono">dist</code></div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <strong className="text-slate-900 font-bold block">2. Perintah Build Web ke Aset Android:</strong>
              <pre className="p-2 bg-slate-900 text-amber-300 rounded-lg font-mono text-[11px] overflow-x-auto">
{`# 1. Build aplikasi web Vite
npm run build

# 2. Inisialisasi platform Android (jika belum ada)
npx cap add android

# 3. Salin hasil build ke Android project
npx cap copy android
npx cap sync android`}
              </pre>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <strong className="text-slate-900 font-bold block">3. Menghasilkan Debug APK:</strong>
              <pre className="p-2 bg-slate-900 text-amber-300 rounded-lg font-mono text-[11px] overflow-x-auto">
{`cd android
./gradlew assembleDebug

# Lokasi file APK Debug yang dihasilkan:
# android/app/build/outputs/apk/debug/app-debug.apk`}
              </pre>
              <p className="text-[11px] text-slate-500 mt-1">
                APK Debug dapat langsung ditransfer lewat WhatsApp/USB ke HP Android pemilik dan diinstal (centang 'Izinkan sumber tidak dikenal').
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <strong className="text-slate-900 font-bold block">4. Menghasilkan Release Signed APK:</strong>
              <pre className="p-2 bg-slate-900 text-amber-300 rounded-lg font-mono text-[11px] overflow-x-auto">
{`# 1. Buat keystore sertifikat rilis:
keytool -genkey -v -keystore warung-medan-release.keystore -alias warungmedan -keyalg RSA -keysize 2048 -validity 10000

# 2. Build release APK di Gradle:
./gradlew assembleRelease`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 7: AUDIT LOGS */}
      {activeSubTab === 'AUDIT' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Jejak Audit Keuangan (Audit Logs)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Catatan mutasi, transfer antar cabang, pemetaan data, dan verifikasi integritas
            </p>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {auditLogs.length === 0 ? (
              <div className="py-6 text-center text-slate-400">Belum ada jejak audit.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{log.action}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{log.details}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Migration Modal */}
      <MigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
      />
    </div>
  );
};
