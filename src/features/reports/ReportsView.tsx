/**
 * REPORTS VIEW - Laporan Laba Rugi, Arus Kas, Perbandingan Cabang & Modul Bazar
 * Warung Medan CT Catering
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PeriodFilter } from '../../components/common/PeriodFilter';
import { StoreSelector } from '../../components/common/StoreSelector';
import { accountingService } from '../../services/accountingService';
import { debtRepository } from '../../database/repositories/debtRepository';
import { transactionRepository } from '../../database/repositories/transactionRepository';
import { salesRepository } from '../../database/repositories/salesRepository';
import { storeRepository } from '../../database/repositories/storeRepository';
import { bazarRepository } from '../../database/repositories/bazarRepository';
import { BazarEventModal } from './BazarEventModal';
import { TransferMoneyModal } from '../transactions/TransferMoneyModal';
import { TransferStockModal } from '../inventory/TransferStockModal';
import type {
  ProfitLossReport,
  CashFlowReport,
  Payable,
  Receivable,
  ExpenseCategory,
  DailySalesSummary,
  FinancialTransaction,
  StockMovement,
  StoreComparisonItem,
  BazarEvent
} from '../../types';
import {
  formatRupiah,
  formatIndonesianDate,
  generateCsv,
  downloadFile,
  printFinancialReport
} from '../../utils/formatters';
import {
  FileText,
  Printer,
  Download,
  DollarSign,
  Layers,
  Scale,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Plus,
  Building,
  Tent,
  ArrowRightLeft,
  Boxes,
  ShieldCheck,
  Calendar,
  MapPin
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { dateRange, selectedStoreId, stores, bazarEvents, accounts, refreshData, showToast } = useApp();

  type ReportTab = 'PNL' | 'CASHFLOW' | 'COMPARISON' | 'BAZAR' | 'DEBTS' | 'AUDIT_TRANSFER' | 'HISTORY';
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('PNL');
  const [selectedBazarEventId, setSelectedBazarEventId] = useState<string>('');

  const [pnlReport, setPnlReport] = useState<ProfitLossReport | null>(null);
  const [cashFlowReport, setCashFlowReport] = useState<CashFlowReport | null>(null);
  const [comparisons, setComparisons] = useState<StoreComparisonItem[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [allSales, setAllSales] = useState<DailySalesSummary[]>([]);
  const [allTransactions, setAllTransactions] = useState<FinancialTransaction[]>([]);
  const [transferAudit, setTransferAudit] = useState<{
    moneyTransfers: FinancialTransaction[];
    stockTransfers: StockMovement[];
  }>({ moneyTransfers: [], stockTransfers: [] });
  const [bazarPerformanceList, setBazarPerformanceList] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isBazarModalOpen, setIsBazarModalOpen] = useState(false);
  const [isTransferMoneyOpen, setIsTransferMoneyOpen] = useState(false);
  const [isTransferStockOpen, setIsTransferStockOpen] = useState(false);

  // Settlement modal for payables or receivables
  const [settlementTarget, setSettlementTarget] = useState<{
    type: 'PAYABLE' | 'RECEIVABLE';
    item: Payable | Receivable;
  } | null>(null);
  const [settleAmountInput, setSettleAmountInput] = useState('');
  const [settleAccountId, setSettleAccountId] = useState(accounts[0]?.id || '');

  // Add new payable / receivable modal
  const [isAddPayableOpen, setIsAddPayableOpen] = useState(false);
  const [isAddReceivableOpen, setIsAddReceivableOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newAmountInput, setNewAmountInput] = useState('');
  const [newDueDate, setNewDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [newNotes, setNewNotes] = useState('');

  const isConsolidated = selectedStoreId === 'ALL';
  const currentStore = stores.find((s) => s.id === selectedStoreId);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const [pnl, cf, cmps, pays, recs, allS, allT, audits] = await Promise.all([
        accountingService.calculateProfitLoss(
          dateRange.startDate,
          dateRange.endDate,
          dateRange.label,
          selectedStoreId,
          selectedStoreId === 'store_bazar' && selectedBazarEventId ? selectedBazarEventId : undefined
        ),
        accountingService.calculateCashFlow(
          dateRange.startDate,
          dateRange.endDate,
          dateRange.label,
          selectedStoreId
        ),
        accountingService.getStoreComparison(dateRange.startDate, dateRange.endDate),
        debtRepository.getAllPayables(selectedStoreId),
        debtRepository.getAllReceivables(selectedStoreId),
        salesRepository.getAll(selectedStoreId),
        transactionRepository.getAll(selectedStoreId),
        storeRepository.getInterStoreTransferAudit(dateRange.startDate, dateRange.endDate)
      ]);

      setPnlReport(pnl);
      setCashFlowReport(cf);
      setComparisons(cmps);
      setPayables(pays);
      setReceivables(recs);
      setAllSales(allS);
      setAllTransactions(allT);
      setTransferAudit(audits);

      // Fetch Bazar Performance for all events
      if (bazarEvents.length > 0) {
        const perfPromises = bazarEvents.map((ev) => bazarRepository.getEventPerformance(ev.id));
        const perfResults = await Promise.all(perfPromises);
        setBazarPerformanceList(perfResults);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [dateRange, selectedStoreId, selectedBazarEventId]);

  // Handle debt settlement (cicilan / lunas)
  const handleSettleDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementTarget) return;

    const amount = Math.max(0, parseInt(settleAmountInput.replace(/\D/g, ''), 10) || 0);
    if (amount <= 0) {
      showToast('Nominal pembayaran harus lebih dari 0', 'error');
      return;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      if (settlementTarget.type === 'PAYABLE') {
        const pay = settlementTarget.item as Payable;
        await transactionRepository.createTransaction({
          storeId: pay.storeId,
          date: today,
          type: 'PEMBAYARAN_UTANG',
          category: pay.category,
          amount,
          sourceAccountId: settleAccountId,
          recipientOrSupplier: pay.supplierName,
          paymentMethod: 'Transfer Bank',
          notes: `Pembayaran cicilan/pelunasan utang: ${pay.supplierName}`,
          relatedPayableId: pay.id
        });
        showToast(`Pembayaran utang ke ${pay.supplierName} berhasil dicatat!`, 'success');
      } else {
        const rec = settlementTarget.item as Receivable;
        await transactionRepository.createTransaction({
          storeId: rec.storeId,
          date: today,
          type: 'PENERIMAAN_PIUTANG',
          category: 'Ekuitas Pemilik',
          amount,
          sourceAccountId: settleAccountId,
          recipientOrSupplier: rec.customerName,
          paymentMethod: 'Transfer Bank',
          notes: `Penerimaan pelunasan tagihan: ${rec.customerName}`,
          relatedReceivableId: rec.id
        });
        showToast(`Penerimaan piutang dari ${rec.customerName} berhasil dicatat!`, 'success');
      }

      setSettlementTarget(null);
      setSettleAmountInput('');
      await loadReports();
      await refreshData();
    } catch (err: any) {
      showToast(`Gagal: ${err.message}`, 'error');
    }
  };

  // Add new payable
  const handleCreatePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(newAmountInput.replace(/\D/g, ''), 10) || 0;
    if (!newSupplier.trim() || amount <= 0) {
      showToast('Harap isi supplier dan nominal dengan benar', 'error');
      return;
    }

    try {
      await debtRepository.createPayable({
        storeId: selectedStoreId !== 'ALL' ? selectedStoreId : 'store_palembang_center',
        supplierName: newSupplier.trim(),
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: newDueDate,
        totalAmount: amount,
        category: 'Bahan Baku',
        notes: newNotes.trim() || undefined
      });

      showToast('Utang supplier berhasil dicatat!', 'success');
      setIsAddPayableOpen(false);
      setNewSupplier('');
      setNewAmountInput('');
      setNewNotes('');
      await loadReports();
    } catch (err: any) {
      showToast(`Gagal: ${err.message}`, 'error');
    }
  };

  // Add new receivable
  const handleCreateReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(newAmountInput.replace(/\D/g, ''), 10) || 0;
    if (!newCustomer.trim() || amount <= 0) {
      showToast('Harap isi pelanggan dan nominal dengan benar', 'error');
      return;
    }

    try {
      await debtRepository.createReceivable({
        storeId: selectedStoreId !== 'ALL' ? selectedStoreId : 'store_palembang_center',
        customerName: newCustomer.trim(),
        invoiceNumber: `INV/CT-${Date.now().toString().slice(-4)}`,
        orderDate: new Date().toISOString().slice(0, 10),
        dueDate: newDueDate,
        totalAmount: amount,
        channel: 'Catering',
        notes: newNotes.trim() || undefined
      });

      showToast('Tagihan piutang catering berhasil dicatat!', 'success');
      setIsAddReceivableOpen(false);
      setNewCustomer('');
      setNewAmountInput('');
      setNewNotes('');
      await loadReports();
    } catch (err: any) {
      showToast(`Gagal: ${err.message}`, 'error');
    }
  };

  // Print P&L to PDF
  const handlePrintPnl = () => {
    if (!pnlReport) return;

    const unitTitle = isConsolidated
      ? 'KONSOLIDASIAN (SEMUA UNIT CABANG)'
      : `CABANG: ${currentStore?.name.toUpperCase() || 'WARUNG MEDAN'}`;

    const expenseRowsHtml = Object.entries(pnlReport.operatingExpenses)
      .filter(([_, val]) => val > 0)
      .map(
        ([cat, val]) =>
          `<tr><td style="padding-left: 20px;">${cat}</td><td class="text-right">${formatRupiah(val)}</td></tr>`
      )
      .join('');

    const htmlContent = `
      <div style="margin-bottom: 12px; font-weight: bold; color: #800020;">
        ${unitTitle}
      </div>
      <div style="margin-bottom: 20px;">
        <strong>Periode Laporan:</strong> ${pnlReport.periodLabel} (${pnlReport.startDate} s/d ${pnlReport.endDate})
      </div>
      <table>
        <thead>
          <tr>
            <th>Pos Akun Keuangan</th>
            <th class="text-right">Nominal (Rupiah)</th>
          </tr>
        </thead>
        <tbody>
          <tr class="bg-highlight">
            <td><strong>1. PENDAPATAN USAHA</strong></td>
            <td></td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Penjualan Kotor</td>
            <td class="text-right">${formatRupiah(pnlReport.grossSales)}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Potongan Diskon Penjualan</td>
            <td class="text-right">(${formatRupiah(pnlReport.discounts)})</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Refund & Retur</td>
            <td class="text-right">(${formatRupiah(pnlReport.refunds)})</td>
          </tr>
          <tr class="text-bold">
            <td>TOTAL PENJUALAN BERSIH</td>
            <td class="text-right">${formatRupiah(pnlReport.netSales)}</td>
          </tr>

          <tr class="bg-highlight">
            <td><strong>2. HARGA POKOK PENJUALAN (HPP)</strong></td>
            <td></td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Persediaan Awal Bahan</td>
            <td class="text-right">${formatRupiah(pnlReport.beginningInventory)}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Pembelian Bahan untuk Persediaan</td>
            <td class="text-right">${formatRupiah(pnlReport.purchasesForInventory)}</td>
          </tr>
          <tr>
            <td style="padding-left: 20px;">Persediaan Akhir Bahan</td>
            <td class="text-right">(${formatRupiah(pnlReport.endingInventory)})</td>
          </tr>
          <tr class="text-bold">
            <td>TOTAL HARGA POKOK PENJUALAN (HPP)</td>
            <td class="text-right">${formatRupiah(pnlReport.costOfGoodsSold)}</td>
          </tr>

          <tr class="bg-highlight text-bold" style="background-color: #f1f5f9;">
            <td>LABA KOTOR (GROSS PROFIT)</td>
            <td class="text-right" style="color: #047857;">${formatRupiah(pnlReport.grossProfit)} (${pnlReport.grossMarginPct}%)</td>
          </tr>

          <tr class="bg-highlight">
            <td><strong>3. BEBAN OPERASIONAL</strong></td>
            <td></td>
          </tr>
          ${expenseRowsHtml || '<tr><td style="padding-left: 20px;">Tidak ada beban operasional</td><td class="text-right">Rp0</td></tr>'}
          <tr class="text-bold">
            <td>TOTAL BEBAN OPERASIONAL</td>
            <td class="text-right">(${formatRupiah(pnlReport.totalOperatingExpenses)})</td>
          </tr>

          ${
            isConsolidated
              ? `<tr><td style="padding-left: 20px; font-style: italic; color: #64748b;">(Transaksi internal antar cabang telah dieliminasi: Rp0)</td><td class="text-right font-mono text-slate-500">Rp0</td></tr>`
              : ''
          }

          <tr class="bg-highlight text-bold" style="font-size: 13pt; background-color: #f8fafc; border-top: 2px solid #800020;">
            <td>LABA BERSIH USAHA (NET PROFIT)</td>
            <td class="text-right" style="color: ${pnlReport.netProfit >= 0 ? '#047857' : '#b91c1c'};">
              ${formatRupiah(pnlReport.netProfit)} (${pnlReport.netMarginPct}%)
            </td>
          </tr>
        </tbody>
      </table>
    `;

    printFinancialReport(`Laporan Laba Rugi - ${unitTitle}`, htmlContent);
  };

  // Export CSV
  const handleExportPnlCsv = () => {
    if (!pnlReport) return;
    const unitTitle = isConsolidated ? 'Konsolidasi_Semua_Cabang' : currentStore?.code || 'Cabang';

    const headers = ['Pos Akun', 'Nilai (IDR)', 'Keterangan'];
    const rows = [
      ['Unit Usaha', isConsolidated ? 'Semua Cabang' : currentStore?.name || '', ''],
      ['Periode', `${pnlReport.startDate} s/d ${pnlReport.endDate}`, pnlReport.periodLabel],
      ['Penjualan Kotor', pnlReport.grossSales, 'Gross Sales'],
      ['Diskon Penjualan', -pnlReport.discounts, 'Sales Discounts'],
      ['Refund & Retur', -pnlReport.refunds, 'Sales Returns'],
      ['Penjualan Bersih', pnlReport.netSales, 'Net Sales'],
      ['Persediaan Awal', pnlReport.beginningInventory, 'Beginning Inventory'],
      ['Pembelian Bahan', pnlReport.purchasesForInventory, 'Inventory Purchases'],
      ['Persediaan Akhir', -pnlReport.endingInventory, 'Ending Inventory'],
      ['HPP Bahan Baku', pnlReport.costOfGoodsSold, 'COGS SAK EMKM'],
      ['Laba Kotor', pnlReport.grossProfit, `Margin: ${pnlReport.grossMarginPct}%`],
      ...Object.entries(pnlReport.operatingExpenses).map(([cat, val]) => [
        `Beban Operasional: ${cat}`,
        -val,
        'Operating Expense'
      ]),
      ['Total Beban Operasional', -pnlReport.totalOperatingExpenses, 'Total OpEx'],
      ['Laba Bersih', pnlReport.netProfit, `Net Margin: ${pnlReport.netMarginPct}%`]
    ];

    const csvContent = generateCsv(headers, rows);
    downloadFile(csvContent, `Laba_Rugi_${unitTitle}_${pnlReport.startDate}_${pnlReport.endDate}.csv`, 'text/csv');
    showToast('Laporan Laba Rugi berhasil diekspor ke CSV!', 'success');
  };

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto">
      {/* 1. Unit Cabang Switcher */}
      <div className="bg-white p-2.5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between px-2 pb-1.5 text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            {isConsolidated ? (
              <Layers className="w-4 h-4 text-[#800020]" />
            ) : currentStore?.isBazarUnit ? (
              <Tent className="w-4 h-4 text-amber-700" />
            ) : (
              <Building className="w-4 h-4 text-[#800020]" />
            )}
            <span>Pilih Unit Laporan:</span>
          </span>
          <span className="text-[11px] font-semibold text-slate-500">
            {isConsolidated ? 'Konsolidasian Gabungan' : currentStore?.name}
          </span>
        </div>
        <StoreSelector />
      </div>

      {/* 2. Period Filter */}
      <PeriodFilter />

      {/* Optional Bazar Event Filter (Shown when Bazar is chosen) */}
      {selectedStoreId === 'store_bazar' && bazarEvents.length > 0 && (
        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Tent className="w-4 h-4 text-[#800020] shrink-0" />
            <span className="font-semibold text-amber-900">Filter Event Bazar:</span>
          </div>
          <select
            value={selectedBazarEventId}
            onChange={(e) => setSelectedBazarEventId(e.target.value)}
            className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900"
          >
            <option value="">-- Semua Event Bazar --</option>
            {bazarEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.startDate})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 3. Sub Tabs for Reports */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveReportTab('PNL')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'PNL'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Laba Rugi (P&L)
        </button>
        <button
          onClick={() => setActiveReportTab('CASHFLOW')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'CASHFLOW'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Arus Kas
        </button>
        <button
          onClick={() => setActiveReportTab('COMPARISON')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'COMPARISON'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Perbandingan Cabang
        </button>
        <button
          onClick={() => setActiveReportTab('BAZAR')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'BAZAR'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Modul Bazar
        </button>
        <button
          onClick={() => setActiveReportTab('DEBTS')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'DEBTS'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Utang & Piutang
        </button>
        <button
          onClick={() => setActiveReportTab('AUDIT_TRANSFER')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'AUDIT_TRANSFER'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Transfer Antar-Cabang
        </button>
        <button
          onClick={() => setActiveReportTab('HISTORY')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeReportTab === 'HISTORY'
              ? 'bg-white text-[#800020] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Histori & Tren
        </button>
      </div>

      {/* Action Bar (Print / Export) */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-500">
          Unit: <strong className="text-slate-800">{isConsolidated ? 'Semua Cabang (Konsolidasi)' : currentStore?.name}</strong>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintPnl}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#800020]" />
            <span>Cetak PDF</span>
          </button>
          <button
            onClick={handleExportPnlCsv}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* REPORT CONTENT */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400">Menghitung laporan keuangan cabang...</div>
      ) : activeReportTab === 'PNL' && pnlReport ? (
        /* ================= LABA RUGI REPORT ================= */
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Laporan Laba Rugi {isConsolidated ? 'Konsolidasian' : currentStore?.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Standar SAK EMKM · Periode {pnlReport.periodLabel}
              </p>
            </div>
            {isConsolidated && (
              <span className="text-[11px] px-2.5 py-1 bg-amber-100 text-amber-900 font-bold rounded-xl border border-amber-300">
                Konsolidasi 3 Cabang
              </span>
            )}
          </div>

          {/* Section 1: Penjualan Bersih */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              1. Penjualan & Pendapatan Usaha
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Penjualan Kotor (Gross Sales)</span>
                <span className="font-mono tabular-nums font-semibold">{formatRupiah(pnlReport.grossSales)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Diskon Penjualan</span>
                <span className="font-mono tabular-nums text-rose-600">-{formatRupiah(pnlReport.discounts)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Refund & Retur</span>
                <span className="font-mono tabular-nums text-rose-600">-{formatRupiah(pnlReport.refunds)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                <span>Penjualan Bersih (Net Sales)</span>
                <span className="font-mono tabular-nums text-emerald-700">{formatRupiah(pnlReport.netSales)}</span>
              </div>
            </div>
          </div>

          {/* Section 2: HPP */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              2. Harga Pokok Penjualan (HPP Bahan Baku)
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Persediaan Awal Bahan Baku</span>
                <span className="font-mono tabular-nums">{formatRupiah(pnlReport.beginningInventory)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Pembelian Bahan Bersih</span>
                <span className="font-mono tabular-nums">+{formatRupiah(pnlReport.purchasesForInventory)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Persediaan Akhir Bahan Baku</span>
                <span className="font-mono tabular-nums">-{formatRupiah(pnlReport.endingInventory)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                <span>Total HPP (Bahan Terpakai di Dapur)</span>
                <span className="font-mono tabular-nums text-amber-800">{formatRupiah(pnlReport.costOfGoodsSold)}</span>
              </div>
            </div>
          </div>

          {/* Gross Profit Banner */}
          <div className="p-3.5 bg-[#800020]/10 rounded-2xl border border-[#800020]/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#800020] uppercase">Laba Kotor Usaha</span>
              <div className="text-[11px] text-slate-600 mt-0.5">Gross Margin: {pnlReport.grossMarginPct}%</div>
            </div>
            <div className="font-mono text-base font-extrabold text-[#800020]">
              {formatRupiah(pnlReport.grossProfit)}
            </div>
          </div>

          {/* Section 3: Beban Operasional */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              3. Beban Operasional Usaha
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 space-y-2 text-xs">
              {Object.entries(pnlReport.operatingExpenses).map(([category, amount]) => {
                if (amount === 0) return null;
                return (
                  <div key={category} className="flex justify-between text-slate-600">
                    <span>{category}</span>
                    <span className="font-mono tabular-nums text-rose-700">-{formatRupiah(amount)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                <span>Total Beban Operasional</span>
                <span className="font-mono tabular-nums text-rose-700">
                  -{formatRupiah(pnlReport.totalOperatingExpenses)}
                </span>
              </div>
            </div>
          </div>

          {/* Elimination details for Consolidated report */}
          {isConsolidated && (
            <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-[#800020]" />
                <span>Eliminasi Transaksi Internal Antar-Cabang:</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Transfer dana antar cabang senilai{' '}
                <strong>{formatRupiah(pnlReport.eliminatedInternalTransfers || 0)}</strong> serta pemindahan stok fisik internal telah dieliminasi dari total omzet dan beban usaha gabungan.
              </p>
            </div>
          )}

          {/* Net Profit Final */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              pnlReport.netProfit >= 0
                ? 'bg-emerald-50/80 border-emerald-200'
                : 'bg-rose-50/80 border-rose-200'
            }`}
          >
            <div>
              <span
                className={`text-xs font-bold uppercase tracking-wide ${
                  pnlReport.netProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'
                }`}
              >
                Laba Bersih Usaha (Net Profit)
              </span>
              <div className="text-[11px] text-slate-600 mt-0.5">
                Margin Bersih: {pnlReport.netMarginPct}%
              </div>
            </div>
            <div
              className={`font-mono text-lg font-extrabold ${
                pnlReport.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatRupiah(pnlReport.netProfit)}
            </div>
          </div>
        </div>
      ) : activeReportTab === 'CASHFLOW' && cashFlowReport ? (
        /* ================= CASH FLOW REPORT ================= */
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Laporan Arus Kas (Cash Flow Statement)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isConsolidated ? 'Konsolidasi Semua Cabang' : currentStore?.name} · Periode {cashFlowReport.periodLabel}
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700">Saldo Awal Kas & Bank Periode:</span>
            <span className="font-mono font-bold text-slate-900">{formatRupiah(cashFlowReport.startingCash)}</span>
          </div>

          {/* Arus Kas Masuk */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
              Arus Kas Masuk (Inflow)
            </div>
            <div className="bg-emerald-50/40 p-3 rounded-2xl border border-emerald-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Penerimaan Kas dari Penjualan</span>
                <span className="font-mono tabular-nums text-emerald-700 font-semibold">
                  +{formatRupiah(cashFlowReport.cashInflowFromSales)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Penerimaan Pelunasan Piutang</span>
                <span className="font-mono tabular-nums text-emerald-700">
                  +{formatRupiah(cashFlowReport.cashInflowFromReceivables)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Setoran Modal Pemilik</span>
                <span className="font-mono tabular-nums text-emerald-700">
                  +{formatRupiah(cashFlowReport.cashInflowFromCapital)}
                </span>
              </div>
              {!isConsolidated && (cashFlowReport.cashInflowFromBranchTransfers || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Transfer Masuk dari Cabang Lain</span>
                  <span className="font-mono tabular-nums text-emerald-700">
                    +{formatRupiah(cashFlowReport.cashInflowFromBranchTransfers || 0)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-emerald-200 font-bold text-emerald-950">
                <span>Total Arus Kas Masuk</span>
                <span className="font-mono tabular-nums">+{formatRupiah(cashFlowReport.totalCashInflow)}</span>
              </div>
            </div>
          </div>

          {/* Arus Kas Keluar */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-rose-900 uppercase tracking-wide">
              Arus Kas Keluar (Outflow)
            </div>
            <div className="bg-rose-50/40 p-3 rounded-2xl border border-rose-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Pengeluaran Biaya Operasional</span>
                <span className="font-mono tabular-nums text-rose-700">
                  -{formatRupiah(cashFlowReport.cashOutflowOperating)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Pembelian Bahan Baku Tunai</span>
                <span className="font-mono tabular-nums text-rose-700">
                  -{formatRupiah(cashFlowReport.cashOutflowInventoryPurchases)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Pembayaran Utang Supplier</span>
                <span className="font-mono tabular-nums text-rose-700">
                  -{formatRupiah(cashFlowReport.cashOutflowDebtPayments)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Pembelian Aset Usaha</span>
                <span className="font-mono tabular-nums text-rose-700">
                  -{formatRupiah(cashFlowReport.cashOutflowAssetPurchases)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Prive Pemilik (Tarik Modal)</span>
                <span className="font-mono tabular-nums text-rose-700">
                  -{formatRupiah(cashFlowReport.cashOutflowPrive)}
                </span>
              </div>
              {!isConsolidated && (cashFlowReport.cashOutflowToBranchTransfers || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Transfer Keluar ke Cabang Lain</span>
                  <span className="font-mono tabular-nums text-rose-700">
                    -{formatRupiah(cashFlowReport.cashOutflowToBranchTransfers || 0)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-rose-200 font-bold text-rose-950">
                <span>Total Arus Kas Keluar</span>
                <span className="font-mono tabular-nums">-{formatRupiah(cashFlowReport.totalCashOutflow)}</span>
              </div>
            </div>
          </div>

          {/* Net Cash Flow & Ending Cash */}
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex justify-between items-center text-xs">
            <span className="font-bold text-amber-900">Arus Kas Bersih (Net Cash Flow):</span>
            <span
              className={`font-mono font-bold ${
                cashFlowReport.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {cashFlowReport.netCashFlow >= 0 ? '+' : ''}
              {formatRupiah(cashFlowReport.netCashFlow)}
            </span>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center">
            <div>
              <span className="text-xs font-semibold text-slate-400">Saldo Akhir Kas & Bank</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Saldo Awal + Net Cash Flow</p>
            </div>
            <span className="font-mono text-lg font-extrabold text-amber-300">
              {formatRupiah(cashFlowReport.endingCash)}
            </span>
          </div>
        </div>
      ) : activeReportTab === 'COMPARISON' ? (
        /* ================= STORE COMPARISON TAB ================= */
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Perbandingan Kinerja Antar-Cabang (Multi-Store)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluasi komparatif unit Sungai Baung, Palembang Center, dan Bazar
              </p>
            </div>

            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                    <th className="py-2.5 px-3 rounded-l-xl">Indikator Finansial</th>
                    <th className="py-2.5 px-3 text-right">Sungai Baung (SB)</th>
                    <th className="py-2.5 px-3 text-right">Palembang Center (PC)</th>
                    <th className="py-2.5 px-3 text-right">Bazar (BZ)</th>
                    <th className="py-2.5 px-3 text-right rounded-r-xl font-bold text-slate-900">Total Gabungan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const sb = comparisons.find((c) => c.storeId === 'store_sungai_baung');
                    const pc = comparisons.find((c) => c.storeId === 'store_palembang_center');
                    const bz = comparisons.find((c) => c.storeId === 'store_bazar');

                    const totalSales = (sb?.netSales || 0) + (pc?.netSales || 0) + (bz?.netSales || 0);
                    const totalCogs = (sb?.cogs || 0) + (pc?.cogs || 0) + (bz?.cogs || 0);
                    const totalGross = totalSales - totalCogs;
                    const totalExpenses = (sb?.operatingExpenses || 0) + (pc?.operatingExpenses || 0) + (bz?.operatingExpenses || 0);
                    const totalNet = totalGross - totalExpenses;
                    const totalMargin = totalSales > 0 ? Number(((totalNet / totalSales) * 100).toFixed(1)) : 0;
                    const totalCash = (sb?.activeAccountsCash || 0) + (pc?.activeAccountsCash || 0) + (bz?.activeAccountsCash || 0);
                    const totalStock = (sb?.inventoryValuation || 0) + (pc?.inventoryValuation || 0) + (bz?.inventoryValuation || 0);

                    return (
                      <>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">1. Penjualan Bersih (Omzet)</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatRupiah(sb?.netSales || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatRupiah(pc?.netSales || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatRupiah(bz?.netSales || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-900 bg-emerald-50/50">
                            {formatRupiah(totalSales)}
                          </td>
                        </tr>

                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">2. HPP Bahan Terpakai</td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-800">{formatRupiah(sb?.cogs || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-800">{formatRupiah(pc?.cogs || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-800">{formatRupiah(bz?.cogs || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900 bg-amber-50/50">
                            {formatRupiah(totalCogs)}
                          </td>
                        </tr>

                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">3. Beban Operasional Usaha</td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-700">{formatRupiah(sb?.operatingExpenses || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-700">{formatRupiah(pc?.operatingExpenses || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-700">{formatRupiah(bz?.operatingExpenses || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-900 bg-rose-50/50">
                            {formatRupiah(totalExpenses)}
                          </td>
                        </tr>

                        <tr className="bg-slate-50/80 font-bold">
                          <td className="py-2.5 px-3 text-slate-900">4. Laba Bersih (Net Profit)</td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono ${
                              (sb?.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {formatRupiah(sb?.netProfit || 0)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono ${
                              (pc?.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {formatRupiah(pc?.netProfit || 0)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono ${
                              (bz?.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {formatRupiah(bz?.netProfit || 0)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-extrabold ${
                              totalNet >= 0 ? 'text-emerald-800 bg-emerald-100/60' : 'text-rose-800 bg-rose-100/60'
                            }`}
                          >
                            {formatRupiah(totalNet)}
                          </td>
                        </tr>

                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">5. Margin Laba Bersih (%)</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800">{sb?.netMarginPct || 0}%</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800">{pc?.netMarginPct || 0}%</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800">{bz?.netMarginPct || 0}%</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 bg-slate-100/80">{totalMargin}%</td>
                        </tr>

                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">6. Saldo Kas & Bank Aktif</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(sb?.activeAccountsCash || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(pc?.activeAccountsCash || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(bz?.activeAccountsCash || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold bg-slate-50">{formatRupiah(totalCash)}</td>
                        </tr>

                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">7. Nilai Persediaan Stok</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(sb?.inventoryValuation || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(pc?.inventoryValuation || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(bz?.inventoryValuation || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold bg-slate-50">{formatRupiah(totalStock)}</td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeReportTab === 'BAZAR' ? (
        /* ================= BAZAR MODULE TAB ================= */
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Modul & Laporan Kinerja Event Bazar
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rincian pemasukan, biaya operasional, stok terpakai, dan laba rugi per festival
                </p>
              </div>
              <button
                onClick={() => setIsBazarModalOpen(true)}
                className="px-3 py-1.5 bg-[#800020] hover:bg-[#580016] text-amber-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Event</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bazarPerformanceList.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-xs text-slate-400">
                  Belum ada event bazar tercatat. Klik Tambah Event untuk memulai.
                </div>
              ) : (
                bazarPerformanceList.map((perf) => (
                  <div
                    key={perf.event.id}
                    className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{perf.event.name}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#800020]" />
                            {perf.event.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#800020]" />
                            {perf.event.startDate}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {perf.event.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-white rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 block">Omzet Bersih</span>
                        <span className="font-mono font-bold text-emerald-800">{formatRupiah(perf.netSales)}</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 block">Biaya Stand & Operasional</span>
                        <span className="font-mono font-bold text-rose-700">{formatRupiah(perf.totalExpenses)}</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 block">Bahan Baku Terpakai</span>
                        <span className="font-mono font-bold text-amber-800">{formatRupiah(perf.stockCostUsed)}</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 block">Laba Bersih Event</span>
                        <span
                          className={`font-mono font-bold ${
                            perf.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {formatRupiah(perf.netProfit)} ({perf.netMarginPct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : activeReportTab === 'AUDIT_TRANSFER' ? (
        /* ================= AUDIT TRANSFER INTERNAL ================= */
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Riwayat Audit Transfer Antar-Cabang
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar transaksi kas dan perpindahan stok internal yang dieliminasi pada konsolidasi
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsTransferMoneyOpen(true)}
                  className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  + Transfer Kas
                </button>
                <button
                  onClick={() => setIsTransferStockOpen(true)}
                  className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  + Transfer Stok
                </button>
              </div>
            </div>

            {/* Money Transfers */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                <span>1. Transfer Uang Antar-Cabang ({transferAudit.moneyTransfers.length})</span>
              </h4>
              {transferAudit.moneyTransfers.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-400">
                  Belum ada catatan transfer uang antar cabang.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 bg-slate-50/50 rounded-2xl p-2 border border-slate-200/60 text-xs">
                  {transferAudit.moneyTransfers.map((tx) => (
                    <div key={tx.id} className="py-2.5 px-2 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800">
                          {tx.notes || 'Transfer Kas Antar-Cabang'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatIndonesianDate(tx.date)} · Akun: {tx.paymentMethod}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-indigo-700 text-sm">
                        {formatRupiah(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stock Transfers */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-amber-700" />
                <span>2. Transfer Stok Bahan Baku ({transferAudit.stockTransfers.length})</span>
              </h4>
              {transferAudit.stockTransfers.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-400">
                  Belum ada catatan transfer stok bahan antar cabang.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 bg-slate-50/50 rounded-2xl p-2 border border-slate-200/60 text-xs">
                  {transferAudit.stockTransfers.map((mov) => (
                    <div key={mov.id} className="py-2.5 px-2 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800">
                          {mov.ingredientName} ({mov.quantity} {mov.unit})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatIndonesianDate(mov.date)} · {mov.notes || mov.type}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-amber-900 text-sm">
                        {formatRupiah(mov.totalAmount || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeReportTab === 'DEBTS' ? (
        /* ================= DEBTS TAB ================= */
        <div className="space-y-4">
          {/* Utang Supplier */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Utang Supplier</h3>
                <p className="text-xs text-slate-500 mt-0.5">Kewajiban pembelian bahan baku yang belum lunas</p>
              </div>
              <button
                onClick={() => setIsAddPayableOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Utang</span>
              </button>
            </div>

            {payables.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">Tidak ada catatan utang supplier.</div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {payables.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{p.supplierName}</div>
                      <div className="text-[11px] text-slate-500">
                        Jatuh Tempo: {formatIndonesianDate(p.dueDate)} · Total: {formatRupiah(p.totalAmount)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-mono font-bold text-rose-700">{formatRupiah(p.remainingAmount)}</div>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            p.status === 'LUNAS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'SEBAGIAN'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      {p.status !== 'LUNAS' && (
                        <button
                          onClick={() => {
                            setSettlementTarget({ type: 'PAYABLE', item: p });
                            setSettleAmountInput(p.remainingAmount.toString());
                          }}
                          className="px-3 py-1.5 bg-[#800020] text-amber-200 rounded-xl text-xs font-bold hover:bg-[#580016] cursor-pointer"
                        >
                          Bayar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Piutang Pelanggan Catering */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Piutang Pelanggan Catering</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tagihan pesanan catering yang belum dilunasi</p>
              </div>
              <button
                onClick={() => setIsAddReceivableOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Piutang</span>
              </button>
            </div>

            {receivables.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">Tidak ada catatan piutang pelanggan.</div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {receivables.map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{r.customerName}</div>
                      <div className="text-[11px] text-slate-500">
                        {r.invoiceNumber} · Jatuh Tempo: {formatIndonesianDate(r.dueDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-700">{formatRupiah(r.remainingAmount)}</div>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            r.status === 'LUNAS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'SEBAGIAN'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      {r.status !== 'LUNAS' && (
                        <button
                          onClick={() => {
                            setSettlementTarget({ type: 'RECEIVABLE', item: r });
                            setSettleAmountInput(r.remainingAmount.toString());
                          }}
                          className="px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 cursor-pointer"
                        >
                          Terima Kas
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= HISTORY TAB ================= */
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Histori Transaksi Keuangan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar seluruh rekap penjualan dan pengeluaran {isConsolidated ? 'semua cabang' : currentStore?.name}
            </p>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {allSales.slice(0, 30).map((s) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">
                    Penjualan {s.channel} · {s.paymentMethod}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {formatIndonesianDate(s.date)} · Ref: {s.referenceNumber || '-'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-700">+{formatRupiah(s.netSales)}</div>
                  {s.isVoided && <span className="text-[10px] text-rose-600 font-bold">DIBATALKAN</span>}
                </div>
              </div>
            ))}

            {allTransactions.slice(0, 30).map((t) => (
              <div key={t.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">
                    {t.category} ({t.type})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {formatIndonesianDate(t.date)} {t.recipientOrSupplier ? `· ${t.recipientOrSupplier}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-mono font-bold ${
                      t.type === 'SETORAN_MODAL' || t.type === 'PENERIMAAN_PIUTANG'
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {t.type === 'SETORAN_MODAL' || t.type === 'PENERIMAAN_PIUTANG' ? '+' : '-'}
                    {formatRupiah(t.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debt Settlement Modal */}
      {settlementTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              {settlementTarget.type === 'PAYABLE' ? 'Bayar Utang Supplier' : 'Terima Pelunasan Piutang'}
            </h3>
            <form onSubmit={handleSettleDebt} className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Pembayaran (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    settleAmountInput
                      ? formatRupiah(parseInt(settleAmountInput.replace(/\D/g, ''), 10) || 0)
                      : ''
                  }
                  onChange={(e) => setSettleAmountInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-bold font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {settlementTarget.type === 'PAYABLE' ? 'Keluar dari Akun' : 'Masuk ke Akun'}
                </label>
                <select
                  value={settleAccountId}
                  onChange={(e) => setSettleAccountId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatRupiah(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettlementTarget(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#800020] text-amber-200 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Konfirmasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payable Modal */}
      {isAddPayableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Catat Utang Supplier Baru
            </h3>
            <form onSubmit={handleCreatePayable} className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Supplier *</label>
                <input
                  type="text"
                  placeholder="Contoh: Toko Beras Ramos, Pasar Cinde"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Utang (Rp) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    newAmountInput
                      ? formatRupiah(parseInt(newAmountInput.replace(/\D/g, ''), 10) || 0)
                      : ''
                  }
                  onChange={(e) => setNewAmountInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jatuh Tempo</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPayableOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#800020] text-amber-200 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Simpan Utang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Receivable Modal */}
      {isAddReceivableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Catat Tagihan Piutang Catering
            </h3>
            <form onSubmit={handleCreateReceivable} className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Pemesan / Pelanggan *</label>
                <input
                  type="text"
                  placeholder="Contoh: Panitia Pesta Pernikahan Ny. Sitompul"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Piutang (Rp) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    newAmountInput
                      ? formatRupiah(parseInt(newAmountInput.replace(/\D/g, ''), 10) || 0)
                      : ''
                  }
                  onChange={(e) => setNewAmountInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jatuh Tempo</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddReceivableOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#800020] text-amber-200 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Simpan Piutang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bazar Event Modal */}
      <BazarEventModal
        isOpen={isBazarModalOpen}
        onClose={() => {
          setIsBazarModalOpen(false);
          loadReports();
        }}
      />

      {/* Transfer Modals */}
      <TransferMoneyModal
        isOpen={isTransferMoneyOpen}
        onClose={() => {
          setIsTransferMoneyOpen(false);
          loadReports();
        }}
      />

      <TransferStockModal
        isOpen={isTransferStockOpen}
        onClose={() => {
          setIsTransferStockOpen(false);
          loadReports();
        }}
      />
    </div>
  );
};
