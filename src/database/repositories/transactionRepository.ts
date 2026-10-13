/**
 * Transaction Repository - Warung Medan Finance
 * Pencatatan Pengeluaran Operasional, Pembelian Bahan/Aset, Utang-Piutang, Prive/Modal
 */

import { db } from '../db';
import type { FinancialTransaction, TransactionType, ExpenseCategory } from '../../types';

export const transactionRepository = {
  async getAll(storeId?: string): Promise<FinancialTransaction[]> {
    if (storeId && storeId !== 'ALL') {
      return await db.transactions.filter((t) => t.storeId === storeId).reverse().sortBy('date');
    }
    return await db.transactions.orderBy('date').reverse().toArray();
  },

  async getByDateRange(
    startDate: string,
    endDate: string,
    storeId?: string,
    eventId?: string
  ): Promise<FinancialTransaction[]> {
    return await db.transactions
      .filter((t) => {
        if (t.isVoided) return false;
        if (t.date < startDate || t.date > endDate) return false;
        if (storeId && storeId !== 'ALL' && t.storeId !== storeId) return false;
        if (eventId && t.eventId !== eventId) return false;
        return true;
      })
      .toArray();
  },

  async createTransaction(payload: {
    storeId?: string;
    eventId?: string;
    date: string;
    type: TransactionType;
    category: ExpenseCategory | 'Transfer Antar-Akun' | 'Transfer Antar-Cabang' | 'Ekuitas Pemilik' | 'Utang/Piutang';
    amount: number;
    sourceAccountId: string;
    destinationAccountId?: string;
    destinationStoreId?: string;
    isInterStoreTransfer?: boolean;
    recipientOrSupplier?: string;
    paymentMethod: 'Tunai' | 'Transfer Bank' | 'QRIS';
    notes?: string;
    referenceNumber?: string;
    attachmentUrl?: string;
    relatedPayableId?: string;
    relatedReceivableId?: string;
  }): Promise<FinancialTransaction> {
    if (payload.amount <= 0) {
      throw new Error('Nominal transaksi harus lebih besar dari 0');
    }

    const now = new Date().toISOString();
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return await db.transaction(
      'rw',
      [db.transactions, db.accounts, db.payables, db.receivables, db.auditLogs],
      async () => {
        const sourceAcc = await db.accounts.get(payload.sourceAccountId);
        if (!sourceAcc) throw new Error('Akun sumber dana tidak ditemukan');

        // Logic penyesuaian saldo akun berdasarkan jenis transaksi
        if (payload.type === 'TRANSFER_ANTAR_AKUN') {
          if (!payload.destinationAccountId) throw new Error('Akun tujuan harus dipilih');
          const destAcc = await db.accounts.get(payload.destinationAccountId);
          if (!destAcc) throw new Error('Akun tujuan transfer tidak ditemukan');

          await db.accounts.update(payload.sourceAccountId, {
            currentBalance: Math.round(sourceAcc.currentBalance - payload.amount),
            updatedAt: now
          });
          await db.accounts.update(payload.destinationAccountId, {
            currentBalance: Math.round(destAcc.currentBalance + payload.amount),
            updatedAt: now
          });
        } else if (payload.type === 'SETORAN_MODAL') {
          // Kas/Bank bertambah (uang masuk dari pemilik)
          await db.accounts.update(payload.sourceAccountId, {
            currentBalance: Math.round(sourceAcc.currentBalance + payload.amount),
            updatedAt: now
          });
        } else if (payload.type === 'PENERIMAAN_PIUTANG') {
          // Kas/Bank bertambah (pelunasan tagihan catering)
          await db.accounts.update(payload.sourceAccountId, {
            currentBalance: Math.round(sourceAcc.currentBalance + payload.amount),
            updatedAt: now
          });

          // Update data piutang jika terkait ID piutang
          if (payload.relatedReceivableId) {
            const rec = await db.receivables.get(payload.relatedReceivableId);
            if (rec) {
              const newPaid = Math.round(rec.paidAmount + payload.amount);
              const remaining = Math.max(0, Math.round(rec.totalAmount - newPaid));
              await db.receivables.update(payload.relatedReceivableId, {
                paidAmount: newPaid,
                remainingAmount: remaining,
                status: remaining <= 0 ? 'LUNAS' : 'SEBAGIAN',
                updatedAt: now
              });
            }
          }
        } else {
          // Pengeluaran operasional, pembelian bahan, aset, bayar utang, prive pemilik -> Kas berkurang
          await db.accounts.update(payload.sourceAccountId, {
            currentBalance: Math.round(sourceAcc.currentBalance - payload.amount),
            updatedAt: now
          });

          // Update data utang jika pelunasan utang supplier
          if (payload.type === 'PEMBAYARAN_UTANG' && payload.relatedPayableId) {
            const pay = await db.payables.get(payload.relatedPayableId);
            if (pay) {
              const newPaid = Math.round(pay.paidAmount + payload.amount);
              const remaining = Math.max(0, Math.round(pay.totalAmount - newPaid));
              await db.payables.update(payload.relatedPayableId, {
                paidAmount: newPaid,
                remainingAmount: remaining,
                status: remaining <= 0 ? 'LUNAS' : 'SEBAGIAN',
                updatedAt: now
              });
            }
          }
        }

        const tx: FinancialTransaction = {
          id,
          storeId: payload.storeId || sourceAcc.storeId,
          eventId: payload.eventId,
          date: payload.date,
          type: payload.type,
          category: payload.category,
          amount: payload.amount,
          recipientOrSupplier: payload.recipientOrSupplier,
          sourceAccountId: payload.sourceAccountId,
          destinationAccountId: payload.destinationAccountId,
          destinationStoreId: payload.destinationStoreId,
          isInterStoreTransfer: payload.isInterStoreTransfer || false,
          paymentMethod: payload.paymentMethod,
          notes: payload.notes,
          referenceNumber: payload.referenceNumber,
          attachmentUrl: payload.attachmentUrl,
          relatedPayableId: payload.relatedPayableId,
          relatedReceivableId: payload.relatedReceivableId,
          isPayableSettlement: payload.type === 'PEMBAYARAN_UTANG',
          isReceivableSettlement: payload.type === 'PENERIMAAN_PIUTANG',
          isVoided: false,
          createdAt: now,
          updatedAt: now
        };

        await db.transactions.add(tx);

        await db.auditLogs.add({
          id: `audit_${Date.now()}`,
          action: 'ADD_TRANSACTION',
          entityType: 'TRANSACTION',
          entityId: id,
          details: `Transaksi ${payload.type} (${payload.category}) senilai Rp${payload.amount.toLocaleString('id-ID')}`,
          timestamp: now
        });

        return tx;
      }
    );
  },

  async voidTransaction(id: string, reason: string): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.transactions, db.accounts, db.auditLogs], async () => {
      const tx = await db.transactions.get(id);
      if (!tx) throw new Error('Transaksi tidak ditemukan');
      if (tx.isVoided) throw new Error('Transaksi sudah dibatalkan sebelumnya');

      const sourceAcc = await db.accounts.get(tx.sourceAccountId);
      if (sourceAcc) {
        if (tx.type === 'SETORAN_MODAL' || tx.type === 'PENERIMAAN_PIUTANG') {
          // Revert: kurangi saldo kembali
          await db.accounts.update(tx.sourceAccountId, {
            currentBalance: Math.round(sourceAcc.currentBalance - tx.amount),
            updatedAt: now
          });
        } else if (tx.type === 'TRANSFER_ANTAR_AKUN') {
          // Revert transfer
          await db.accounts.update(tx.sourceAccountId, {
            currentBalance: Math.round(sourceAcc.currentBalance + tx.amount),
            updatedAt: now
          });
          if (tx.destinationAccountId) {
            const destAcc = await db.accounts.get(tx.destinationAccountId);
            if (destAcc) {
              await db.accounts.update(tx.destinationAccountId, {
                currentBalance: Math.round(destAcc.currentBalance - tx.amount),
                updatedAt: now
              });
            }
          }
        } else {
          // Pengeluaran dibatalkan: kembalikan dana ke akun sumber
          await db.accounts.update(tx.sourceAccountId, {
            currentBalance: Math.round(sourceAcc.currentBalance + tx.amount),
            updatedAt: now
          });
        }
      }

      await db.transactions.update(id, {
        isVoided: true,
        notes: tx.notes ? `${tx.notes} (DIBATALKAN: ${reason})` : `DIBATALKAN: ${reason}`,
        updatedAt: now
      });

      const updatedTx = await db.transactions.get(id);
      if (sourceAcc) {
        const freshSource = await db.accounts.get(tx.sourceAccountId);
      }
      if (tx.destinationAccountId) {
        const freshDest = await db.accounts.get(tx.destinationAccountId);
      }

      await db.auditLogs.add({
        id: `audit_${Date.now()}`,
        action: 'VOID_TRANSACTION',
        entityType: 'TRANSACTION',
        entityId: id,
        details: `Pembatalan transaksi Rp${tx.amount.toLocaleString('id-ID')}. Alasan: ${reason}`,
        timestamp: now
      });
    });
  }
};
