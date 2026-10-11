/**
 * TRANSACTIONS VIEW - Daftar & Riwayat Lengkap Transaksi
 * Warung Medan CT Catering
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PeriodFilter } from '../../components/common/PeriodFilter';
import { StoreSelector } from '../../components/common/StoreSelector';
import { TransferMoneyModal } from './TransferMoneyModal';
import { salesRepository } from '../../database/repositories/salesRepository';
import { transactionRepository } from '../../database/repositories/transactionRepository';
import { AddSalesModal } from './AddSalesModal';
import { AddExpenseModal } from './AddExpenseModal';
import type { DailySalesSummary, FinancialTransaction } from '../../types';
import { formatRupiah, formatIndonesianDate, generateCsv, downloadFile } from '../../utils/formatters';
import {
  Plus,
  Receipt,
  Search,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRightLeft,
  Filter
} from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const { dateRange, selectedStoreId, stores, refreshData, showToast } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'ALL' | 'SALES' | 'EXPENSES' | 'TRANSFERS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [salesList, setSalesList] = useState<DailySalesSummary[]>([]);
  const [txList, setTxList] = useState<FinancialTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Void confirmation dialog
  const [voidTarget, setVoidTarget] = useState<{
    type: 'SALES' | 'TX';
    id: string;
    label: string;
  } | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const [sales, txs] = await Promise.all([
        salesRepository.getByDateRange(dateRange.startDate, dateRange.endDate, selectedStoreId),
        transactionRepository.getByDateRange(dateRange.startDate, dateRange.endDate, selectedStoreId)
      ]);
      setSalesList(sales);
      setTxList(txs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [dateRange, selectedStoreId]);

  const handleConfirmVoid = async () => {
    if (!voidTarget) return;
    if (!voidReason.trim()) {
      showToast('Harap masukkan alasan pembatalan transaksi', 'error');
      return;
    }

    try {
      if (voidTarget.type === 'SALES') {
        await salesRepository.voidDailySummary(voidTarget.id, voidReason);
      } else {
        await transactionRepository.voidTransaction(voidTarget.id, voidReason);
      }
      showToast('Transaksi berhasil dibatalkan (diberi tanda void)', 'success');
      setVoidTarget(null);
      setVoidReason('');
      await loadTransactions();
      await refreshData();
    } catch (err: any) {
      showToast(`Gagal membatalkan transaksi: ${err.message}`, 'error');
    }
  };

  const handleExportCsv = () => {
    if (salesList.length === 0 && txList.length === 0) {
      showToast('Tidak ada data transaksi untuk diekspor', 'info');
      return;
    }

    const headers = [
      'Tipe',
      'Tanggal',
      'Kategori / Kanal',
      'Keterangan / Penerima',
      'Metode Pembayaran',
      'Nominal (Rp)',
      'Status Void'
    ];

    const rows: (string | number)[][] = [];

    for (const s of salesList) {
      rows.push([
        'PENJUALAN',
        s.date,
        s.channel,
        s.notes || s.referenceNumber || '-',
        s.paymentMethod,
        s.netSales,
        s.isVoided ? 'BATAL (VOID)' : 'VALID'
      ]);
    }

    for (const t of txList) {
      rows.push([
        t.type,
        t.date,
        t.category,
        t.recipientOrSupplier || t.notes || '-',
        t.paymentMethod,
        t.amount,
        t.isVoided ? 'BATAL (VOID)' : 'VALID'
      ]);
    }

    const csvContent = generateCsv(headers, rows);
    downloadFile(
      csvContent,
      `Transaksi_Warung_Medan_${dateRange.startDate}_${dateRange.endDate}.csv`,
      'text/csv;charset=utf-8;'
    );
    showToast('File CSV berhasil diunduh!', 'success');
  };

  // Filtered lists
  const filteredSales = salesList.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.channel.toLowerCase().includes(q) ||
      (s.notes && s.notes.toLowerCase().includes(q)) ||
      (s.referenceNumber && s.referenceNumber.toLowerCase().includes(q))
    );
  });

  const filteredTxs = txList.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.category.toLowerCase().includes(q) ||
      (t.recipientOrSupplier && t.recipientOrSupplier.toLowerCase().includes(q)) ||
      (t.notes && t.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto">
      {/* Unit Cabang Switcher */}
      <div className="bg-white p-2.5 rounded-3xl border border-slate-200/90 shadow-xs">
        <StoreSelector />
      </div>

      {/* Top Header & Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-tight">
            Riwayat Transaksi Keuangan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Unit: <strong>{selectedStoreId === 'ALL' ? 'Semua Cabang' : stores.find(s => s.id === selectedStoreId)?.name}</strong> · Periode: <span className="font-semibold text-slate-700">{dateRange.label}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold text-indigo-900 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-700" />
            <span>Transfer Cabang</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('ALL')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all min-h-[36px] whitespace-nowrap ${
            activeSubTab === 'ALL'
              ? 'bg-white text-[#800020] shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Semua ({salesList.length + txList.length})
        </button>
        <button
          onClick={() => setActiveSubTab('SALES')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all min-h-[36px] whitespace-nowrap ${
            activeSubTab === 'SALES'
              ? 'bg-white text-[#800020] shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Penjualan ({salesList.length})
        </button>
        <button
          onClick={() => setActiveSubTab('EXPENSES')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all min-h-[36px] whitespace-nowrap ${
            activeSubTab === 'EXPENSES'
              ? 'bg-white text-[#800020] shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pengeluaran ({txList.filter((t) => t.type !== 'TRANSFER_ANTAR_AKUN').length})
        </button>
        <button
          onClick={() => setActiveSubTab('TRANSFERS')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all min-h-[36px] whitespace-nowrap ${
            activeSubTab === 'TRANSFERS'
              ? 'bg-white text-[#800020] shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Transfer ({txList.filter((t) => t.type === 'TRANSFER_ANTAR_AKUN').length})
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Cari transaksi, supplier, atau nomor referensi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#800020] shadow-xs"
        />
      </div>

      {/* Floating Action Bar */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setIsSalesModalOpen(true)}
          className="min-h-[46px] p-2.5 rounded-xl bg-[#800020] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-[#660019]"
        >
          <Receipt className="w-4 h-4 text-amber-300" />
          <span>+ Rekap Penjualan</span>
        </button>
        <button
          onClick={() => setIsExpenseModalOpen(true)}
          className="min-h-[46px] p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-slate-50"
        >
          <Plus className="w-4 h-4 text-rose-600" />
          <span>+ Catat Pengeluaran</span>
        </button>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Memuat data transaksi...</div>
        ) : filteredSales.length === 0 && filteredTxs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-xs text-slate-400">Tidak ada transaksi ditemukan pada periode ini.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {/* Sales Items */}
            {(activeSubTab === 'ALL' || activeSubTab === 'SALES') &&
              filteredSales.map((s) => (
                <div key={s.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        Penjualan {s.channel}
                      </span>
                      {s.isVoided && (
                        <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                          BATAL (VOID)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-x-2">
                      <span>{formatIndonesianDate(s.date, true)}</span>
                      <span>·</span>
                      <span>{s.paymentMethod}</span>
                      {s.referenceNumber && <span>· No: {s.referenceNumber}</span>}
                    </div>
                    {s.notes && (
                      <div className="text-[11px] text-slate-600 mt-1 italic">
                        "{s.notes}"
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono font-bold text-sm ${
                        s.isVoided ? 'text-slate-400 line-through' : 'text-emerald-700'
                      }`}
                    >
                      +{formatRupiah(s.netSales)}
                    </div>
                    {s.discount > 0 && (
                      <div className="text-[10px] text-slate-400">
                        Diskon: {formatRupiah(s.discount)}
                      </div>
                    )}
                    {!s.isVoided && (
                      <button
                        onClick={() =>
                          setVoidTarget({
                            type: 'SALES',
                            id: s.id,
                            label: `Penjualan ${s.channel} ${formatRupiah(s.netSales)}`
                          })
                        }
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-medium mt-1 underline block ml-auto"
                      >
                        Batalkan
                      </button>
                    )}
                  </div>
                </div>
              ))}

            {/* Expense & Other Transactions */}
            {(activeSubTab === 'ALL' || activeSubTab === 'EXPENSES' || activeSubTab === 'TRANSFERS') &&
              filteredTxs
                .filter((t) => {
                  if (activeSubTab === 'TRANSFERS') return t.type === 'TRANSFER_ANTAR_AKUN';
                  if (activeSubTab === 'EXPENSES') return t.type !== 'TRANSFER_ANTAR_AKUN';
                  return true;
                })
                .map((t) => {
                  const isPositive =
                    t.type === 'SETORAN_MODAL' || t.type === 'PENERIMAAN_PIUTANG';
                  const isTransfer = t.type === 'TRANSFER_ANTAR_AKUN';

                  return (
                    <div key={t.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {isTransfer
                              ? 'Transfer Antar-Akun'
                              : t.recipientOrSupplier || t.category}
                          </span>
                          {t.isVoided && (
                            <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                              BATAL (VOID)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-x-2">
                          <span>{formatIndonesianDate(t.date, true)}</span>
                          <span>·</span>
                          <span>{t.category}</span>
                          <span>·</span>
                          <span>{t.paymentMethod}</span>
                        </div>
                        {t.notes && (
                          <div className="text-[11px] text-slate-600 mt-1 italic">
                            "{t.notes}"
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono font-bold text-sm ${
                            t.isVoided
                              ? 'text-slate-400 line-through'
                              : isPositive
                              ? 'text-emerald-700'
                              : isTransfer
                              ? 'text-slate-800'
                              : 'text-rose-700'
                          }`}
                        >
                          {isPositive ? '+' : isTransfer ? '' : '-'}
                          {formatRupiah(t.amount)}
                        </div>
                        <div className="text-[10px] text-slate-400">{t.type}</div>
                        {!t.isVoided && (
                          <button
                            onClick={() =>
                              setVoidTarget({
                                type: 'TX',
                                id: t.id,
                                label: `Transaksi ${t.category} ${formatRupiah(t.amount)}`
                              })
                            }
                            className="text-[10px] text-slate-400 hover:text-rose-600 font-medium mt-1 underline block ml-auto"
                          >
                            Batalkan
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>
        )}
      </div>

      {/* Confirmation Void Dialog */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Batalkan Transaksi (Void)</h3>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Anda akan membatalkan <strong className="text-slate-800">{voidTarget.label}</strong>.
              Saldo akun yang bersangkutan akan dikembalikan secara otomatis demi menjaga integritas pembukuan.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alasan Pembatalan:
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Salah input tanggal / nominal"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setVoidTarget(null);
                  setVoidReason('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 min-h-[44px]"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmVoid}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white min-h-[44px]"
              >
                Ya, Batalkan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddSalesModal
        isOpen={isSalesModalOpen}
        onClose={() => setIsSalesModalOpen(false)}
        onSuccess={() => {
          loadTransactions();
          refreshData();
        }}
      />
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => {
          loadTransactions();
          refreshData();
        }}
      />
      <TransferMoneyModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          loadTransactions();
          refreshData();
        }}
      />
    </div>
  );
};
