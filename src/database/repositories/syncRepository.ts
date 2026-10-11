/**
 * Sync & Backup Repository - Warung Medan Finance
 * Offline-first Outbox queue, JSON backup/restore, audit trail
 */

import { db } from '../db';
import type { AppSettings, OpeningBalanceConfig, AuditLog } from '../../types';

export const syncRepository = {
  async getSettings(): Promise<AppSettings> {
    const list = await db.settings.toArray();
    if (list.length > 0) return list[0];
    return {
      businessName: 'Warung Medan CT Catering',
      ownerName: 'Pemilik Usaha CT',
      address: 'Jl. Danau Toba Raya No. 18, Medan',
      phone: '0812-3456-7890',
      timezone: 'Asia/Jakarta',
      pinLockEnabled: false,
      autoSyncEnabled: true,
      lastSyncAt: new Date().toISOString()
    };
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings, id: 'app_settings' };
    await db.settings.put(updated);
  },

  async getOpeningBalance(storeId?: string): Promise<OpeningBalanceConfig | undefined> {
    if (storeId && storeId !== 'ALL') {
      const match = await db.openingBalances.filter((ob) => ob.storeId === storeId).first();
      if (match) return match;
    }
    const list = await db.openingBalances.toArray();
    return list[0];
  },

  async saveOpeningBalance(config: OpeningBalanceConfig, storeId?: string): Promise<void> {
    const targetStoreId = storeId || config.storeId;
    await db.transaction('rw', [db.openingBalances, db.accounts, db.auditLogs], async () => {
      await db.openingBalances.put(config);

      // Sinkronkan ke saldo awal akun untuk cabang yang sesuai (atau semua akun jika belum ada storeId)
      const accounts = await db.accounts.toArray();
      for (const acc of accounts) {
        if (targetStoreId && targetStoreId !== 'ALL' && acc.storeId && acc.storeId !== targetStoreId) {
          continue;
        }

        let targetInitial = acc.initialBalance;
        if (acc.type === 'Kas') targetInitial = config.cashBalance;
        else if (acc.type === 'Bank') targetInitial = config.bankBalance;
        else if (acc.type === 'E-Wallet') targetInitial = config.ewalletBalance;

        // Delta transaksi = saldo berjalan saat ini - saldo awal lama
        const ledgerMovementDelta = acc.currentBalance - acc.initialBalance;
        const newCurrentBalance = Math.round(targetInitial + ledgerMovementDelta);

        await db.accounts.update(acc.id, {
          initialBalance: targetInitial,
          currentBalance: newCurrentBalance,
          updatedAt: new Date().toISOString()
        });
      }

      await db.auditLogs.add({
        id: `audit_${Date.now()}`,
        action: 'UPDATE_OPENING_BALANCE',
        entityType: 'OPENING_BALANCE',
        entityId: config.id,
        details: `Saldo awal pembukuan dikonfirmasi: Kas Rp${config.cashBalance.toLocaleString('id-ID')}, Bank Rp${config.bankBalance.toLocaleString('id-ID')}, E-Wallet Rp${config.ewalletBalance.toLocaleString('id-ID')}`,
        timestamp: new Date().toISOString()
      });
    });
  },

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return await db.auditLogs.orderBy('timestamp').reverse().limit(limit).toArray();
  },

  async getPendingSyncCount(): Promise<number> {
    return await db.syncOutbox.filter((item) => item.status === 'PENDING').count();
  },

  /**
   * Export all data tables into a validated JSON backup bundle
   */
  async exportFullBackupJson(): Promise<string> {
    const backupData = {
      app: 'Warung Medan Finance',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      businessName: 'Warung Medan CT Catering',
      data: {
        accounts: await db.accounts.toArray(),
        dailySales: await db.dailySales.toArray(),
        transactions: await db.transactions.toArray(),
        ingredients: await db.ingredients.toArray(),
        stockMovements: await db.stockMovements.toArray(),
        products: await db.products.toArray(),
        payables: await db.payables.toArray(),
        receivables: await db.receivables.toArray(),
        openingBalances: await db.openingBalances.toArray(),
        auditLogs: await db.auditLogs.toArray(),
        settings: await db.settings.toArray()
      }
    };

    return JSON.stringify(backupData, null, 2);
  },

  /**
   * Restore database from backup JSON bundle with full safety transaction
   */
  async restoreBackupJson(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.app || !parsed.data) {
        throw new Error('Format file backup tidak valid untuk Warung Medan Finance');
      }

      const { data } = parsed;
      await db.transaction(
        'rw',
        [
          db.accounts,
          db.dailySales,
          db.transactions,
          db.ingredients,
          db.stockMovements,
          db.products,
          db.payables,
          db.receivables,
          db.openingBalances,
          db.auditLogs,
          db.settings
        ],
        async () => {
          if (Array.isArray(data.accounts)) {
            await db.accounts.clear();
            if (data.accounts.length > 0) await db.accounts.bulkAdd(data.accounts);
          }
          if (Array.isArray(data.dailySales)) {
            await db.dailySales.clear();
            if (data.dailySales.length > 0) await db.dailySales.bulkAdd(data.dailySales);
          }
          if (Array.isArray(data.transactions)) {
            await db.transactions.clear();
            if (data.transactions.length > 0) await db.transactions.bulkAdd(data.transactions);
          }
          if (Array.isArray(data.ingredients)) {
            await db.ingredients.clear();
            if (data.ingredients.length > 0) await db.ingredients.bulkAdd(data.ingredients);
          }
          if (Array.isArray(data.stockMovements)) {
            await db.stockMovements.clear();
            if (data.stockMovements.length > 0) await db.stockMovements.bulkAdd(data.stockMovements);
          }
          if (Array.isArray(data.products)) {
            await db.products.clear();
            if (data.products.length > 0) await db.products.bulkAdd(data.products);
          }
          if (Array.isArray(data.payables)) {
            await db.payables.clear();
            if (data.payables.length > 0) await db.payables.bulkAdd(data.payables);
          }
          if (Array.isArray(data.receivables)) {
            await db.receivables.clear();
            if (data.receivables.length > 0) await db.receivables.bulkAdd(data.receivables);
          }
          if (Array.isArray(data.openingBalances)) {
            await db.openingBalances.clear();
            if (data.openingBalances.length > 0) await db.openingBalances.bulkAdd(data.openingBalances);
          }
          if (Array.isArray(data.auditLogs)) {
            await db.auditLogs.clear();
            if (data.auditLogs.length > 0) await db.auditLogs.bulkAdd(data.auditLogs);
          }
          if (Array.isArray(data.settings)) {
            await db.settings.clear();
            if (data.settings.length > 0) await db.settings.bulkAdd(data.settings);
          }

          await db.auditLogs.add({
            id: `audit_restore_${Date.now()}`,
            action: 'RESTORE_BACKUP',
            entityType: 'DATABASE',
            entityId: 'SYSTEM',
            details: `Pemulihan data cadangan berhasil dari ekspor tanggal ${parsed.exportedAt || 'tidak diketahui'}`,
            timestamp: new Date().toISOString()
          });
        }
      );

      return {
        success: true,
        message: 'Pemulihan data cadangan berhasil! Semua catatan keuangan telah diperbarui.'
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal memulihkan cadangan: ${err.message || 'File rusak atau tidak valid'}`
      };
    }
  }
};
