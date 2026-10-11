/**
 * INVENTORY VIEW - Pengelolaan Stok Bahan Baku & Valuasi Persediaan
 * Warung Medan CT Catering
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { StoreSelector } from '../../components/common/StoreSelector';
import { inventoryRepository } from '../../database/repositories/inventoryRepository';
import { StockMovementModal } from './StockMovementModal';
import { TransferStockModal } from './TransferStockModal';
import { IngredientFormModal } from './IngredientFormModal';
import type { Ingredient, StockMovement } from '../../types';
import { formatRupiah, formatIndonesianDate } from '../../utils/formatters';
import {
  Package,
  Plus,
  Flame,
  Search,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Layers,
  Boxes
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { ingredients, stores, selectedStoreId, refreshData, showToast } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'CATALOG' | 'HISTORY'>('CATALOG');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  // Modals
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isTransferStockOpen, setIsTransferStockOpen] = useState(false);
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);
  const [selectedIngredientForMove, setSelectedIngredientForMove] = useState<Ingredient | null>(null);

  const isConsolidated = selectedStoreId === 'ALL';
  const currentStore = stores.find((s) => s.id === selectedStoreId);

  const loadMovements = async () => {
    try {
      setIsLoadingMovements(true);
      const list = await inventoryRepository.getMovements(undefined, selectedStoreId);
      setMovements(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMovements(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'HISTORY') {
      loadMovements();
    }
  }, [activeSubTab, selectedStoreId]);

  // Filter ingredients by chosen store
  const relevantIngredients = ingredients.filter((i) => (isConsolidated ? true : i.storeId === selectedStoreId));
  const totalValuation = relevantIngredients.reduce((sum, i) => sum + i.totalValuation, 0);
  const lowStockCount = relevantIngredients.filter((i) => i.currentStock <= i.minimumStock).length;

  // Extract categories
  const categories = Array.from(new Set(relevantIngredients.map((i) => i.category)));

  // Filtered ingredients
  const filteredIngredients = relevantIngredients.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.defaultSupplier && item.defaultSupplier.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto">
      {/* Unit Cabang Switcher */}
      <div className="bg-white p-2.5 rounded-3xl border border-slate-200/90 shadow-xs">
        <StoreSelector />
      </div>

      {/* 1. Inventory Summary Banner */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs">
        <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-100">
          <div>
            <span className="text-[11px] font-semibold text-slate-500">
              {isConsolidated ? 'Valuasi Gabungan' : `Valuasi ${currentStore?.name}`}
            </span>
            <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {formatRupiah(totalValuation)}
            </div>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500">Total Bahan Baku</span>
            <div className="text-base font-bold font-mono tabular-nums text-[#800020] mt-0.5">
              {relevantIngredients.length} Item
            </div>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500">Stok Menipis</span>
            <div
              className={`text-base font-bold font-mono tabular-nums mt-0.5 ${
                lowStockCount > 0 ? 'text-amber-800' : 'text-emerald-700'
              }`}
            >
              {lowStockCount} Bahan
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sub Tabs (Katalog vs Riwayat Pergerakan) */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
        <button
          onClick={() => setActiveSubTab('CATALOG')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all min-h-[36px] flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'CATALOG'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Katalog Bahan Baku</span>
        </button>
        <button
          onClick={() => setActiveSubTab('HISTORY')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all min-h-[36px] flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'HISTORY'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat Pergerakan Stok</span>
        </button>
      </div>

      {/* 3. Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            setSelectedIngredientForMove(null);
            setIsMovementModalOpen(true);
          }}
          className="min-h-[46px] p-2.5 rounded-xl bg-[#800020] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-[#660019] cursor-pointer"
        >
          <Flame className="w-4 h-4 text-amber-300" />
          <span>Catat Pemakaian</span>
        </button>
        <button
          onClick={() => setIsTransferStockOpen(true)}
          className="min-h-[46px] p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-amber-100 cursor-pointer"
        >
          <Boxes className="w-4 h-4 text-amber-700" />
          <span>Transfer Stok</span>
        </button>
        <button
          onClick={() => setIsAddIngredientOpen(true)}
          className="min-h-[46px] p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-slate-50 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#800020]" />
          <span>+ Tambah Bahan</span>
        </button>
      </div>

      {activeSubTab === 'CATALOG' ? (
        <>
          {/* Category Filter Pills & Search */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Cari bahan baku (Andaliman, Ayam, Ikan mas)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#800020] shadow-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`py-1 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap min-h-[32px] ${
                  selectedCategory === 'ALL'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Semua Kategori
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`py-1 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap min-h-[32px] ${
                    selectedCategory === c
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Ingredient Catalog List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredIngredients.map((ing) => {
              const isLowStock = ing.currentStock <= ing.minimumStock;

              return (
                <div
                  key={ing.id}
                  className={`bg-white rounded-2xl p-4 border transition-all shadow-xs ${
                    isLowStock
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {ing.name}
                      </h4>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {ing.category} {ing.defaultSupplier ? `· ${ing.defaultSupplier}` : ''}
                      </div>
                    </div>

                    {isLowStock && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Menipis
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Sisa Stok</span>
                      <span
                        className={`font-mono font-bold text-sm tabular-nums ${
                          isLowStock ? 'text-amber-800 font-extrabold' : 'text-slate-900'
                        }`}
                      >
                        {ing.currentStock} {ing.unit}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Harga WAC</span>
                      <span className="font-mono font-bold text-xs tabular-nums text-slate-700">
                        {formatRupiah(ing.averagePurchasePrice)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Valuasi</span>
                      <span className="font-mono font-bold text-xs tabular-nums text-emerald-700">
                        {formatRupiah(ing.totalValuation)}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  <div className="mt-3 pt-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedIngredientForMove(ing);
                        setIsMovementModalOpen(true);
                      }}
                      className="text-xs font-bold text-[#800020] hover:bg-[#800020]/10 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-600" />
                      <span>Catat Pergerakan</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* History of Movements */
        <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            Riwayat Seluruh Pergerakan Bahan
          </h3>

          {isLoadingMovements ? (
            <div className="py-8 text-center text-xs text-slate-400">Memuat riwayat...</div>
          ) : movements.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Belum ada riwayat pergerakan bahan yang dicatat.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {movements.map((m) => (
                <div key={m.id} className="py-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{m.ingredientName}</span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        ({m.type})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {formatIndonesianDate(m.date, true)} {m.notes ? `· "${m.notes}"` : ''}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono font-bold text-sm tabular-nums ${
                        m.type === 'MASUK_PEMBELIAN'
                          ? 'text-emerald-700'
                          : m.type === 'RUSAK_TERBUANG'
                          ? 'text-rose-700'
                          : 'text-amber-800'
                      }`}
                    >
                      {m.type === 'MASUK_PEMBELIAN' ? '+' : '-'}
                      {m.quantity} {m.unit}
                    </div>
                    {m.totalAmount ? (
                      <div className="text-[10px] text-slate-400 font-mono">
                        {formatRupiah(m.totalAmount)}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Movement Modal */}
      <StockMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => {
          setIsMovementModalOpen(false);
          setSelectedIngredientForMove(null);
        }}
        onSuccess={() => {
          refreshData();
          if (activeSubTab === 'HISTORY') loadMovements();
        }}
        selectedIngredient={selectedIngredientForMove}
      />

      {/* Add Ingredient Form Modal */}
      <IngredientFormModal
        isOpen={isAddIngredientOpen}
        onClose={() => setIsAddIngredientOpen(false)}
        onSuccess={() => {
          refreshData();
        }}
      />

      {/* Transfer Stock Modal */}
      <TransferStockModal
        isOpen={isTransferStockOpen}
        onClose={() => {
          setIsTransferStockOpen(false);
          refreshData();
          if (activeSubTab === 'HISTORY') loadMovements();
        }}
      />
    </div>
  );
};
