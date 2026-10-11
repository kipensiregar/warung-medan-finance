/**
 * STORE SELECTOR - Segmented Switcher for Multi-Branch Units
 * Warung Medan Finance - Warung Medan CT Catering
 *
 * Supported Units:
 * 1. Semua Cabang (Konsolidasi)
 * 2. Sungai Baung (SB)
 * 3. Palembang Center (PC)
 * 4. Bazar (BZ)
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  CONSOLIDATED_STORE_ID,
  STORE_SUNGAI_BAUNG_ID,
  STORE_PALEMBANG_CENTER_ID,
  STORE_BAZAR_ID
} from '../../types';
import { Building2, Store as StoreIcon, Tent, Layers } from 'lucide-react';

interface StoreSelectorProps {
  className?: string;
  showIcon?: boolean;
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({ className = '', showIcon = true }) => {
  const { selectedStoreId, setSelectedStoreId } = useApp();

  const storeOptions = [
    {
      id: CONSOLIDATED_STORE_ID,
      name: 'Semua Cabang',
      code: 'ALL',
      shortName: 'Semua',
      icon: Layers
    },
    {
      id: STORE_SUNGAI_BAUNG_ID,
      name: 'Sungai Baung',
      code: 'SB',
      shortName: 'Sungai Baung',
      icon: StoreIcon
    },
    {
      id: STORE_PALEMBANG_CENTER_ID,
      name: 'Palembang Center',
      code: 'PC',
      shortName: 'Palembang',
      icon: Building2
    },
    {
      id: STORE_BAZAR_ID,
      name: 'Bazar',
      code: 'BZ',
      shortName: 'Bazar',
      icon: Tent
    }
  ];

  return (
    <div className={`w-full overflow-x-auto scrollbar-none py-1 ${className}`}>
      <div className="flex items-center gap-1.5 p-1 bg-amber-950/10 rounded-2xl border border-amber-900/15 min-w-max">
        {storeOptions.map((opt) => {
          const isSelected = selectedStoreId === opt.id;
          const Icon = opt.icon;

          return (
            <button
              key={opt.id}
              onClick={() => setSelectedStoreId(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-[#800020] text-amber-100 shadow-sm font-bold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {showIcon && <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-slate-500'}`} />}
              <span>{opt.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  isSelected ? 'bg-amber-400 text-amber-950' : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {opt.code}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
