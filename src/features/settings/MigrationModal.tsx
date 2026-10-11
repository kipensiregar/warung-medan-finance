/**
 * MIGRATION MODAL - Pemetaan Data Historis Single-Store ke Multi-Store
 * Warung Medan CT Catering
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { STORE_PALEMBANG_CENTER_ID, STORE_SUNGAI_BAUNG_ID, STORE_BAZAR_ID } from '../../types';
import { X, Database, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({ isOpen, onClose }) => {
  const { stores, unmappedRecordCount, mapLegacyData, showToast } = useApp();
  const [targetStoreId, setTargetStoreId] = useState(STORE_PALEMBANG_CENTER_ID);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleMigrate = async () => {
    try {
      setIsProcessing(true);
      const mapped = await mapLegacyData(targetStoreId);
      showToast(`Migrasi sukses: ${mapped} record berhasil dipetakan!`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses pemetaan', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#800020] px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Migrasi Data Multi-Store</h3>
              <p className="text-[11px] text-amber-200/80">Pemetaan data historis ke unit cabang</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Status Data Historis:</p>
              <p className="mt-0.5">
                Terdapat <strong>{unmappedRecordCount} record</strong> transaksi/stok yang belum terhubung ke identitas unit cabang spesifik.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pilih Unit Cabang untuk Memetakan Seluruh Record Ini:
            </label>
            <select
              value={targetStoreId}
              onChange={(e) => setTargetStoreId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) — {s.address}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Prinsip Keamanan Data:</p>
            <p>
              Sistem tidak menebak atau mengubah nominal transaksi. Setiap record lama akan dihubungkan ke ID cabang yang Anda tetapkan secara eksplisit, dengan catatan audit trail yang transparan.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleMigrate}
              disabled={isProcessing}
              className="flex-1 py-2.5 bg-[#800020] hover:bg-[#580016] text-amber-200 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? 'Memetakan Data...' : 'Konfirmasi Pemetaan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
