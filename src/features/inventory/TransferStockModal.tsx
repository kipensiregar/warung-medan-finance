/**
 * TRANSFER STOCK MODAL - Pemindahan Stok Bahan Baku Antar-Cabang
 * Warung Medan CT Catering
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah } from '../../utils/formatters';
import { STORE_SUNGAI_BAUNG_ID, STORE_PALEMBANG_CENTER_ID } from '../../types';
import { X, Boxes, ShieldCheck, AlertTriangle } from 'lucide-react';

interface TransferStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransferStockModal: React.FC<TransferStockModalProps> = ({ isOpen, onClose }) => {
  const { stores, ingredients, transferStock, showToast } = useApp();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fromStoreId, setFromStoreId] = useState(STORE_PALEMBANG_CENTER_ID);
  const [toStoreId, setToStoreId] = useState(STORE_SUNGAI_BAUNG_ID);

  // Available ingredients in the origin branch
  const originIngredients = ingredients.filter((i) => i.storeId === fromStoreId && i.currentStock > 0);
  const [selectedIngredientId, setSelectedIngredientId] = useState(originIngredients[0]?.id || '');
  const [quantityInput, setQuantityInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep selected ingredient in sync
  React.useEffect(() => {
    const list = ingredients.filter((i) => i.storeId === fromStoreId && i.currentStock > 0);
    if (list.length > 0 && !list.some((i) => i.id === selectedIngredientId)) {
      setSelectedIngredientId(list[0].id);
    }
  }, [fromStoreId, ingredients, selectedIngredientId]);

  if (!isOpen) return null;

  const currentIngredient = ingredients.find((i) => i.id === selectedIngredientId);
  const qty = parseFloat(quantityInput) || 0;
  const transferValuation = currentIngredient ? Math.round(qty * currentIngredient.averagePurchasePrice) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromStoreId === toStoreId) {
      showToast('Cabang asal dan tujuan tidak boleh sama', 'error');
      return;
    }
    if (!currentIngredient) {
      showToast('Pilih bahan baku yang akan dipindahkan', 'error');
      return;
    }
    if (qty <= 0) {
      showToast('Jumlah stok harus lebih dari 0', 'error');
      return;
    }
    if (qty > currentIngredient.currentStock) {
      showToast(
        `Stok tidak mencukupi! Tersedia hanya ${currentIngredient.currentStock} ${currentIngredient.unit}`,
        'error'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await transferStock({
        date,
        fromStoreId,
        toStoreId,
        fromIngredientId: currentIngredient.id,
        quantity: qty,
        notes: notes.trim()
      });
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal memindahkan stok bahan', 'error');
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
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Transfer Stok Bahan Baku</h3>
              <p className="text-[11px] text-amber-200/80">Pemindahan logistik bahan antar unit usaha</p>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Mutasi</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-[#800020]"
              required
            />
          </div>

          {/* Cabang Asal & Tujuan */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dari Cabang (Asal)</label>
              <select
                value={fromStoreId}
                onChange={(e) => setFromStoreId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ke Cabang (Tujuan)</label>
              <select
                value={toStoreId}
                onChange={(e) => setToStoreId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === fromStoreId}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pilih Bahan Baku */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Bahan Baku di Cabang Asal</label>
            {originIngredients.length === 0 ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Tidak ada stok bahan tersedia di cabang asal ini.</span>
              </div>
            ) : (
              <select
                value={selectedIngredientId}
                onChange={(e) => setSelectedIngredientId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
              >
                {originIngredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} (Sisa: {ing.currentStock} {ing.unit} @ {formatRupiah(ing.averagePurchasePrice)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Jumlah Mutasi */}
          {currentIngredient && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Jumlah yang Dikirim</label>
                <span className="text-[11px] text-slate-500">
                  Tersedia: <strong>{currentIngredient.currentStock} {currentIngredient.unit}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-[#800020]"
                  required
                />
                <span className="px-3 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">
                  {currentIngredient.unit}
                </span>
              </div>

              {qty > 0 && (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-amber-900 font-medium">Estimasi Nilai Bahan Dipindahkan:</span>
                  <span className="font-extrabold text-[#800020]">{formatRupiah(transferValuation)}</span>
                </div>
              )}
            </div>
          )}

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan Transfer</label>
            <input
              type="text"
              placeholder="Contoh: Kirim bumbu andaliman & ayam untuk stok event bazar"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          {/* Catatan Konsolidasi */}
          <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-start gap-2 border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-[#800020] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Aturan Konsolidasi Persediaan:</p>
              <p className="mt-0.5 leading-relaxed">
                Pemindahan fisik stok ini tidak dihitung sebagai pembelian bahan baku baru pada laporan konsolidasi. Nilai persediaan disesuaikan antar cabang dengan metode Weighted Average Cost (WAC).
              </p>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || qty <= 0 || !currentIngredient || qty > (currentIngredient?.currentStock || 0)}
              className="w-full py-3 bg-[#800020] hover:bg-[#580016] text-amber-200 rounded-2xl text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Memproses Transfer Stok...' : 'Kirim Transfer Stok'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
