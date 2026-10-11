/**
 * ADD SALES MODAL - Rekap Penjualan Harian
 * Warung Medan CT Catering
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { salesRepository } from '../../database/repositories/salesRepository';
import type { SalesChannel, PaymentMethod, PaymentSplitItem } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { X, CheckCircle, Calculator } from 'lucide-react';

interface AddSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddSalesModal: React.FC<AddSalesModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { accounts, stores, bazarEvents, selectedStoreId, showToast } = useApp();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const initialStore = selectedStoreId !== 'ALL' ? selectedStoreId : 'store_palembang_center';
  const [storeId, setStoreId] = useState(initialStore);
  const [eventId, setEventId] = useState<string>('');
  const [channel, setChannel] = useState<SalesChannel>('Dine-in');
  const [grossSalesInput, setGrossSalesInput] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [refundInput, setRefundInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');

  // Filter accounts by the chosen store
  const branchAccounts = accounts.filter((a) => a.storeId === storeId);
  const [singleAccountId, setSingleAccountId] = useState(branchAccounts[0]?.id || accounts[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [refNumber, setRefNumber] = useState('');

  // Update account if store changes
  React.useEffect(() => {
    const list = accounts.filter((a) => a.storeId === storeId);
    if (list.length > 0 && !list.some((a) => a.id === singleAccountId)) {
      setSingleAccountId(list[0].id);
    }
  }, [storeId, accounts, singleAccountId]);

  // If channel is Bazar, auto set storeId to Bazar
  React.useEffect(() => {
    if (channel === 'Bazar') {
      setStoreId('store_bazar');
    }
  }, [channel]);

  // Multi-split state
  const [splits, setSplits] = useState<{ [accId: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const grossSales = Math.max(0, parseInt(grossSalesInput.replace(/\D/g, ''), 10) || 0);
  const discount = Math.max(0, parseInt(discountInput.replace(/\D/g, ''), 10) || 0);
  const refund = Math.max(0, parseInt(refundInput.replace(/\D/g, ''), 10) || 0);
  const netSales = Math.max(0, grossSales - discount - refund);

  // Calculate total split amounts
  const totalSplitAllocated = accounts.reduce((sum, acc) => {
    const val = parseInt((splits[acc.id] || '').replace(/\D/g, ''), 10) || 0;
    return sum + val;
  }, 0);

  const splitDifference = netSales - totalSplitAllocated;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (netSales <= 0) {
      showToast('Penjualan bersih harus lebih dari Rp0', 'error');
      return;
    }

    let finalSplits: PaymentSplitItem[] = [];

    if (paymentMethod === 'Campuran') {
      if (splitDifference !== 0) {
        showToast(
          `Total alokasi campuran (Rp${totalSplitAllocated.toLocaleString(
            'id-ID'
          )}) harus tepat sama dengan Penjualan Bersih (Rp${netSales.toLocaleString('id-ID')})`,
          'error'
        );
        return;
      }

      for (const acc of accounts) {
        const val = parseInt((splits[acc.id] || '').replace(/\D/g, ''), 10) || 0;
        if (val > 0) {
          finalSplits.push({
            accountId: acc.id,
            accountName: acc.name,
            method: acc.type === 'Kas' ? 'Tunai' : acc.type === 'Bank' ? 'Transfer Bank' : 'QRIS',
            amount: val
          });
        }
      }
    } else {
      const selectedAcc = accounts.find((a) => a.id === singleAccountId) || accounts[0];
      if (!selectedAcc) {
        showToast('Pilih akun penerima dana', 'error');
        return;
      }
      finalSplits = [
        {
          accountId: selectedAcc.id,
          accountName: selectedAcc.name,
          method: paymentMethod as 'Tunai' | 'Transfer Bank' | 'QRIS',
          amount: netSales
        }
      ];
    }

    try {
      setIsSubmitting(true);
      await salesRepository.createDailySummary({
        storeId,
        eventId: (storeId === 'store_bazar' || channel === 'Bazar') && eventId ? eventId : undefined,
        date,
        channel,
        grossSales,
        discount,
        refund,
        paymentMethod,
        splits: finalSplits,
        notes: notes.trim() || undefined,
        referenceNumber: refNumber.trim() || undefined
      });

      showToast('Rekap penjualan harian berhasil disimpan!', 'success');
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
              Rekap Penjualan Harian
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Warung Medan CT Catering · Catat total penjualan
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

              {(storeId === 'store_bazar' || channel === 'Bazar') ? (
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
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Kanal Penjualan
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as SalesChannel)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#800020] bg-white"
                  >
                    <option value="Dine-in">Dine-in (Makan di Tempat)</option>
                    <option value="Takeaway">Takeaway (Bungkus)</option>
                    <option value="Catering">Catering (Prasmanan/Kotak)</option>
                    <option value="Bazar">Bazar & Event Pesta</option>
                    <option value="Lainnya">Penjualan Lainnya</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Penjualan
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
                Kanal Penjualan
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as SalesChannel)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#800020] bg-white"
              >
                <option value="Dine-in">Dine-in (Makan di Tempat)</option>
                <option value="Takeaway">Takeaway (Bungkus)</option>
                <option value="Catering">Catering (Prasmanan/Kotak)</option>
                <option value="Bazar">Bazar & Event Pesta</option>
                <option value="Lainnya">Penjualan Lainnya</option>
              </select>
            </div>
          </div>

          {/* Penjualan Kotor, Diskon, Refund */}
          <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Penjualan Kotor (Rp)
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="0"
                value={grossSalesInput ? formatRupiah(grossSales) : ''}
                onChange={(e) => setGrossSalesInput(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-base font-bold font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#800020] bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Diskon / Potongan
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={discountInput ? formatRupiah(discount) : ''}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-mono tabular-nums bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Refund / Retur
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={refundInput ? formatRupiah(refund) : ''}
                  onChange={(e) => setRefundInput(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-mono tabular-nums bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                />
              </div>
            </div>

            {/* Live Net Sales Preview */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                Penjualan Bersih:
              </span>
              <span className="text-base font-extrabold font-mono tabular-nums text-emerald-700">
                {formatRupiah(netSales)}
              </span>
            </div>
          </div>

          {/* Metode Pembayaran */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['Tunai', 'Transfer Bank', 'QRIS', 'Campuran'] as PaymentMethod[]).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all text-center min-h-[40px] ${
                    paymentMethod === m
                      ? 'border-[#800020] bg-[#800020]/10 text-[#800020] font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Single Account Selection or Multi Split */}
          {paymentMethod !== 'Campuran' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Masuk ke Akun Rekening / Kas
              </label>
              <select
                value={singleAccountId}
                onChange={(e) => setSingleAccountId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#800020] bg-white"
              >
                {(branchAccounts.length > 0 ? branchAccounts : accounts).map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type}) - Saldo: {formatRupiah(acc.currentBalance)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span>Rincian Pembayaran Campuran:</span>
                <span className={splitDifference === 0 ? 'text-emerald-700' : 'text-rose-600'}>
                  {splitDifference === 0 ? 'Sesuai (Rp0)' : `Selisih: ${formatRupiah(splitDifference)}`}
                </span>
              </div>

              {(branchAccounts.length > 0 ? branchAccounts : accounts).map((acc) => {
                const currentVal = parseInt((splits[acc.id] || '').replace(/\D/g, ''), 10) || 0;
                return (
                  <div key={acc.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-700 flex-1 truncate font-medium">
                      {acc.name}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={currentVal > 0 ? formatRupiah(currentVal) : ''}
                      onChange={(e) =>
                        setSplits((prev) => ({
                          ...prev,
                          [acc.id]: e.target.value
                        }))
                      }
                      className="w-36 h-9 px-2.5 rounded-lg border border-slate-300 text-xs font-mono tabular-nums text-right bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes & Ref */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                No. Faktur / Referensi
              </label>
              <input
                type="text"
                placeholder="Contoh: INV-2026-001"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Catatan Rekap
              </label>
              <input
                type="text"
                placeholder="Ket: Lauk habis, ramai makan siang"
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
              disabled={isSubmitting || netSales <= 0}
              className="px-5 py-2.5 rounded-xl bg-[#800020] text-xs font-bold text-white hover:bg-[#660019] shadow-sm disabled:opacity-50 min-h-[44px] flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Rekap'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
