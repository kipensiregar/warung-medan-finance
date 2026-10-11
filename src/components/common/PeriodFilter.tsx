/**
 * PERIOD FILTER - Segmented Control for Accounting Periods
 * Warung Medan Finance
 */

import React, { useState } from 'react';
import { useApp, type PeriodType } from '../../context/AppContext';
import { Calendar, ChevronDown } from 'lucide-react';

export const PeriodFilter: React.FC = () => {
  const {
    period,
    setPeriod,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    dateRange
  } = useApp();

  const [showCustomModal, setShowCustomModal] = useState(false);

  const periods: { id: PeriodType; label: string }[] = [
    { id: 'today', label: 'Hari Ini' },
    { id: 'this_week', label: 'Minggu Ini' },
    { id: 'this_month', label: 'Bulan Ini' },
    { id: 'this_year', label: 'Tahun Ini' }
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Segmented Period Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl overflow-x-auto no-scrollbar">
        {periods.map((p) => {
          const isActive = period === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`flex-1 py-1.5 px-2.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap min-h-[36px] ${
                isActive
                  ? 'bg-white text-[#800020] shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          );
        })}

        {/* Custom Range Button */}
        <button
          onClick={() => {
            setPeriod('custom');
            setShowCustomModal(true);
          }}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 whitespace-nowrap min-h-[36px] ${
            period === 'custom'
              ? 'bg-white text-[#800020] shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Kustom</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </div>

      {/* Period Description Label */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500">
        <span>Periode Aktif:</span>
        <span className="font-semibold text-slate-700">{dateRange.label}</span>
      </div>

      {/* Modal Custom Date */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Pilih Rentang Tanggal Khusus
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[44px]"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setPeriod('custom');
                  setShowCustomModal(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#800020] text-xs font-bold text-white hover:bg-[#660019] shadow-sm min-h-[44px]"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
