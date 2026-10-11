/**
 * Debt Repository - Warung Medan Finance
 * Pengelolaan Utang Supplier & Piutang Pelanggan Catering
 */

import { db } from '../db';
import type { Payable, Receivable, ExpenseCategory, SalesChannel } from '../../types';

export const debtRepository = {
  // PAYABLES (Utang Supplier)
  async getAllPayables(storeId?: string): Promise<Payable[]> {
    if (storeId && storeId !== 'ALL') {
      return await db.payables.filter((p) => p.storeId === storeId).reverse().sortBy('dueDate');
    }
    return await db.payables.orderBy('dueDate').toArray();
  },

  async createPayable(data: {
    storeId?: string;
    supplierName: string;
    invoiceDate: string;
    dueDate: string;
    totalAmount: number;
    initialPaid?: number;
    category: ExpenseCategory;
    notes?: string;
  }): Promise<Payable> {
    const now = new Date().toISOString();
    const id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const paid = data.initialPaid || 0;
    const remaining = Math.max(0, data.totalAmount - paid);
    const storeId = data.storeId || 'store_palembang_center';

    const payable: Payable = {
      id,
      storeId,
      supplierName: data.supplierName,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      totalAmount: data.totalAmount,
      paidAmount: paid,
      remainingAmount: remaining,
      status: remaining <= 0 ? 'LUNAS' : paid > 0 ? 'SEBAGIAN' : 'BELUM_LUNAS',
      category: data.category,
      notes: data.notes,
      createdAt: now,
      updatedAt: now
    };

    await db.payables.add(payable);
    return payable;
  },

  // RECEIVABLES (Piutang Catering)
  async getAllReceivables(storeId?: string, eventId?: string): Promise<Receivable[]> {
    if (storeId && storeId !== 'ALL' && eventId) {
      return await db.receivables
        .filter((r) => r.storeId === storeId && r.eventId === eventId)
        .reverse()
        .sortBy('dueDate');
    }
    if (storeId && storeId !== 'ALL') {
      return await db.receivables.filter((r) => r.storeId === storeId).reverse().sortBy('dueDate');
    }
    return await db.receivables.orderBy('dueDate').toArray();
  },

  async createReceivable(data: {
    storeId?: string;
    eventId?: string;
    customerName: string;
    invoiceNumber: string;
    orderDate: string;
    dueDate: string;
    totalAmount: number;
    initialPaid?: number;
    channel: SalesChannel;
    notes?: string;
  }): Promise<Receivable> {
    const now = new Date().toISOString();
    const id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const paid = data.initialPaid || 0;
    const remaining = Math.max(0, data.totalAmount - paid);
    const storeId = data.storeId || 'store_palembang_center';

    const receivable: Receivable = {
      id,
      storeId,
      eventId: data.eventId,
      customerName: data.customerName,
      invoiceNumber: data.invoiceNumber,
      orderDate: data.orderDate,
      dueDate: data.dueDate,
      totalAmount: data.totalAmount,
      paidAmount: paid,
      remainingAmount: remaining,
      status: remaining <= 0 ? 'LUNAS' : paid > 0 ? 'SEBAGIAN' : 'BELUM_LUNAS',
      channel: data.channel,
      notes: data.notes,
      createdAt: now,
      updatedAt: now
    };

    await db.receivables.add(receivable);
    return receivable;
  },

  async getSummary(storeId?: string): Promise<{
    totalPayablesRemaining: number;
    totalReceivablesRemaining: number;
  }> {
    const payables = await db.payables
      .filter((p) => p.status !== 'LUNAS' && (!storeId || storeId === 'ALL' || p.storeId === storeId))
      .toArray();
    const receivables = await db.receivables
      .filter((r) => r.status !== 'LUNAS' && (!storeId || storeId === 'ALL' || r.storeId === storeId))
      .toArray();

    const totalPayablesRemaining = payables.reduce((sum, p) => sum + p.remainingAmount, 0);
    const totalReceivablesRemaining = receivables.reduce((sum, r) => sum + r.remainingAmount, 0);

    return { totalPayablesRemaining, totalReceivablesRemaining };
  }
};
