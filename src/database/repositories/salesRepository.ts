/**
 * Sales Repository - Warung Medan Finance
 * Pencatatan Rekap Penjualan Harian (Dine-in, Takeaway, Catering, Bazar, Lainnya)
 */

import { db } from '../db';
import type { DailySalesSummary, PaymentSplitItem, SalesChannel, PaymentMethod } from '../../types';

export const salesRepository = {
  async getAll(storeId?: string): Promise<DailySalesSummary[]> {
    if (storeId && storeId !== 'ALL') {
      return await db.dailySales.filter((s) => s.storeId === storeId).reverse().sortBy('date');
    }
    return await db.dailySales.orderBy('date').reverse().toArray();
  },

  async getByDateRange(
    startDate: string,
    endDate: string,
    storeId?: string,
    eventId?: string
  ): Promise<DailySalesSummary[]> {
    return await db.dailySales
      .filter((s) => {
        if (s.isVoided) return false;
        if (s.date < startDate || s.date > endDate) return false;
        if (storeId && storeId !== 'ALL' && s.storeId !== storeId) return false;
        if (eventId && s.eventId !== eventId) return false;
        return true;
      })
      .toArray();
  },

  /**
   * Catat rekap penjualan harian
   * Memvalidasi:
   * 1. Nilai kotor >= 0, diskon & refund tidak melebihi kotor.
   * 2. Net sales = kotor - diskon - refund.
   * 3. Total alokasi split payment harus sama persis dengan Net Sales.
   * 4. Saldo akun penerima kas/bank/qris bertambah sesuai alokasi.
   */
  async createDailySummary(payload: {
    storeId: string;
    eventId?: string;
    date: string;
    channel: SalesChannel;
    grossSales: number;
    discount: number;
    refund: number;
    paymentMethod: PaymentMethod;
    splits: PaymentSplitItem[];
    notes?: string;
    referenceNumber?: string;
  }): Promise<DailySalesSummary> {
    if (payload.grossSales < 0) throw new Error('Penjualan kotor tidak boleh negatif');
    if (payload.discount < 0) throw new Error('Diskon tidak boleh negatif');
    if (payload.refund < 0) throw new Error('Refund tidak boleh negatif');

    const netSales = Math.round(payload.grossSales - payload.discount - payload.refund);
    if (netSales < 0) {
      throw new Error('Total diskon & refund tidak boleh melebihi penjualan kotor');
    }

    // Validasi splits
    const totalSplits = payload.splits.reduce((sum, item) => sum + item.amount, 0);
    if (Math.round(totalSplits) !== netSales) {
      throw new Error(
        `Total alokasi pembayaran (Rp${totalSplits.toLocaleString('id-ID')}) harus sama persis dengan Penjualan Bersih (Rp${netSales.toLocaleString('id-ID')})`
      );
    }

    const now = new Date().toISOString();
    const id = `sales_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return await db.transaction('rw', [db.dailySales, db.accounts, db.auditLogs], async () => {
      // Perbarui saldo akun untuk setiap alokasi pembayaran
      for (const split of payload.splits) {
        if (split.amount > 0) {
          const acc = await db.accounts.get(split.accountId);
          if (acc) {
            await db.accounts.update(split.accountId, {
              currentBalance: Math.round(acc.currentBalance + split.amount),
              updatedAt: now
            });
          }
        }
      }

      const summary: DailySalesSummary = {
        id,
        storeId: payload.storeId,
        eventId: payload.eventId,
        date: payload.date,
        channel: payload.channel,
        grossSales: payload.grossSales,
        discount: payload.discount,
        refund: payload.refund,
        netSales,
        paymentMethod: payload.paymentMethod,
        splits: payload.splits,
        notes: payload.notes,
        referenceNumber: payload.referenceNumber,
        isVoided: false,
        createdAt: now,
        updatedAt: now
      };

      await db.dailySales.add(summary);

      // Catat ke outbox sync

      // Audit Log
      await db.auditLogs.add({
        id: `audit_${Date.now()}`,
        action: 'ADD_DAILY_SALES',
        entityType: 'DAILY_SALES',
        entityId: id,
        details: `Rekap penjualan ${payload.channel} tgl ${payload.date} senilai Rp${netSales.toLocaleString('id-ID')}`,
        timestamp: now
      });

      return summary;
    });
  },

  /**
   * Pembatalan (Void) transaksi penjualan jika terjadi kesalahan input
   * Menarik kembali saldo akun yang sudah ditambahkan secara audit-trail aman.
   */
  async voidDailySummary(id: string, reason: string): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.dailySales, db.accounts, db.auditLogs], async () => {
      const summary = await db.dailySales.get(id);
      if (!summary) throw new Error('Data penjualan tidak ditemukan');
      if (summary.isVoided) throw new Error('Penjualan ini sudah dibatalkan sebelumnya');

      // Revert account balances
      for (const split of summary.splits) {
        if (split.amount > 0) {
          const acc = await db.accounts.get(split.accountId);
          if (acc) {
            await db.accounts.update(split.accountId, {
              currentBalance: Math.round(acc.currentBalance - split.amount),
              updatedAt: now
            });
          }
        }
      }

      await db.dailySales.update(id, {
        isVoided: true,
        notes: summary.notes ? `${summary.notes} (DIBATALKAN: ${reason})` : `DIBATALKAN: ${reason}`,
        updatedAt: now
      });


      await db.auditLogs.add({
        id: `audit_${Date.now()}`,
        action: 'VOID_DAILY_SALES',
        entityType: 'DAILY_SALES',
        entityId: id,
        details: `Pembatalan penjualan Rp${summary.netSales.toLocaleString('id-ID')}. Alasan: ${reason}`,
        timestamp: now
      });
    });
  }
};
