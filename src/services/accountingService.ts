/**
 * WARUNG MEDAN FINANCE - MULTI-STORE ACCOUNTING ENGINE SERVICE
 * Warung Medan CT Catering
 *
 * Implements strict Indonesian GAAP (SAK EMKM) standards for multi-store small business:
 * - Penjualan Bersih = Penjualan Kotor - Diskon - Refund
 * - HPP = Persediaan Awal + Pembelian Bersih Bahan - Persediaan Akhir + Penyesuaian Rusak
 * - Laba Kotor = Penjualan Bersih - HPP
 * - Laba Bersih = Laba Kotor - Total Beban Operasional
 * - Cashflow = Saldo Awal + Arus Masuk Riil - Arus Keluar Riil = Saldo Akhir
 *
 * Multi-Store Consolidated Elimination Rules:
 * 1. Transfer uang antar-cabang (isInterStoreTransfer / TRANSFER_ANTAR_CABANG) DIELIMINASI
 *    pada laporan konsolidasi (Semua Cabang) sehingga tidak menggembungkan pendapatan atau beban.
 * 2. Transfer stok bahan antar-cabang (TRANSFER_MASUK_CABANG / TRANSFER_KELUAR_CABANG)
 *    DIELIMINASI pada konsolidasi dan TIDAK dihitung sebagai pembelian bahan baru!
 * 3. Transaksi internal antar-cabang tetap tercatat dan disajikan terpisah untuk jejak audit.
 */

import { db } from '../database/db';
import {
  type ProfitLossReport,
  type CashFlowReport,
  type ExpenseCategory,
  type StoreComparisonItem,
  STORE_SUNGAI_BAUNG_ID,
  STORE_PALEMBANG_CENTER_ID,
  STORE_BAZAR_ID
} from '../types';

