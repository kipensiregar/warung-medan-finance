/**
 * PRODUCTS & MENU VIEW - Master Menu Warung Medan & CT Catering
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { productRepository } from '../../database/repositories/productRepository';
import type { ProductMenu } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { Plus, Utensils, CheckCircle, X, Edit3 } from 'lucide-react';

export const ProductsView: React.FC = () => {
  const { products, refreshData, showToast } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductMenu['category']>('Lauk Utama');
  const [sellingPriceInput, setSellingPriceInput] = useState('');
  const [hppInput, setHppInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sellingPrice = Math.max(0, parseInt(sellingPriceInput.replace(/\D/g, ''), 10) || 0);
  const estimatedHpp = hppInput ? Math.max(0, parseInt(hppInput.replace(/\D/g, ''), 10) || 0) : undefined;

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Nama menu wajib diisi', 'error');
      return;
    }
    if (sellingPrice <= 0) {
      showToast('Harga jual harus lebih dari Rp0', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await productRepository.create({
        name: name.trim(),
        category,
        sellingPrice,
        estimatedHpp,
        notes: notes.trim() || undefined
      });

      showToast(`Menu "${name}" berhasil ditambahkan!`, 'success');
      setIsAddModalOpen(false);
      setName('');
      setSellingPriceInput('');
      setHppInput('');
      setNotes('');
      await refreshData();
    } catch (err: any) {
      showToast(`Gagal menambahkan menu: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await productRepository.toggleActive(id, !currentStatus);
      showToast('Status menu berhasil diperbarui', 'success');
      await refreshData();
    } catch (err: any) {
      showToast(`Gagal mengubah status: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-tight">
            Master Menu & Produk Katering
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Warung Medan CT Catering · Masakan Khas Batak & Nusantara
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#800020] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#660019]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Menu</span>
        </button>
      </div>

      {/* Product List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {products.map((p) => (
          <div
            key={p.id}
            className={`bg-white rounded-2xl p-4 border transition-all shadow-xs ${
              p.isActive ? 'border-slate-200/90' : 'border-slate-200 bg-slate-50 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <span className="text-[10px] font-semibold text-[#800020] uppercase tracking-wide">
                  {p.category}
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5 leading-tight">
                  {p.name}
                </h4>
                {p.notes && (
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {p.notes}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleToggleActive(p.id, p.isActive)}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                  p.isActive
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {p.isActive ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Harga Jual</span>
                <span className="font-mono font-bold text-sm text-slate-900">
                  {formatRupiah(p.sellingPrice)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Estimasi HPP</span>
                <span className="font-mono font-semibold text-xs text-slate-600">
                  {p.estimatedHpp ? formatRupiah(p.estimatedHpp) : 'Belum diisi'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Tambah Menu Masakan</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 pt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Menu
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Daun Ubi Tumbuk Andaliman"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#800020]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="Lauk Utama">Lauk Utama</option>
                  <option value="Sayur & Pelengkap">Sayur & Pelengkap</option>
                  <option value="Mie & Sarapan">Mie & Sarapan</option>
                  <option value="Paket Catering">Paket Catering</option>
                  <option value="Minuman">Minuman</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="0"
                    value={sellingPriceInput ? formatRupiah(sellingPrice) : ''}
                    onChange={(e) => setSellingPriceInput(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono tabular-nums font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimasi HPP (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Opsional"
                    value={hppInput ? formatRupiah(estimatedHpp || 0) : ''}
                    onChange={(e) => setHppInput(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Deskripsi
                </label>
                <input
                  type="text"
                  placeholder="Bumbu rempah & racikan"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="px-5 py-2 rounded-xl bg-[#800020] text-xs font-bold text-white hover:bg-[#660019] min-h-[44px]"
                >
                  Simpan Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
