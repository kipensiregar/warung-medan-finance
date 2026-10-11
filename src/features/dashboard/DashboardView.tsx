/**
 * DASHBOARD VIEW - Ringkasan Keuangan Multi-Store & Konsolidasian Usaha
 * Warung Medan CT Catering
 *
 * Supported Units:
 * - Semua Cabang (Konsolidasian dengan eliminasi transaksi internal)
 * - Sungai Baung (SB)
 * - Palembang Center (PC)
 * - Bazar (BZ - dengan pelacakan event bazar)
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PeriodFilter } from '../../components/common/PeriodFilter';
import { StoreSelector } from '../../components/common/StoreSelector';
import { StatCard } from '../../components/common/StatCard';
import { accountingService } from '../../services/accountingService';
import { debtRepository } from '../../database/repositories/debtRepository';
import { salesRepository } from '../../database/repositories/salesRepository';
import { transactionRepository } from '../../database/repositories/transactionRepository';
import { inventoryRepository } from '../../database/repositories/inventoryRepository';
import { AddSalesModal } from '../transactions/AddSalesModal';
import { AddExpenseModal } from '../transactions/AddExpenseModal';
import { TransferMoneyModal } from '../transactions/TransferMoneyModal';
import { TransferStockModal } from '../inventory/TransferStockModal';
import { StockMovementModal } from '../inventory/StockMovementModal';
import { BazarEventModal } from '../reports/BazarEventModal';
import { MigrationModal } from '../settings/MigrationModal';
import type {
  ProfitLossReport,
  DailySalesSummary,
  FinancialTransaction,
  Ingredient,
  StoreComparisonItem
} from '../../types';
import { formatRupiah, formatIndonesianDate } from '../../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building,
  Package,
  AlertTriangle,
  Plus,
  Receipt,
  ArrowRight,
  ShieldCheck,
  ArrowRightLeft,
  Boxes,
  Tent,
  Layers,
  Sparkles,
  Database
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    dateRange,
    selectedStoreId,
    stores,
    accounts,
    ingredients,
    unmappedRecordCount,
    setActiveTab,
    refreshData,
    settings
  } = useApp();

  const [pnl, setPnl] = useState<ProfitLossReport | null>(null);
  const [debtSummary, setDebtSummary] = useState({ totalPayablesRemaining: 0, totalReceivablesRemaining: 0 });
  const [recentSales, setRecentSales] = useState<DailySalesSummary[]>([]);
  const [recentTxs, setRecentTxs] = useState<FinancialTransaction[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([]);
  const [storeComparisons, setStoreComparisons] = useState<StoreComparisonItem[]>([]);

  // Modals state
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isTransferMoneyOpen, setIsTransferMoneyOpen] = useState(false);
  const [isTransferStockOpen, setIsTransferStockOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isBazarEventModalOpen, setIsBazarEventModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  // Drilldown modal
  const [drilldownDetail, setDrilldownDetail] = useState<{ title: string; content: React.ReactNode } | null>(null);

  const isConsolidated = selectedStoreId === 'ALL';
  const currentStore = stores.find((s) => s.id === selectedStoreId);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardStats = async () => {
      try {
        const [report, debts, sales, txs, lowStocks, comparisons] = await Promise.all([
          accountingService.calculateProfitLoss(
            dateRange.startDate,
            dateRange.endDate,
            dateRange.label,
            selectedStoreId
          ),
          debtRepository.getSummary(selectedStoreId),
          salesRepository.getByDateRange(dateRange.startDate, dateRange.endDate, selectedStoreId),
          transactionRepository.getByDateRange(dateRange.startDate, dateRange.endDate, selectedStoreId),
          inventoryRepository.getLowStockAlerts(selectedStoreId),
          isConsolidated ? accountingService.getStoreComparison(dateRange.startDate, dateRange.endDate) : Promise.resolve([])
        ]);

        if (isMounted) {
          setPnl(report);
          setDebtSummary(debts);
          setRecentSales(sales.slice(0, 5));
          setRecentTxs(txs.slice(0, 5));
          setLowStockItems(lowStocks);
          setStoreComparisons(comparisons);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    };

    fetchDashboardStats();
    return () => {
      isMounted = false;
    };
  }, [dateRange, selectedStoreId, isConsolidated]);

  // Account balances filtered by chosen store
  const relevantAccounts = accounts.filter((a) => (isConsolidated ? true : a.storeId === selectedStoreId));
  const relevantIngredients = ingredients.filter((i) => (isConsolidated ? true : i.storeId === selectedStoreId));

  const cashBalance = relevantAccounts
    .filter((a) => a.type === 'Kas')
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const bankAndEwalletBalance = relevantAccounts
    .filter((a) => a.type === 'Bank' || a.type === 'E-Wallet')
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const totalInventoryValuation = relevantIngredients.reduce((sum, i) => sum + i.totalValuation, 0);

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto">
      {/* 1. Store Selector (Multi-Unit Switcher) */}
      <div className="bg-white p-2.5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between px-2 pb-1.5 text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            {isConsolidated ? (
              <Layers className="w-4 h-4 text-[#800020]" />
            ) : currentStore?.isBazarUnit ? (
              <Tent className="w-4 h-4 text-amber-700" />
            ) : (
              <Building className="w-4 h-4 text-[#800020]" />
            )}
            <span>Pilih Unit Usaha:</span>
          </span>
          <span className="text-[11px] font-semibold text-slate-500">
            {isConsolidated ? 'Semua Unit Gabungan' : currentStore?.name}
          </span>
        </div>
        <StoreSelector />
      </div>

      {/* 2. Period Filter */}
      <PeriodFilter />

      {/* Migration Notice Banner if unmapped records exist */}
      {unmappedRecordCount > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-800 shrink-0" />
            <span className="text-amber-900 font-medium">
              Ada <strong>{unmappedRecordCount} record historis</strong> belum dipetakan ke cabang.
            </span>
          </div>
          <button
            onClick={() => setIsMigrationModalOpen(true)}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shrink-0"
          >
            Petakan Sekarang
          </button>
        </div>
      )}

      {/* Demo Mode Notice Banner */}
      {settings?.isDemoMode && (
        <div className="p-3 bg-amber-50/90 rounded-2xl border border-amber-300 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded text-[10px]">
              DATA SIMULASI
            </span>
            <span className="text-amber-900 font-medium">
              Aplikasi menggunakan data contoh simulasi usaha.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-[11px] font-bold text-[#800020] hover:underline whitespace-nowrap ml-2"
          >
            Mulai Pembukuan Nyata →
          </button>
        </div>
      )}

      {/* 3. Low Stock Alert Banner (if any) */}
      {lowStockItems.length > 0 && (
        <div
          onClick={() => setActiveTab('inventory')}
          className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/90 flex items-center justify-between cursor-pointer hover:bg-amber-100/70 transition-colors shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-200/70 flex items-center justify-center text-amber-800 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900">
                Peringatan: {lowStockItems.length} Bahan Baku di Bawah Stok Minimum ({isConsolidated ? 'Semua Cabang' : currentStore?.name})
              </div>
              <div className="text-[11px] text-amber-700/90 mt-0.5 line-clamp-1">
                {lowStockItems.map((i) => `${i.name} (sisa ${i.currentStock} ${i.unit})`).join(' · ')}
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-800 shrink-0 ml-2" />
        </div>
      )}

      {/* 4. Quick Action Buttons (Touch Ergonomics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setIsSalesModalOpen(true)}
          className="p-3 bg-[#800020] text-white rounded-2xl shadow-xs hover:bg-[#660019] active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1.5 min-h-[56px] cursor-pointer"
        >
          <Receipt className="w-5 h-5 text-amber-300" />
          <span className="text-xs font-bold leading-tight">Rekap Penjualan</span>
        </button>

        <button
          onClick={() => setIsExpenseModalOpen(true)}
          className="p-3 bg-white text-slate-800 border border-slate-200 rounded-2xl shadow-xs hover:bg-slate-50 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1.5 min-h-[56px] cursor-pointer"
        >
          <Plus className="w-5 h-5 text-rose-600" />
          <span className="text-xs font-bold leading-tight">Catat Pengeluaran</span>
        </button>

        <button
          onClick={() => setIsTransferMoneyOpen(true)}
          className="p-3 bg-white text-slate-800 border border-slate-200 rounded-2xl shadow-xs hover:bg-slate-50 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1.5 min-h-[56px] cursor-pointer"
        >
          <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
          <span className="text-xs font-bold leading-tight">Transfer Uang Cabang</span>
        </button>

        <button
          onClick={() => setIsTransferStockOpen(true)}
          className="p-3 bg-white text-slate-800 border border-slate-200 rounded-2xl shadow-xs hover:bg-slate-50 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1.5 min-h-[56px] cursor-pointer"
        >
          <Boxes className="w-5 h-5 text-amber-700" />
          <span className="text-xs font-bold leading-tight">Transfer Stok Bahan</span>
        </button>
      </div>

      {/* Special Bazar Button if Bazar or Consolidated is selected */}
      {(selectedStoreId === 'store_bazar' || isConsolidated) && (
        <div className="p-3 bg-amber-950/5 border border-amber-900/15 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-900 rounded-xl">
              <Tent className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Modul Event Bazar</p>
              <p className="text-[11px] text-slate-500">Kelola stan, target omzet, dan laba rugi per festival/event</p>
            </div>
          </div>
          <button
            onClick={() => setIsBazarEventModalOpen(true)}
            className="px-3 py-1.5 bg-[#800020] hover:bg-[#580016] text-amber-200 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Buka Event Bazar →
          </button>
        </div>
      )}

      {/* 5. Primary Financial Metrics (Pemasukan, Pengeluaran, Laba Kotor, Laba Bersih) */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          title={isConsolidated ? 'Omzet Konsolidasian' : `Omzet ${currentStore?.name}`}
          amount={pnl?.netSales || 0}
          subtitle={`Kotor: ${formatRupiah(pnl?.grossSales || 0)}`}
          accent="emerald"
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          onClick={() => setActiveTab('transactions')}
        />

        <StatCard
          title="Total Beban Operasional"
          amount={pnl?.totalOperatingExpenses || 0}
          subtitle={isConsolidated ? 'Beban Gabungan (Eliminasi Inter-Unit)' : 'Beban Cabang'}
          accent="crimson"
          icon={<TrendingDown className="w-4 h-4 text-rose-600" />}
          onClick={() => setActiveTab('transactions')}
        />

        <StatCard
          title="Laba Kotor"
          amount={pnl?.grossProfit || 0}
          subtitle={`Margin: ${pnl?.grossMarginPct || 0}% · HPP: ${formatRupiah(pnl?.costOfGoodsSold || 0)}`}
          accent="maroon"
          onClick={() => setActiveTab('reports')}
        />

        <StatCard
          title="Laba Bersih Usaha"
          amount={pnl?.netProfit || 0}
          subtitle={`Margin: ${pnl?.netMarginPct || 0}%`}
          accent={pnl && pnl.netProfit >= 0 ? 'emerald' : 'crimson'}
          onClick={() => setActiveTab('reports')}
        />
      </div>

      {/* 6. Consolidated Elimination Indicator (When ALL is active) */}
      {isConsolidated && (
        <div className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-sm flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-amber-300">Eliminasi Transaksi Internal Konsolidasi:</p>
              <p className="text-[11px] text-slate-300">
                Transfer uang dan perpindahan stok antar cabang otomatis dieliminasi dari omzet & biaya gabungan.
              </p>
            </div>
          </div>
          <span className="font-mono font-bold text-amber-300 text-xs px-2.5 py-1 bg-white/10 rounded-lg">
            Tereliminasi Net Rp0
          </span>
        </div>
      )}

      {/* 7. Liquid Assets & Balance Sheet Summary */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          title="Saldo Kas Fisik (Laci)"
          amount={cashBalance}
          subtitle={isConsolidated ? 'Seluruh Kas Fisik Cabang' : `Kas Fisik ${currentStore?.name}`}
          accent="neutral"
          icon={<Wallet className="w-4 h-4 text-slate-600" />}
          onClick={() => {
            setDrilldownDetail({
              title: isConsolidated ? 'Rincian Kas Fisik Seluruh Cabang' : `Rincian Kas Fisik ${currentStore?.name}`,
              content: (
                <div className="space-y-2">
                  {relevantAccounts
                    .filter((a) => a.type === 'Kas')
                    .map((a) => (
                      <div key={a.id} className="flex justify-between py-2 border-b border-slate-100 text-xs">
                        <span className="font-medium text-slate-700">{a.name}</span>
                        <span className="font-mono font-bold text-slate-900">{formatRupiah(a.currentBalance)}</span>
                      </div>
                    ))}
                </div>
              )
            });
          }}
        />

        <StatCard
          title="Saldo Bank & E-Wallet"
          amount={bankAndEwalletBalance}
          subtitle={isConsolidated ? 'Rekening Bank Seluruh Unit' : `Rekening ${currentStore?.name}`}
          accent="neutral"
          icon={<Building className="w-4 h-4 text-slate-600" />}
          onClick={() => {
            setDrilldownDetail({
              title: isConsolidated ? 'Rincian Saldo Bank Seluruh Cabang' : `Rincian Saldo Bank ${currentStore?.name}`,
              content: (
                <div className="space-y-2">
                  {relevantAccounts
                    .filter((a) => a.type === 'Bank' || a.type === 'E-Wallet')
                    .map((a) => (
                      <div key={a.id} className="flex justify-between py-2 border-b border-slate-100 text-xs">
                        <span className="font-medium text-slate-700">{a.name}</span>
                        <span className="font-mono font-bold text-slate-900">{formatRupiah(a.currentBalance)}</span>
                      </div>
                    ))}
                </div>
              )
            });
          }}
        />

        <StatCard
          title="Valuasi Persediaan Stok"
          amount={totalInventoryValuation}
          subtitle={`${relevantIngredients.length} Jenis Bahan Baku`}
          accent="amber"
          icon={<Package className="w-4 h-4 text-amber-700" />}
          onClick={() => setActiveTab('inventory')}
        />

        <StatCard
          title="Utang & Piutang Cabang"
          amount={debtSummary.totalReceivablesRemaining}
          subtitle={`Utang Supplier: ${formatRupiah(debtSummary.totalPayablesRemaining)}`}
          accent="neutral"
          onClick={() => setActiveTab('reports')}
        />
      </div>

      {/* 8. Multi-Store Performance Comparison Table (Shown on Consolidated Dashboard) */}
      {isConsolidated && storeComparisons.length > 0 && (
        <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Perbandingan Kinerja Antar-Cabang</h3>
              <p className="text-[11px] text-slate-500">Komparasi omzet, pengeluaran & laba bersih per unit usaha</p>
            </div>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs font-bold text-[#800020] hover:underline flex items-center gap-1"
            >
              <span>Laporan Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                  <th className="py-2 px-2.5 rounded-l-xl">Unit Usaha</th>
                  <th className="py-2 px-2 text-right">Omzet Bersih</th>
                  <th className="py-2 px-2 text-right">Pengeluaran</th>
                  <th className="py-2 px-2 text-right">Laba Bersih</th>
                  <th className="py-2 px-2.5 text-right rounded-r-xl">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {storeComparisons.map((item) => (
                  <tr key={item.storeId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#800020]" />
                      <span>{item.storeName}</span>
                      <span className="text-[10px] font-mono text-slate-400">({item.code})</span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-800">
                      {formatRupiah(item.netSales)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-rose-700">
                      {formatRupiah(item.operatingExpenses)}
                    </td>
                    <td
                      className={`py-2.5 px-2 text-right font-mono font-bold ${
                        item.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {formatRupiah(item.netProfit)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-slate-700">
                      {item.netMarginPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. Visual Performance Comparison Bar (SVG Graphic) */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Performa Keuangan Periode</h3>
            <p className="text-[11px] text-slate-500">
              Penjualan Bersih vs Pengeluaran ({isConsolidated ? 'Semua Cabang' : currentStore?.name})
            </p>
          </div>
          <button
            onClick={() => setActiveTab('reports')}
            className="text-xs font-semibold text-[#800020] hover:underline flex items-center gap-1"
          >
            <span>Rincian Laporan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3 pt-1">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-slate-600">Penjualan Bersih</span>
              <span className="font-mono font-bold text-emerald-700">{formatRupiah(pnl?.netSales || 0)}</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    pnl && pnl.netSales > 0
                      ? Math.min(100, Math.round((pnl.netSales / (Math.max(pnl.netSales, pnl.totalOperatingExpenses) || 1)) * 100))
                      : 0
                  }%`
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-slate-600">Total Pengeluaran Operasional</span>
              <span className="font-mono font-bold text-rose-700">{formatRupiah(pnl?.totalOperatingExpenses || 0)}</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    pnl && pnl.totalOperatingExpenses > 0
                      ? Math.min(100, Math.round((pnl.totalOperatingExpenses / (Math.max(pnl.netSales, pnl.totalOperatingExpenses) || 1)) * 100))
                      : 0
                  }%`
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-slate-600">Harga Pokok Penjualan (HPP Bahan Terpakai)</span>
              <span className="font-mono font-bold text-amber-800">{formatRupiah(pnl?.costOfGoodsSold || 0)}</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    pnl && pnl.netSales > 0 && pnl.costOfGoodsSold > 0
                      ? Math.min(100, Math.round((pnl.costOfGoodsSold / pnl.netSales) * 100))
                      : 0
                  }%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 10. Recent Activity */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Aktivitas Terakhir</h3>
          <button
            onClick={() => setActiveTab('transactions')}
            className="text-xs font-semibold text-[#800020] hover:underline"
          >
            Lihat Semua
          </button>
        </div>

        {recentSales.length === 0 && recentTxs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Belum ada transaksi pada periode {dateRange.label}. Tekan tombol di atas untuk mencatat transaksi.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {recentSales.map((s) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">
                    Penjualan {s.channel} · {s.paymentMethod}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {formatIndonesianDate(s.date)} {s.notes ? `· ${s.notes}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-700">
                    +{formatRupiah(s.netSales)}
                  </div>
                  {s.discount > 0 && (
                    <div className="text-[10px] text-slate-400">
                      Diskon: {formatRupiah(s.discount)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {recentTxs.map((t) => (
              <div key={t.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">
                    {t.category} · {t.paymentMethod}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {formatIndonesianDate(t.date)} {t.recipientOrSupplier ? `· Kepada: ${t.recipientOrSupplier}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-mono font-bold ${
                      t.type === 'SETORAN_MODAL' || t.type === 'PENERIMAAN_PIUTANG'
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {t.type === 'SETORAN_MODAL' || t.type === 'PENERIMAAN_PIUTANG' ? '+' : '-'}
                    {formatRupiah(t.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drilldown Modal */}
      {drilldownDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">{drilldownDetail.title}</h3>
              <button
                onClick={() => setDrilldownDetail(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="pt-3">{drilldownDetail.content}</div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddSalesModal
        isOpen={isSalesModalOpen}
        onClose={() => setIsSalesModalOpen(false)}
        onSuccess={refreshData}
      />
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={refreshData}
      />
      <TransferMoneyModal
        isOpen={isTransferMoneyOpen}
        onClose={() => setIsTransferMoneyOpen(false)}
      />
      <TransferStockModal
        isOpen={isTransferStockOpen}
        onClose={() => setIsTransferStockOpen(false)}
      />
      <StockMovementModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onSuccess={refreshData}
      />
      <BazarEventModal
        isOpen={isBazarEventModalOpen}
        onClose={() => setIsBazarEventModalOpen(false)}
      />
      <MigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
      />
    </div>
  );
};
