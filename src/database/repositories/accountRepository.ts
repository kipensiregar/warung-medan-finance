/**
 * Account Repository - Warung Medan Finance
 */

import { db } from '../db';
import type { Account, FinancialTransaction } from '../../types';

export const accountRepository = {
  async getAll(storeId?: string): Promise<Account[]> {
    if (storeId && storeId !== 'ALL') {
      return await db.accounts.filter((a) => a.storeId === storeId).toArray();
    }
    return await db.accounts.toArray();
  },

  async getById(id: string): Promise<Account | undefined> {
    return await db.accounts.get(id);
  },

  async updateBalance(id: string, deltaAmount: number): Promise<void> {
    await db.transaction('rw', db.accounts, async () => {
      const acc = await db.accounts.get(id);
      if (!acc) throw new Error(`Akun dengan ID ${id} tidak ditemukan`);
      const newBalance = Math.round(acc.currentBalance + deltaAmount);
      await db.accounts.update(id, {
        currentBalance: newBalance,
        updatedAt: new Date().toISOString()
      });
    });
  },

  /**
   * Transfer antar-akun (misal: Kas fisik Warung ke Bank BCA)
   * Penting: Transfer antar akun TIDAK boleh dicatat sebagai omzet ataupun pengeluaran operasional!
   */
  async transfer(
    sourceAccountId: string,
    destinationAccountId: string,
    amount: number,
    notes?: string
  ): Promise<FinancialTransaction> {
    if (sourceAccountId === destinationAccountId) {
      throw new Error('Akun sumber dan akun tujuan tidak boleh sama');
    }
    if (amount <= 0) {
      throw new Error('Nominal transfer harus lebih besar dari 0');
    }

    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const txId = `tx_trf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return await db.transaction('rw', [db.accounts, db.transactions, db.auditLogs], async () => {
      const source = await db.accounts.get(sourceAccountId);
      const dest = await db.accounts.get(destinationAccountId);
      if (!source || !dest) throw new Error('Akun pengirim atau penerima tidak ditemukan');

      if (source.currentBalance < amount) {
        // Warning: Saldo tidak mencukupi, tapi izinkan jika pemilik sengaja menginput
      }

      // Update balances
      await db.accounts.update(sourceAccountId, {
        currentBalance: Math.round(source.currentBalance - amount),
        updatedAt: now
      });
      await db.accounts.update(destinationAccountId, {
        currentBalance: Math.round(dest.currentBalance + amount),
        updatedAt: now
      });

      const tx: FinancialTransaction = {
        id: txId,
        storeId: source.storeId,
        date: today,
        type: 'TRANSFER_ANTAR_AKUN',
        category: 'Transfer Antar-Akun',
        amount,
        sourceAccountId,
        destinationAccountId,
        paymentMethod: 'Transfer Bank',
        notes: notes || `Transfer dari ${source.name} ke ${dest.name}`,
        isVoided: false,
        createdAt: now,
        updatedAt: now
      };

      await db.transactions.add(tx);

      await db.auditLogs.add({
        id: `audit_${Date.now()}`,
        action: 'TRANSFER_ACCOUNT',
        entityType: 'TRANSACTION',
        entityId: txId,
        details: `Transfer Rp${amount.toLocaleString('id-ID')} dari ${source.name} ke ${dest.name}`,
        timestamp: now
      });

      return tx;
    });
  }
};