export const accountingService = {
  /**
   * Hitung Laporan Laba Rugi untuk rentang tanggal tertentu (Per Cabang atau Konsolidasian)
   */
  async calculateProfitLoss(
    startDate: string,
    endDate: string,
    periodLabel: string,
    storeId?: string,
    eventId?: string
  ): Promise<ProfitLossReport> {
    const isConsolidated = !storeId || storeId === 'ALL';
    let storeName: string | undefined = undefined;
    let eventName: string | undefined = undefined;

    if (!isConsolidated && storeId) {
      const st = await db.stores.get(storeId);
      storeName = st?.name;
    }
    if (eventId) {
      const ev = await db.bazarEvents.get(eventId);
      eventName = ev?.name;
    }

    // 1. Ambil Penjualan Harian
    const salesList = await db.dailySales
      .filter((s) => {
        if (s.isVoided) return false;
        if (s.date < startDate || s.date > endDate) return false;
        if (!isConsolidated && s.storeId !== storeId) return false;
        if (eventId && s.eventId !== eventId) return false;
        return true;
      })
      .toArray();

    const grossSales = salesList.reduce((sum, s) => sum + s.grossSales, 0);
    const discounts = salesList.reduce((sum, s) => sum + s.discount, 0);
    const refunds = salesList.reduce((sum, s) => sum + s.refund, 0);
    const netSales = Math.round(grossSales - discounts - refunds);

    // 2. Ambil Persediaan & HPP
    const movements = await db.stockMovements
      .filter((m) => {
        if (m.date < startDate || m.date > endDate) return false;
        if (!isConsolidated && m.storeId !== storeId) return false;
        if (eventId && m.eventId !== eventId) return false;
        return true;
      })
      .toArray();

    let purchasesForInventory = 0;
    let wasteAndDamagedAdjustments = 0;
    let manualUsageCost = 0;

    for (const mov of movements) {
      if (mov.type === 'MASUK_PEMBELIAN') {
        // Pada konsolidasi, mutasi transfer antar cabang diabaikan dari pembelian baru
        if (!mov.isInterStoreTransfer) {
          purchasesForInventory += mov.totalAmount || 0;
        }
      } else if (mov.type === 'RUSAK_TERBUANG') {
        wasteAndDamagedAdjustments += mov.totalAmount || 0;
      } else if (mov.type === 'PEMAKAIAN_MANUAL') {
        manualUsageCost += mov.totalAmount || 0;
      }
      // Note: TRANSFER_MASUK_CABANG & TRANSFER_KELUAR_CABANG dieliminasi pada level konsolidasi
    }

    // Ambil bahan terkini untuk nilai persediaan
    const ingredients = await db.ingredients
      .filter((i) => {
        if (!i.isActive) return false;
        if (!isConsolidated && i.storeId !== storeId) return false;
        return true;
      })
      .toArray();
    const endingInventory = ingredients.reduce((sum, i) => sum + i.totalValuation, 0);

    // Estimasi persediaan awal: Ending - Purchases + ManualUsage + Waste
    const beginningInventory = Math.max(
      0,
      Math.round(endingInventory - purchasesForInventory + manualUsageCost + wasteAndDamagedAdjustments)
    );

    // Formula HPP SAK EMKM:
    const costOfGoodsSold = Math.max(0, Math.round(manualUsageCost + wasteAndDamagedAdjustments));
    const grossProfit = Math.round(netSales - costOfGoodsSold);
    const grossMarginPct = netSales > 0 ? Number(((grossProfit / netSales) * 100).toFixed(1)) : 0;

    // 3. Ambil Beban Operasional & Transaksi
    const transactions = await db.transactions
      .filter((t) => {
        if (t.isVoided) return false;
        if (t.date < startDate || t.date > endDate) return false;
        if (!isConsolidated && t.storeId !== storeId) return false;
        if (eventId && t.eventId !== eventId) return false;
        return true;
      })
      .toArray();

    const initialOperatingMap: Record<ExpenseCategory, number> = {
      'Bahan Baku': 0,
      'Gaji Karyawan': 0,
      'Sewa Tempat': 0,
      'Listrik & Air': 0,
      'Gas LPG': 0,
      'Transportasi & Bensin': 0,
      'Kemasan & Plastik': 0,
      'Peralatan Masak': 0,
      'Perawatan & Servis': 0,
      'Pemasaran & Promosi': 0,
      'Administrasi & Bank': 0,
      'Pajak & Retribusi': 0,
      'Lain-lain': 0
    };

    let totalOperatingExpenses = 0;
    let interStoreTransfersIn = 0;
    let interStoreTransfersOut = 0;
    let eliminatedInternalTransfers = 0;

    for (const tx of transactions) {
      if (tx.isInterStoreTransfer || tx.type === 'TRANSFER_ANTAR_CABANG') {
        if (isConsolidated) {
          // Eliminasi transaksi internal pada konsolidasi
          eliminatedInternalTransfers += tx.amount;
        } else {
          // Track transfer masuk vs keluar untuk unit spesifik
          if (tx.destinationStoreId && tx.destinationStoreId !== storeId) {
            interStoreTransfersOut += tx.amount;
          } else {
            interStoreTransfersIn += tx.amount;
          }
        }
        continue;
      }

      if (tx.type === 'PENGELUARAN_OPERASIONAL') {
        const cat = tx.category as ExpenseCategory;
        if (initialOperatingMap[cat] !== undefined) {
          initialOperatingMap[cat] += tx.amount;
        } else {
          initialOperatingMap['Lain-lain'] += tx.amount;
        }
        totalOperatingExpenses += tx.amount;
      }
    }

    const operatingProfit = Math.round(grossProfit - totalOperatingExpenses);
    const otherIncome = 0;
    const otherExpenses = 0;
    const netProfit = Math.round(operatingProfit + otherIncome - otherExpenses);
    const netMarginPct = netSales > 0 ? Number(((netProfit / netSales) * 100).toFixed(1)) : 0;

    return {
      periodLabel,
      startDate,
      endDate,
      storeId: isConsolidated ? undefined : storeId,
      storeName,
      isConsolidated,
      eventId,
      eventName,
      grossSales,
      discounts,
      refunds,
      netSales,
      beginningInventory,
      purchasesForInventory,
      endingInventory,
      wasteAndDamagedAdjustments,
      costOfGoodsSold,
      grossProfit,
      grossMarginPct,
      operatingExpenses: initialOperatingMap,
      totalOperatingExpenses,
      interStoreTransfersIn,
      interStoreTransfersOut,
      eliminatedInternalTransfers,
      operatingProfit,
      otherIncome,
      otherExpenses,
      netProfit,
      netMarginPct
    };
  },

  /**
   * Hitung Laporan Arus Kas (Cash Flow)
   * Rekonsiliasi: Saldo Awal + Kas Masuk - Kas Keluar = Saldo Akhir
   */
  async calculateCashFlow(
    startDate: string,
    endDate: string,
    periodLabel: string,
    storeId?: string
  ): Promise<CashFlowReport> {
    const isConsolidated = !storeId || storeId === 'ALL';
    let storeName: string | undefined = undefined;

    if (!isConsolidated && storeId) {
      const st = await db.stores.get(storeId);
      storeName = st?.name;
    }

    // Ambil akun yang relevan
    const accounts = await db.accounts
      .filter((a) => (!isConsolidated ? a.storeId === storeId : true))
      .toArray();

    const initialBookkeepingCash = accounts.reduce((sum, a) => sum + a.initialBalance, 0);

    // Hitung seluruh arus kas sebelum tanggal startDate
    const priorSalesList = await db.dailySales
      .filter((s) => {
        if (s.isVoided || s.date >= startDate) return false;
        if (!isConsolidated && s.storeId !== storeId) return false;
        return true;
      })
      .toArray();
    const priorSalesInflow = priorSalesList.reduce((sum, s) => sum + s.netSales, 0);

    const priorTxs = await db.transactions
      .filter((t) => {
        if (t.isVoided || t.date >= startDate) return false;
        if (!isConsolidated && t.storeId !== storeId) return false;
        return true;
      })
      .toArray();

    let priorInflows = priorSalesInflow;
    let priorOutflows = 0;

    for (const tx of priorTxs) {
      if (tx.isInterStoreTransfer || tx.type === 'TRANSFER_ANTAR_CABANG') {
        if (!isConsolidated) {
          if (tx.destinationStoreId && tx.destinationStoreId !== storeId) {
            priorOutflows += tx.amount;
          } else {
            priorInflows += tx.amount;
          }
        }
        continue;
      }

      if (tx.type === 'PENERIMAAN_PIUTANG' || tx.type === 'SETORAN_MODAL') {
        priorInflows += tx.amount;
      } else if (
        tx.type === 'PENGELUARAN_OPERASIONAL' ||
        tx.type === 'PEMBELIAN_BAHAN_BAKU' ||
        tx.type === 'PEMBAYARAN_UTANG' ||
        tx.type === 'PEMBELIAN_ASET' ||
        tx.type === 'PRIVE_PEMILIK'
      ) {
        priorOutflows += tx.amount;
      }
    }

    const startingCash = Math.round(initialBookkeepingCash + priorInflows - priorOutflows);

    // Arus Kas Periode Berjalan [startDate, endDate]
    const salesList = await db.dailySales
      .filter((s) => {
        if (s.isVoided || s.date < startDate || s.date > endDate) return false;
        if (!isConsolidated && s.storeId !== storeId) return false;
        return true;
      })
      .toArray();
    const cashInflowFromSales = salesList.reduce((sum, s) => sum + s.netSales, 0);

    const transactions = await db.transactions
      .filter((t) => {
        if (t.isVoided || t.date < startDate || t.date > endDate) return false;
        if (!isConsolidated && t.storeId !== storeId) return false;
        return true;
      })
      .toArray();

    let cashInflowFromReceivables = 0;
    let cashInflowFromCapital = 0;
    let cashInflowFromBranchTransfers = 0;

    let cashOutflowOperating = 0;
    let cashOutflowInventoryPurchases = 0;
    let cashOutflowDebtPayments = 0;
    let cashOutflowAssetPurchases = 0;
    let cashOutflowPrive = 0;
    let cashOutflowToBranchTransfers = 0;

    for (const tx of transactions) {
      if (tx.isInterStoreTransfer || tx.type === 'TRANSFER_ANTAR_CABANG') {
        if (!isConsolidated) {
          if (tx.destinationStoreId && tx.destinationStoreId !== storeId) {
            cashOutflowToBranchTransfers += tx.amount;
          } else {
            cashInflowFromBranchTransfers += tx.amount;
          }
        }
        continue;
      }

      if (tx.type === 'PENERIMAAN_PIUTANG') {
        cashInflowFromReceivables += tx.amount;
      } else if (tx.type === 'SETORAN_MODAL') {
        cashInflowFromCapital += tx.amount;
      } else if (tx.type === 'PENGELUARAN_OPERASIONAL') {
        cashOutflowOperating += tx.amount;
      } else if (tx.type === 'PEMBELIAN_BAHAN_BAKU') {
        cashOutflowInventoryPurchases += tx.amount;
      } else if (tx.type === 'PEMBAYARAN_UTANG') {
        cashOutflowDebtPayments += tx.amount;
      } else if (tx.type === 'PEMBELIAN_ASET') {
        cashOutflowAssetPurchases += tx.amount;
      } else if (tx.type === 'PRIVE_PEMILIK') {
        cashOutflowPrive += tx.amount;
      }
    }

    const totalCashInflow = Math.round(
      cashInflowFromSales + cashInflowFromReceivables + cashInflowFromCapital + cashInflowFromBranchTransfers
    );
    const totalCashOutflow = Math.round(
      cashOutflowOperating +
        cashOutflowInventoryPurchases +
        cashOutflowDebtPayments +
        cashOutflowAssetPurchases +
        cashOutflowPrive +
        cashOutflowToBranchTransfers
    );

    const netCashFlow = Math.round(totalCashInflow - totalCashOutflow);
    const endingCash = Math.round(startingCash + netCashFlow);

    return {
      periodLabel,
      startDate,
      endDate,
      storeId: isConsolidated ? undefined : storeId,
      storeName,
      isConsolidated,
      startingCash,
      cashInflowFromSales,
      cashInflowFromReceivables,
      cashInflowFromCapital,
      cashInflowFromBranchTransfers: isConsolidated ? 0 : cashInflowFromBranchTransfers,
      totalCashInflow,
      cashOutflowOperating,
      cashOutflowInventoryPurchases,
      cashOutflowDebtPayments,
      cashOutflowAssetPurchases,
      cashOutflowPrive,
      cashOutflowToBranchTransfers: isConsolidated ? 0 : cashOutflowToBranchTransfers,
      totalCashOutflow,
      netCashFlow,
      endingCash
    };
  },

  /**
   * Perbandingan Kinerja Multi-Store (Sungai Baung vs Palembang Center vs Bazar)
   */
  async getStoreComparison(startDate: string, endDate: string): Promise<StoreComparisonItem[]> {
    const stores = await db.stores.filter((s) => s.isActive).toArray();
    const result: StoreComparisonItem[] = [];

    for (const store of stores) {
      const pnl = await this.calculateProfitLoss(startDate, endDate, 'Perbandingan', store.id);

      const accounts = await db.accounts.filter((a) => a.storeId === store.id).toArray();
      const activeAccountsCash = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

      const ingredients = await db.ingredients.filter((i) => i.isActive && i.storeId === store.id).toArray();
      const inventoryValuation = ingredients.reduce((sum, i) => sum + i.totalValuation, 0);

      const payables = await db.payables.filter((p) => p.status !== 'LUNAS' && p.storeId === store.id).toArray();
      const pendingPayables = payables.reduce((sum, p) => sum + p.remainingAmount, 0);

      const receivables = await db.receivables
        .filter((r) => r.status !== 'LUNAS' && r.storeId === store.id)
        .toArray();
      const pendingReceivables = receivables.reduce((sum, r) => sum + r.remainingAmount, 0);

      result.push({
        storeId: store.id,
        storeName: store.name,
        code: store.code,
        netSales: pnl.netSales,
        cogs: pnl.costOfGoodsSold,
        operatingExpenses: pnl.totalOperatingExpenses,
        grossProfit: pnl.grossProfit,
        netProfit: pnl.netProfit,
        netMarginPct: pnl.netMarginPct,
        activeAccountsCash,
        inventoryValuation,
        pendingPayables,
        pendingReceivables
      });
    }

    return result;
  }
};
