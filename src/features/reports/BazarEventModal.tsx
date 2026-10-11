/**
 * BAZAR EVENT MODAL - Modul Kelola Event Bazar & Laporan Kinerja Finansial
 * Warung Medan CT Catering
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { bazarRepository } from '../../database/repositories/bazarRepository';
import { type BazarEvent, STORE_BAZAR_ID } from '../../types';
import { formatRupiah, formatIndonesianDate } from '../../utils/formatters';
import { X, Tent, Plus, Calendar, MapPin, Target, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface BazarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEventForReport?: (eventId: string) => void;
}

export const BazarEventModal: React.FC<BazarEventModalProps> = ({
  isOpen,
  onClose,
  onSelectEventForReport
}) => {
  const { bazarEvents, refreshData, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [isLoadingPerf, setIsLoadingPerf] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetRevenueInput, setTargetRevenueInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedEventId) {
      setIsLoadingPerf(true);
      bazarRepository
        .getEventPerformance(selectedEventId)
        .then((data) => setPerformanceData(data))
        .catch((err) => console.error(err))
        .finally(() => setIsLoadingPerf(false));
    } else {
      setPerformanceData(null);
    }
  }, [selectedEventId]);

  if (!isOpen) return null;

  const targetRev = Math.max(0, parseInt(targetRevenueInput.replace(/\D/g, ''), 10) || 0);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Nama event wajib diisi', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await bazarRepository.createEvent({
        storeId: STORE_BAZAR_ID,
        name: name.trim(),
        location: location.trim() || 'Lokasi Stand Bazar',
        startDate,
        endDate,
        targetRevenue: targetRev,
        notes: notes.trim(),
        status: 'ACTIVE'
      });
      showToast('Event bazar baru berhasil dibuat!', 'success');
      setName('');
      setLocation('');
      setTargetRevenueInput('');
      setNotes('');
      setActiveTab('LIST');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat event bazar', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#800020] px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl">
              <Tent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Modul Event Bazar</h3>
              <p className="text-[11px] text-amber-200/80">Laporan Keuangan & Laba Rugi per Event</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tab */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <button
            onClick={() => {
              setActiveTab('LIST');
              setSelectedEventId(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'LIST'
                ? 'bg-[#800020] text-amber-100 shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Daftar Event ({bazarEvents.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('CREATE');
              setSelectedEventId(null);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'CREATE'
                ? 'bg-[#800020] text-amber-100 shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Event Baru</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'LIST' && (
            <>
              {selectedEventId && performanceData ? (
                /* Detail Performance per Event */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedEventId(null)}
                      className="text-xs text-[#800020] font-bold hover:underline"
                    >
                      ← Kembali ke Daftar Event
                    </button>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      {performanceData.event.status}
                    </span>
                  </div>

                  <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/70">
                    <h4 className="font-extrabold text-base text-slate-900">{performanceData.event.name}</h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#800020]" />
                        {performanceData.event.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#800020]" />
                        {performanceData.event.startDate} s/d {performanceData.event.endDate}
                      </span>
                    </div>
                  </div>

                  {/* KPI Cards Event */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                      <span className="text-[11px] text-slate-500 font-medium">Omzet Bersih</span>
                      <p className="text-sm font-extrabold text-emerald-800 mt-0.5">
                        {formatRupiah(performanceData.netSales)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Kotor: {formatRupiah(performanceData.grossSales)}
                      </p>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                      <span className="text-[11px] text-slate-500 font-medium">Laba Bersih Event</span>
                      <p
                        className={`text-sm font-extrabold mt-0.5 ${
                          performanceData.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {formatRupiah(performanceData.netProfit)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Margin: {performanceData.netMarginPct}%
                      </p>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                      <span className="text-[11px] text-slate-500 font-medium">Beban Operasional</span>
                      <p className="text-sm font-extrabold text-rose-800 mt-0.5">
                        {formatRupiah(performanceData.totalExpenses)}
                      </p>
                      <p className="text-[10px] text-slate-400">Sewa stand, listrik, transport</p>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                      <span className="text-[11px] text-slate-500 font-medium">Biaya Bahan Terpakai</span>
                      <p className="text-sm font-extrabold text-amber-900 mt-0.5">
                        {formatRupiah(performanceData.stockCostUsed)}
                      </p>
                      <p className="text-[10px] text-slate-400">HPP bahan baku di stand</p>
                    </div>
                  </div>

                  {/* Target Achievement */}
                  {performanceData.event.targetRevenue > 0 && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-700">Target Omzet Event:</span>
                        <span className="font-bold text-slate-900">
                          {formatRupiah(performanceData.event.targetRevenue)}
                        </span>
                      </div>
                      {(() => {
                        const pct = Math.min(
                          100,
                          Math.round((performanceData.netSales / performanceData.event.targetRevenue) * 100)
                        );
                        return (
                          <div>
                            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#800020] h-full rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                              <span>Pencapaian: {pct}%</span>
                              <span>
                                {performanceData.netSales >= performanceData.event.targetRevenue
                                  ? 'Target Tercapai!'
                                  : `Kurang ${formatRupiah(
                                      performanceData.event.targetRevenue - performanceData.netSales
                                    )}`}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {onSelectEventForReport && (
                    <button
                      onClick={() => {
                        onSelectEventForReport(performanceData.event.id);
                        onClose();
                      }}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold rounded-xl text-xs transition-colors"
                    >
                      Buka Filter Laporan Khusus Event Ini
                    </button>
                  )}
                </div>
              ) : (
                /* List of All Events */
                <div className="space-y-3">
                  {bazarEvents.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      Belum ada event bazar tercatat. Klik <strong>Tambah Event Baru</strong> untuk memulai.
                    </div>
                  ) : (
                    bazarEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEventId(ev.id)}
                        className="p-4 bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">{ev.name}</h4>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                ev.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ev.status === 'COMPLETED'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ev.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#800020]" />
                              {ev.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#800020]" />
                              {ev.startDate}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Target:</span>
                          <span className="text-xs font-bold text-slate-800">
                            {formatRupiah(ev.targetRevenue || 0)}
                          </span>
                          <span className="text-[10px] text-[#800020] font-semibold block mt-1 hover:underline">
                            Lihat Kinerja →
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'CREATE' && (
            <form onSubmit={handleCreateEvent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Event Bazar *</label>
                <input
                  type="text"
                  placeholder="Contoh: Festival Danau Ranau 2026, Bazar Kuliner PIM"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-[#800020]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lokasi Stand / Venue</label>
                <input
                  type="text"
                  placeholder="Contoh: Atrium Palembang Indah Mall, Lapangan Ranau"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-[#800020]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tanggal Berakhir</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Omzet (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={targetRev > 0 ? formatRupiah(targetRev) : targetRevenueInput}
                  onChange={(e) => setTargetRevenueInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Detail Stan</label>
                <textarea
                  rows={2}
                  placeholder="Catatan menu khas yang dibawa, PIC stand, dsb."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="w-full py-3 bg-[#800020] hover:bg-[#580016] text-amber-200 font-bold rounded-2xl text-xs transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Event Bazar'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
