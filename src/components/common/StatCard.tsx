/**
 * STAT CARD - Financial KPI Card with Tap Drill-Down
 * Warung Medan Finance
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { formatRupiah } from '../../utils/formatters';

interface StatCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  accent?: 'neutral' | 'emerald' | 'crimson' | 'amber' | 'maroon';
  icon?: React.ReactNode;
  onClick?: () => void;
  isNegativeAllowed?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  amount,
  subtitle,
  accent = 'neutral',
  icon,
  onClick
}) => {
  const getAccentStyles = () => {
    switch (accent) {
      case 'maroon':
        return {
          border: 'border-slate-200/90',
          amountColor: 'text-[#800020]',
          bgHover: 'hover:border-[#800020]/40'
        };
      case 'emerald':
        return {
          border: 'border-emerald-100',
          amountColor: 'text-emerald-700',
          bgHover: 'hover:border-emerald-300'
        };
      case 'crimson':
        return {
          border: 'border-rose-100',
          amountColor: 'text-rose-700',
          bgHover: 'hover:border-rose-300'
        };
      case 'amber':
        return {
          border: 'border-amber-100',
          amountColor: 'text-amber-800',
          bgHover: 'hover:border-amber-300'
        };
      default:
        return {
          border: 'border-slate-200/80',
          amountColor: 'text-slate-900',
          bgHover: 'hover:border-slate-300'
        };
    }
  };

  const style = getAccentStyles();

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-white rounded-2xl p-4 border ${style.border} ${style.bgHover} shadow-xs transition-all relative group text-left ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500 line-clamp-1">{title}</span>
        {icon && <div className="text-slate-400 shrink-0">{icon}</div>}
      </div>

      <div className={`text-xl font-bold font-mono tabular-nums tracking-tight mt-1.5 ${style.amountColor}`}>
        {formatRupiah(amount)}
      </div>

      {subtitle && (
        <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
          <span className="truncate">{subtitle}</span>
          {onClick && (
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-600 shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
          )}
        </div>
      )}
    </div>
  );
};
