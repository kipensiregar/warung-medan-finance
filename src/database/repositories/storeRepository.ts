/**
 * STORE REPOSITORY - Manajemen Multi-Cabang & Transfer Antar-Unit
 * Warung Medan CT Catering
 */

import { db } from '../db';
import {
  type Store,
  type StoreBudget,
  type FinancialTransaction,
  type StockMovement,
  type UnitType,
  STORE_SUNGAI_BAUNG_ID,
  STORE_PALEMBANG_CENTER_ID,
  STORE_BAZAR_ID
} from '../../types';

export const storeRepository = {
  async getAll(): Promise<Store[]> {
    return await db.stores.toArray();
  },

  async getActive(): Promise<Store[]> {
    return await db.stores.filter((s) => s.isActive).toArray();
  },

  async getById(id: string): Promise<Store | undefined> {
    return await db.stores.get(id);
  },

  async getBudget(storeId: string, month: string): Promise<StoreBudget | undefined> {
    return await db.budgets.filter((b) => b.storeId === storeId && b.month === month).first();
  },

  async saveBudget(data: Omit<StoreBudget, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoreBudget> {
    const now = new Date().toISOString();
    const existing = await this.getBudget(data.storeId, data.month);
    const id = existing ? existing.id : `bgt_${data.storeId}_${data.month}_${Date.now()}`;

    const budget: StoreBudget = {
      ...data,
      id,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    await db.budgets.put(budget);
    return budget;
  },

  /**
   * Transfer Uang Antar-Cabang (Inter-Store Money Transfer)
   * Mengurangi saldo akun di cabang asal, menambah saldo akun di cabang tujuan.
   * Penting: Pada laporan konsolidasi (Semua Cabang), transaksi ini DIELIMINASI (net 0)!
   */
  async transferMoney(payload: {
    date: string;
    fromStoreId: string;
    toStoreId: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    notes?: string;
  }): Promise<{ outgoingTx: FinancialTransaction; incomingTx: FinancialTransaction }> {
    if (payload.fromStoreId === payload.toStoreId) {
      throw new Error('Cabang asal dan cabang tujuan tidak boleh sama');
    }
    if (payload.amount <= 0) {
      throw new Error('Nominal transfer harus lebih besar dari Rp0');
    }

    const now = new Date().toISOString();
    const outTxId = `tx_trf_out_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const inTxId = `tx_trf_in_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    return await db.transaction('rw', [db.accounts, db.transactions, db.auditLogs, db.stores], async () => {
      const fromAcc = await db.accounts.get(payload.fromAccountId);
      const toAcc = await db.accounts.get(payload.toAccountId);
      const fromStore = await db.stores.get(payload.fromStoreId);
      const toStore = await db.stores.get(payload.toStoreId);

      if (!fromAcc || !toAcc || !fromStore || !toStore) {
        throw new Error('Data akun atau cabang transfer tidak lengkap');
      }

      // Update Saldo
      await db.accounts.update(payload.fromAccountId, {
        currentBalance: Math.round(fromAcc.currentBalance - payload.amount),
        updatedAt: now
      });
      await db.accounts.update(payload.toAccountId, {
        currentBalance: Math.round(toAcc.currentBalance + payload.amount),
        updatedAt: now
      });

      // Transaksi Cabang Pengirim
      const outgoingTx: FinancialTransaction = {
        id: outTxId,
        storeId: payload.fromStoreId,
        date: payload.date,
        type: 'TRANSFER_ANTAR_CABANG',
        category: 'Transfer Antar-Cabang',
        amount: payload.amount,
        sourceAccountId: payload.fromAccountId,
        destinationAccountId: payload.toAccountId,
        destinationStoreId: payload.toStoreId,
        paymentMethod: fromAcc.type === 'Kas' ? 'Tunai' : 'Transfer Bank',
        notes: payload.notes || `Transfer kas ke ${toStore.name}`,
        isInterStoreTransfer: true,
        isVoided: false,
        createdAt: now,
        updatedAt: now
      };

      // Transaksi Cabang Penerima
      const incomingTx: FinancialTransaction = {
        id: inTxId,
        storeId: payload.toStoreId,
        date: payload.date,
        type: 'TRANSFER_ANTAR_CABANG',
        category: 'Transfer Antar-Cabang',
        amount: payload.amount,
        sourceAccountId: payload.toAccountId,
        destinationAccountId: payload.fromAccountId,
        destinationStoreId: payload.fromStoreId,
        paymentMethod: toAcc.type === 'Kas' ? 'Tunai' : 'Transfer Bank',
        notes: payload.notes || `Penerimaan kas dari ${fromStore.name}`,
        isInterStoreTransfer: true,
        isVoided: false,
        createdAt: now,
        updatedAt: now
      };

      await db.transactions.bulkAdd([outgoingTx, incomingTx]);

      await db.auditLogs.add({
        id: `audit_${Date.now()}`,
        action: 'INTER_STORE_TRANSFER',
        storeId: payload.fromStoreId,
        entityType: 'TRANSACTION',
        entityId: outTxId,
        details: `Transfer dana Rp${payload.amount.toLocaleString('id-ID')} dari ${fromStore.name} (${fromAcc.name}) ke ${toStore.name} (${toAcc.name})`,
        timestamp: now
      });

      return { outgoingTx, incomingTx };
    });
  },

  /**
   * Transfer Stok Bahan Baku Antar-Cabang (Inter-Store Stock Transfer)
   * Memindahkan stok bahan baku dari satu unit cabang ke cabang lain.
   * Penting: Pada laporan konsolidasi, mutasi ini dieliminasi dan TIDAK DIHITUNG sebagai pembelian bahan baru!
   */
  async transferStock(payload: {
    date: string;
    fromStoreId: string;
    toStoreId: string;
    fromIngredientId: string;
    quantity: number;
    notes?: string;
  }): Promise<{ outMovement: StockMovement; inMovement: StockMovement }> {
    if (payload.fromStoreId === payload.toStoreId) {
      throw new Error('Cabang asal dan tujuan tidak boleh sama');
    }
    if (payload.quantity <= 0) {
      throw new Error('Jumlah stok yang dipindahkan harus lebih dari 0');
    }

    const now = new Date().toISOString();
    const outMovId = `mov_trf_out_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const inMovId = `mov_trf_in_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    return await db.transaction('rw', [db.ingredients, db.stockMovements, db.auditLogs, db.stores], async () => {
      const fromIng = await db.ingredients.get(payload.fromIngredientId);
      const fromStore = await db.stores.get(payload.fromStoreId);
      const toStore = await db.stores.get(payload.toStoreId);

      if (!fromIng || !fromStore || !toStore) {
        throw new Error('Data bahan baku atau cabang tidak ditemukan');
      }

      if (fromIng.currentStock < payload.quantity) {
        throw new Error(
          `Stok ${fromIng.name} di ${fromStore.name} tidak mencukupi (Tersedia: ${fromIng.currentStock} ${fromIng.unit})`
        );
      }

      const transferValuation = Math.round(payload.quantity * fromIng.averagePurchasePrice);

      // 1. Kurangi stok di cabang asal
      const newFromStock = fromIng.currentStock - payload.quantity;
      await db.ingredients.update(fromIng.id, {
        currentStock: newFromStock,
        totalValuation: Math.round(newFromStock * fromIng.averagePurchasePrice),
        updatedAt: now
      });

      // 2. Tambah stok di cabang tujuan (cari bahan dengan nama sama di cabang tujuan atau buat record baru)
      let toIng = await db.ingredients
        .filter((i) => i.storeId === payload.toStoreId && i.name.toLowerCase() === fromIng.name.toLowerCase())
        .first();

      if (!toIng) {
        // Buat record bahan di cabang tujuan jika belum ada
        const newToIngId = `ing_${payload.toStoreId.slice(-2)}_${Date.now()}`;
        toIng = {
          id: newToIngId,
          storeId: payload.toStoreId,
          name: fromIng.name,
          category: fromIng.category,
          unit: fromIng.unit,
          initialStock: 0,
          currentStock: payload.quantity,
          minimumStock: fromIng.minimumStock,
          averagePurchasePrice: fromIng.averagePurchasePrice,
          totalValuation: transferValuation,
          isActive: true,
          createdAt: now,
          updatedAt: now
        };
        await db.ingredients.add(toIng);
      } else {
        // Update WAC di cabang penerima
        const oldTotalCost = toIng.currentStock * toIng.averagePurchasePrice;
        const newTotalCost = oldTotalCost + transferValuation;
        const newToStock = toIng.currentStock + payload.quantity;
        const newAvgPrice = newToStock > 0 ? Math.round(newTotalCost / newToStock) : fromIng.averagePurchasePrice;

        await db.ingredients.update(toIng.id, {
          currentStock: newToStock,
          averagePurchasePrice: newAvgPrice,
          totalValuation: Math.round(newToStock * newAvgPrice),
          updatedAt: now
        });
      }

      // Catat Mutasi Keluar
      const outMovement: StockMovement = {
        id: outMovId,
        storeId: payload.fromStoreId,
        ingredientId: fromIng.id,
        ingredientName: fromIng.name,
        date: payload.date,
        type: 'TRANSFER_KELUAR_CABANG',
        quantity: payload.quantity,
        unit: fromIng.unit,
        unitPrice: fromIng.averagePurchasePrice,
        totalAmount: transferValuation,
        fromStoreId: payload.fromStoreId,
        toStoreId: payload.toStoreId,
        isInterStoreTransfer: true,
        notes: payload.notes || `Kirim stok ke ${toStore.name}`,
        createdAt: now,
        updatedAt: now
      };

      // Catat Mutasi Masuk
      const inMovement: StockMovement = {
        id: inMovId,
        storeId: payload.toStoreId,
        ingredientId: toIng.id,
        ingredientName: fromIng.name,
        date: payload.date,
        type: 'TRANSFER_MASUK_CABANG',
        quantity: payload.quantity,
        unit: fromIng.unit,
        unitPrice: fromIng.averagePurchasePrice,
        totalAmount: transferValuation,
        fromStoreId: payload.fromStoreId,
        toStoreId: payload.toStoreId,
        isInterStoreTransfer: true,
        notes: payload.notes || `Terima transfer stok dari ${fromStore.name}`,
        createdAt: now,
        updatedAt: now
      };

      await db.stockMovements.bulkAdd([outMovement, inMovement]);

      await db.auditLogs.add({
        id: `audit_${Date.now()}`,
        action: 'INTER_STORE_STOCK_TRANSFER',
        storeId: payload.fromStoreId,
        entityType: 'INGREDIENT',
        entityId: fromIng.id,
        details: `Transfer ${payload.quantity} ${fromIng.unit} ${fromIng.name} (Nilai: Rp${transferValuation.toLocaleString('id-ID')}) dari ${fromStore.name} ke ${toStore.name}`,
        timestamp: now
      });

      return { outMovement, inMovement };
    });
  },

  /**
   * Cek apakah ada record historis lama yang belum memiliki store_id
   */
  async getUnmappedRecordsCount(): Promise<{
    salesCount: number;
    txCount: number;
    ingredientCount: number;
    total: number;
  }> {
    const [sales, txs, ings] = await Promise.all([
      db.dailySales.filter((s: any) => !s.storeId).count(),
      db.transactions.filter((t: any) => !t.storeId).count(),
      db.ingredients.filter((i: any) => !i.storeId).count()
    ]);
    return {
      salesCount: sales,
      txCount: txs,
      ingredientCount: ings,
      total: sales + txs + ings
    };
  },

  /**
   * Migrasi pemetaan manual data historis ke cabang yang dipilih pemilik
   */
  async mapUnmappedRecordsToStore(targetStoreId: string): Promise<number> {
    const store = await db.stores.get(targetStoreId);
    if (!store) throw new Error('Unit cabang tujuan tidak valid');

    let modified = 0;
    await db.transaction('rw', [db.dailySales, db.transactions, db.ingredients, db.auditLogs], async () => {
      const sales = await db.dailySales.filter((s: any) => !s.storeId).toArray();
      for (const s of sales) {
        await db.dailySales.update(s.id, { storeId: targetStoreId });
        modified++;
      }

      const txs = await db.transactions.filter((t: any) => !t.storeId).toArray();
      for (const t of txs) {
        await db.transactions.update(t.id, { storeId: targetStoreId });
        modified++;
      }

      const ings = await db.ingredients.filter((i: any) => !i.storeId).toArray();
      for (const i of ings) {
        await db.ingredients.update(i.id, { storeId: targetStoreId });
        modified++;
      }

      await db.auditLogs.add({
        id: `audit_mig_${Date.now()}`,
        action: 'MIGRATE_STORE_DATA',
        storeId: targetStoreId,
        entityType: 'STORE_MIGRATION',
        entityId: targetStoreId,
        details: `Pemilik memetakan ${modified} record historis ke cabang ${store.name}`,
        timestamp: new Date().toISOString()
      });
    });

    return modified;
  },

  /**
   * Ambil seluruh transaksi internal antar-cabang untuk audit transparansi konsolidasi
   */
  async getInterStoreTransferAudit(startDate?: string, endDate?: string): Promise<{
    moneyTransfers: FinancialTransaction[];
    stockTransfers: StockMovement[];
  }> {
    const moneyQuery = db.transactions.filter((t) => {
      if (t.isVoided) return false;
      if (!t.isInterStoreTransfer && t.type !== 'TRANSFER_ANTAR_CABANG') return false;
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    });

    const stockQuery = db.stockMovements.filter((m) => {
      if (!m.isInterStoreTransfer && m.type !== 'TRANSFER_MASUK_CABANG' && m.type !== 'TRANSFER_KELUAR_CABANG')
        return false;
      if (startDate && m.date < startDate) return false;
      if (endDate && m.date > endDate) return false;
      return true;
    });

    const [moneyTransfers, stockTransfers] = await Promise.all([
      moneyQuery.reverse().sortBy('date'),
      stockQuery.reverse().sortBy('date')
    ]);

    return { moneyTransfers, stockTransfers };
  }
};
