/**
 * TRANSFER MONEY MODAL - Pencatatan Transfer Kas/Bank Antar-Cabang
 * Warung Medan CT Catering
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah } from '../../utils/formatters';
import { STORE_SUNGAI_BAUNG_ID, STORE_PALEMBANG_CENTER_ID, STORE_BAZAR_ID } from '../../types';
import { X, ArrowRightLeft, ShieldCheck, AlertCircle } from 'lucide-react';

interface TransferMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransferMoneyModal: React.FC<TransferMoneyModalProps> = ({ isOpen, onClose }) => {
  const { stores, accounts, transferMoney, showToast } = useApp();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fromStoreId, setFromStoreId] = useState(STORE_SUNGAI_BAUNG_ID);
  const [toStoreId, setToStoreId] = useState(STORE_PALEMBANG_CENTER_ID);

  // Accounts based on store
  const fromAccounts = accounts.filter((a) => a.storeId === fromStoreId);
  const toAccounts = accounts.filter((a) => a.storeId === toStoreId);

  const [fromAccountId, setFromAccountId] = useState(fromAccounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(toAccounts[0]?.id || '');
  const [amountInput, setAmountInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep accounts in sync when store changes
  React.useEffect(() => {
    const froms = accounts.filter((a) => a.storeId === fromStoreId);
    if (froms.length > 0 && !froms.some((a) => a.id === fromAccountId)) {
      setFromAccountId(froms[0].id);
    }
  }, [fromStoreId, accounts, fromAccountId]);

  React.useEffect(() => {
    const tos = accounts.filter((a) => a.storeId === toStoreId);
    if (tos.length > 0 && !tos.some((a) => a.id === toAccountId)) {
      setToAccountId(tos[0].id);
    }
  }, [toStoreId, accounts, toAccountId]);

  if (!isOpen) return null;

  const numericAmount = Math.max(0, parseInt(amountInput.replace(/\D/g, ''), 10) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromStoreId === toStoreId) {
      showToast('Cabang asal dan cabang tujuan tidak boleh sama', 'error');
      return;
    }
    if (!fromAccountId || !toAccountId) {
      showToast('Pilih akun pengirim dan akun penerima', 'error');
      return;
    }
    if (numericAmount <= 0) {
      showToast('Masukkan nominal transfer yang valid', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await transferMoney({
        date,
        fromStoreId,
        toStoreId,
        fromAccountId,
        toAccountId,
        amount: numericAmount,
        notes: notes.trim()
      });
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses transfer uang', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#800020] px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Transfer Uang Antar-Cabang</h3>
              <p className="text-[11px] text-amber-200/80">Pencatatan kas antar unit usaha</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Tanggal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Transfer</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-[#800020]"
              required
            />
          </div>

          {/* Cabang & Akun Asal */}
          <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/60 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">1. Cabang Pengirim (Sumber)</span>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Unit Cabang Asal</label>
              <select
                value={fromStoreId}
                onChange={(e) => setFromStoreId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Akun Kas / Bank Pengirim</label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
              >
                {fromAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — Saldo: {formatRupiah(a.currentBalance)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cabang & Akun Tujuan */}
          <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200/60 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">2. Cabang Penerima (Tujuan)</span>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Unit Cabang Tujuan</label>
              <select
                value={toStoreId}
                onChange={(e) => setToStoreId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === fromStoreId}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Akun Kas / Bank Penerima</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
              >
                {toAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — Saldo: {formatRupiah(a.currentBalance)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nominal Transfer */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Transfer (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={numericAmount > 0 ? formatRupiah(numericAmount) : amountInput}
              onChange={(e) => setAmountInput(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-[#800020]"
              required
            />
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Keperluan</label>
            <input
              type="text"
              placeholder="Contoh: Modal kas kecil stan bazar, setoran omzet ke pusat"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          {/* Info Audit & Eliminasi Konsolidasi */}
          <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-start gap-2 border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-[#800020] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Aturan Akuntansi Konsolidasi:</p>
              <p className="mt-0.5 leading-relaxed">
                Transfer ini dicatat sebagai arus keluar di cabang asal dan arus masuk di cabang tujuan.
                Pada laporan konsolidasi gabungan (Semua Cabang), mutasi internal ini otomatis <strong>dieliminasi</strong> (net 0) agar tidak menggembungkan omzet atau biaya.
              </p>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || numericAmount <= 0}
              className="w-full py-3 bg-[#800020] hover:bg-[#580016] text-amber-200 rounded-2xl text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Memproses Transfer...' : 'Simpan Transfer Antar-Cabang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
