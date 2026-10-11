/**
 * ADD EXPENSE & FINANCIAL TRANSACTION MODAL
 * Warung Medan CT Catering
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { transactionRepository } from '../../database/repositories/transactionRepository';
import { debtRepository } from '../../database/repositories/debtRepository';
import type { TransactionType, ExpenseCategory } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { X, CheckCircle, ArrowRightLeft } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { accounts, stores, bazarEvents, selectedStoreId, showToast } = useApp();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const initialStore = selectedStoreId !== 'ALL' ? selectedStoreId : 'store_palembang_center';
  const [storeId, setStoreId] = useState(initialStore);
  const [eventId, setEventId] = useState('');
  const [txType, setTxType] = useState<TransactionType>('PENGELUARAN_OPERASIONAL');
  const [category, setCategory] = useState<ExpenseCategory>('Bahan Baku');
  const [amountInput, setAmountInput] = useState('');
  const [recipient, setRecipient] = useState('');

  // Accounts for chosen store
  const branchAccounts = accounts.filter((a) => a.storeId === storeId);
  const [sourceAccountId, setSourceAccountId] = useState(branchAccounts[0]?.id || accounts[0]?.id || '');
  const [destAccountId, setDestAccountId] = useState(branchAccounts[1]?.id || accounts[1]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'Transfer Bank' | 'QRIS'>('Tunai');
  const [notes, setNotes] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync accounts if store changes
  React.useEffect(() => {
    const list = accounts.filter((a) => a.storeId === storeId);
    if (list.length > 0 && !list.some((a) => a.id === sourceAccountId)) {
      setSourceAccountId(list[0].id);
      setDestAccountId(list[1]?.id || list[0].id);
    }
  }, [storeId, accounts, sourceAccountId]);

  if (!isOpen) return null;

  const amount = Math.max(0, parseInt(amountInput.replace(/\D/g, ''), 10) || 0);

  const categories: ExpenseCategory[] = [
    'Bahan Baku',
    'Gaji Karyawan',
    'Sewa Tempat',
    'Listrik & Air',
    'Gas LPG',
    'Transportasi & Bensin',
    'Kemasan & Plastik',
    'Peralatan Masak',
    'Perawatan & Servis',
    'Pemasaran & Promosi',
    'Administrasi & Bank',
    'Pajak & Retribusi',
    'Lain-lain'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      showToast('Nominal transaksi harus lebih dari Rp0', 'error');
      return;
    }

    if (txType === 'TRANSFER_ANTAR_AKUN' && sourceAccountId === destAccountId) {
      showToast('Akun sumber dan akun tujuan tidak boleh sama', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await transactionRepository.createTransaction({
        storeId,
        eventId: storeId === 'store_bazar' && eventId ? eventId : undefined,
        date,
        type: txType,
        category:
          txType === 'TRANSFER_ANTAR_AKUN'
            ? 'Transfer Antar-Akun'
            : txType === 'SETORAN_MODAL' || txType === 'PRIVE_PEMILIK'
            ? 'Ekuitas Pemilik'
            : category,
        amount,
        sourceAccountId,
        destinationAccountId: txType === 'TRANSFER_ANTAR_AKUN' ? destAccountId : undefined,
        recipientOrSupplier: recipient.trim() || undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
        referenceNumber: refNumber.trim() || undefined
      });

      showToast('Transaksi keuangan berhasil dicatat!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(`Gagal menyimpan: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              Catat Pengeluaran & Transaksi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Warung Medan CT Catering · Pembukuan akuntansi rapi
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Unit Cabang */}
          <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/60 space-y-2">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Unit Cabang Usaha *
                </label>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {storeId === 'store_bazar' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Event Bazar (Opsional)
                  </label>
                  <select
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                  >
                    <option value="">-- Umum / Tanpa Event --</option>
                    {bazarEvents.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} ({ev.startDate})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Jenis Transaksi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Jenis Transaksi Keuangan
            </label>
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value as TransactionType)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#800020] bg-white font-medium"
            >
              <option value="PENGELUARAN_OPERASIONAL">Beban Operasional Usaha</option>
              <option value="PEMBELIAN_BAHAN_BAKU">Pembelian Persediaan Bahan Baku</option>
              <option value="PEMBELIAN_ASET">Pembelian Aset (Alat Masak, Freezer, dll)</option>
              <option value="PEMBAYARAN_UTANG">Pembayaran Utang Supplier</option>
              <option value="TRANSFER_ANTAR_AKUN">Transfer Antar-Akun (Kas &lt;&gt; Bank)</option>
              <option value="SETORAN_MODAL">Setoran Modal Pemilik (Ekuitas)</option>
              <option value="PRIVE_PEMILIK">Pengambilan Pribadi (Prive Pemilik)</option>
            </select>
          </div>

          {/* Tanggal & Nominal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Transaksi
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nominal (Rp)
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="0"
                value={amountInput ? formatRupiah(amount) : ''}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-base font-bold font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#800020]"
              />
            </div>
          </div>

          {/* Kategori Pengeluaran (jika operasional/pembelian) */}
          {txType === 'PENGELUARAN_OPERASIONAL' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori Beban Operasional
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#800020] bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Akun Sumber & Tujuan */}
          {txType === 'TRANSFER_ANTAR_AKUN' ? (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <ArrowRightLeft className="w-4 h-4 text-[#800020]" />
                <span>Pengaturan Transfer Antar-Akun:</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Dari Akun (Keluar)
                  </label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full h-10 px-2 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatRupiah(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Ke Akun (Masuk)
                  </label>
                  <select
                    value={destAccountId}
                    onChange={(e) => setDestAccountId(e.target.value)}
                    className="w-full h-10 px-2 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatRupiah(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {txType === 'SETORAN_MODAL' ? 'Masuk ke Akun' : 'Sumber Dana (Akun)'}
                </label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#800020] bg-white font-medium"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatRupiah(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as 'Tunai' | 'Transfer Bank' | 'QRIS')
                  }
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#800020] bg-white"
                >
                  <option value="Tunai">Tunai</option>
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="QRIS">QRIS / E-Wallet</option>
                </select>
              </div>
            </div>
          )}

          {/* Penerima / Supplier */}
          {txType !== 'TRANSFER_ANTAR_AKUN' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Penerima / Toko / Supplier
              </label>
              <input
                type="text"
                placeholder="Contoh: Agen Gas LPG, Pasar Sambu, Gaji Koki"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]"
              />
            </div>
          )}

          {/* Notes & Ref */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                No. Bukti / Bon / Struk
              </label>
              <input
                type="text"
                placeholder="Contoh: BUKTI-092"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Keterangan
              </label>
              <input
                type="text"
                placeholder="Ket: Pembelian 3 tabung gas 12kg"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[44px]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || amount <= 0}
              className="px-5 py-2.5 rounded-xl bg-[#800020] text-xs font-bold text-white hover:bg-[#660019] shadow-sm disabled:opacity-50 min-h-[44px] flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
