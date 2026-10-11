/**
 * BAZAR REPOSITORY - Modul Pengelolaan Event & Laporan Khusus Bazar
 * Warung Medan CT Catering
 */

import { db } from '../db';
import { STORE_BAZAR_ID, type BazarEvent, type ProfitLossReport } from '../../types';
import { formatRupiah } from '../../utils/formatters';

export const bazarRepository = {
  async getAllEvents(): Promise<BazarEvent[]> {
    return await db.bazarEvents.orderBy('startDate').reverse().toArray();
  },

  async getActiveEvents(): Promise<BazarEvent[]> {
    return await db.bazarEvents.filter((e) => e.status === 'ACTIVE').toArray();
  },

  async getEventById(id: string): Promise<BazarEvent | undefined> {
    return await db.bazarEvents.get(id);
  },

  async createEvent(data: Omit<BazarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<BazarEvent> {
    const now = new Date().toISOString();
    const id = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const event: BazarEvent = {
      ...data,
      id,
      storeId: STORE_BAZAR_ID,
      createdAt: now,
      updatedAt: now
    };

    await db.bazarEvents.add(event);
    return event;
  },

  async updateEvent(id: string, updates: Partial<BazarEvent>): Promise<void> {
    await db.bazarEvents.update(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Hitung Kinerja Finansial Khusus Satu Event Bazar (Revenue, Expenses, Net Profit per Event)
   */
  async getEventPerformance(eventId: string): Promise<{
    event: BazarEvent;
    grossSales: number;
    discounts: number;
    refunds: number;
    netSales: number;
    totalExpenses: number;
    stockCostUsed: number;
    netProfit: number;
    netMarginPct: number;
  }> {
    const event = await db.bazarEvents.get(eventId);
    if (!event) throw new Error('Event bazar tidak ditemukan');

    // Penjualan terkait event
    const salesList = await db.dailySales.filter((s) => !s.isVoided && s.eventId === eventId).toArray();
    const grossSales = salesList.reduce((sum, s) => sum + s.grossSales, 0);
    const discounts = salesList.reduce((sum, s) => sum + s.discount, 0);
    const refunds = salesList.reduce((sum, s) => sum + s.refund, 0);
    const netSales = Math.round(grossSales - discounts - refunds);

    // Beban langsung event
    const txList = await db.transactions
      .filter((t) => !t.isVoided && t.eventId === eventId && t.type === 'PENGELUARAN_OPERASIONAL')
      .toArray();
    const totalExpenses = txList.reduce((sum, t) => sum + t.amount, 0);

    // Pemakaian bahan di event
    const movements = await db.stockMovements
      .filter((m) => m.eventId === eventId && (m.type === 'PEMAKAIAN_MANUAL' || m.type === 'RUSAK_TERBUANG'))
      .toArray();
    const stockCostUsed = movements.reduce((sum, m) => sum + (m.totalAmount || 0), 0);

    const netProfit = Math.round(netSales - totalExpenses - stockCostUsed);
    const netMarginPct = netSales > 0 ? Number(((netProfit / netSales) * 100).toFixed(1)) : 0;

    return {
      event,
      grossSales,
      discounts,
      refunds,
      netSales,
      totalExpenses,
      stockCostUsed,
      netProfit,
      netMarginPct
    };
  }
};
