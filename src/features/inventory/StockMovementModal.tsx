/**
 * STOCK MOVEMENT MODAL - Pencatatan Pergerakan Stok Manual & Opname
 * Warung Medan CT Catering
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { inventoryRepository } from '../../database/repositories/inventoryRepository';
import type { StockMovementType, Ingredient } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { X, CheckCircle, PackagePlus, Flame, AlertTriangle, Scale } from 'lucide-react';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedIngredient?: Ingredient | null;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedIngredient
}) => {
  const { ingredients, showToast } = useApp();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [ingredientId, setIngredientId] = useState(selectedIngredient?.id || ingredients[0]?.id || '');
  const [movementType, setMovementType] = useState<StockMovementType>('PEMAKAIAN_MANUAL');
  const [qtyInput, setQtyInput] = useState('');
  const [purchasePriceInput, setPurchasePriceInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentIng = ingredients.find((i) => i.id === ingredientId) || ingredients[0];
  const quantity = Math.max(0, parseFloat(qtyInput) || 0);
  const purchasePrice = Math.max(0, parseInt(purchasePriceInput.replace(/\D/g, ''), 10) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentIng) {
      showToast('Pilih bahan baku terlebih dahulu', 'error');
      return;
    }
    if (quantity <= 0) {
      showToast('Jumlah bahan harus lebih dari 0', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await inventoryRepository.recordMovement({
        ingredientId: currentIng.id,
        date,
        type: movementType,
        quantity,
        unitPrice: movementType === 'MASUK_PEMBELIAN' && purchasePrice > 0 ? purchasePrice : undefined,
        notes: notes.trim() || undefined
      });

      showToast(`Pergerakan stok ${currentIng.name} berhasil disimpan!`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(`Gagal mencatat stok: ${err.message}`, 'error');
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
              Catat Pergerakan Stok
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pencatatan pemakaian bahan dapur, barang masuk & opname
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
          {/* Pilih Bahan Baku */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bahan Baku
            </label>
            <select
              value={ingredientId}
              onChange={(e) => setIngredientId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#800020]"
            >
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} (Sisa: {ing.currentStock} {ing.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Current Ingredient Summary Card */}
          {currentIng && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Stok Saat Ini:</span>
                <div className="font-bold font-mono tabular-nums text-slate-800 text-sm mt-0.5">
                  {currentIng.currentStock} {currentIng.unit}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Harga Rata-rata:</span>
                <div className="font-bold font-mono tabular-nums text-[#800020] text-sm mt-0.5">
                  {formatRupiah(currentIng.averagePurchasePrice)} / {currentIng.unit}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Nilai Persediaan:</span>
                <div className="font-bold font-mono tabular-nums text-emerald-700 text-sm mt-0.5">
                  {formatRupiah(currentIng.totalValuation)}
                </div>
              </div>
            </div>
          )}

          {/* Jenis Pergerakan Stok */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Jenis Pergerakan Stok
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMovementType('PEMAKAIAN_MANUAL')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                  movementType === 'PEMAKAIAN_MANUAL'
                    ? 'border-[#800020] bg-[#800020]/10 text-[#800020] font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-600" />
                <span>Pemakaian Dapur (Masak)</span>
              </button>

              <button
                type="button"
                onClick={() => setMovementType('MASUK_PEMBELIAN')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                  movementType === 'MASUK_PEMBELIAN'
                    ? 'border-[#800020] bg-[#800020]/10 text-[#800020] font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <PackagePlus className="w-4 h-4 text-emerald-600" />
                <span>Barang Masuk (Beli)</span>
              </button>

              <button
                type="button"
                onClick={() => setMovementType('RUSAK_TERBUANG')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                  movementType === 'RUSAK_TERBUANG'
                    ? 'border-[#800020] bg-[#800020]/10 text-[#800020] font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Bahan Rusak / Basi</span>
              </button>

              <button
                type="button"
                onClick={() => setMovementType('PENYESUAIAN_OPNAME')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                  movementType === 'PENYESUAIAN_OPNAME'
                    ? 'border-[#800020] bg-[#800020]/10 text-[#800020] font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Scale className="w-4 h-4 text-indigo-600" />
                <span>Koreksi Opname Fisik</span>
              </button>
            </div>
          </div>

          {/* Tanggal & Jumlah */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal
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
                {movementType === 'PENYESUAIAN_OPNAME'
                  ? `Stok Fisik Baru (${currentIng?.unit || 'unit'})`
                  : `Jumlah (${currentIng?.unit || 'unit'})`}
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="0"
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-base font-bold font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#800020]"
              />
            </div>
          </div>

          {/* Harga Beli jika Masuk Pembelian */}
          {movementType === 'MASUK_PEMBELIAN' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Harga Beli Satuan Baru (Rp / {currentIng?.unit})
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder={formatRupiah(currentIng?.averagePurchasePrice || 0)}
                value={purchasePriceInput ? formatRupiah(purchasePrice) : ''}
                onChange={(e) => setPurchasePriceInput(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#800020]"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Sistem akan memperbarui harga pokok rata-rata tertimbang (Weighted Average Cost) secara otomatis.
              </p>
            </div>
          )}

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan / Alasan
            </label>
            <input
              type="text"
              placeholder="Contoh: Pemakaian untuk 80 porsi pesanan catering pernikahan"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#800020]"
            />
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
              disabled={isSubmitting || quantity <= 0}
              className="px-5 py-2.5 rounded-xl bg-[#800020] text-xs font-bold text-white hover:bg-[#660019] shadow-sm disabled:opacity-50 min-h-[44px] flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Stok'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
