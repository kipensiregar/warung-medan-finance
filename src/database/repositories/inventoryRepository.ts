/**
 * Inventory Repository - Warung Medan Finance
 * Pengelolaan Stok Bahan Baku, Pemakaian Manual Harian, Valuasi Rata-rata Tertimbang (WAC)
 */

import { db } from '../db';
import type { Ingredient, StockMovement, StockMovementType, UnitType } from '../../types';

export const inventoryRepository = {
  async getAllIngredients(storeId?: string): Promise<Ingredient[]> {
    if (storeId && storeId !== 'ALL') {
      return await db.ingredients.filter((i) => i.isActive && i.storeId === storeId).toArray();
    }
    return await db.ingredients.filter((i) => i.isActive).toArray();
  },

  async getIngredientById(id: string): Promise<Ingredient | undefined> {
    return await db.ingredients.get(id);
  },

  async getMovements(ingredientId?: string, storeId?: string): Promise<StockMovement[]> {
    if (ingredientId) {
      return await db.stockMovements
        .filter((m) => {
          if (m.ingredientId !== ingredientId) return false;
          if (storeId && storeId !== 'ALL' && m.storeId !== storeId) return false;
          return true;
        })
        .reverse()
        .sortBy('date');
    }
    if (storeId && storeId !== 'ALL') {
      return await db.stockMovements.filter((m) => m.storeId === storeId).reverse().sortBy('date');
    }
    return await db.stockMovements.orderBy('date').reverse().toArray();
  },

  /**
   * Tambah bahan baru ke master data
   */
  async createIngredient(data: {
    storeId?: string;
    name: string;
    category: string;
    unit: UnitType;
    initialStock: number;
    minimumStock: number;
    purchasePrice: number;
    defaultSupplier?: string;
  }): Promise<Ingredient> {
    const now = new Date().toISOString();
    const id = `ing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const totalValuation = Math.round(data.initialStock * data.purchasePrice);
    const storeId = data.storeId || 'store_palembang_center';

    const ingredient: Ingredient = {
      id,
      storeId,
      name: data.name,
      category: data.category,
      unit: data.unit,
      initialStock: data.initialStock,
      currentStock: data.initialStock,
      minimumStock: data.minimumStock,
      averagePurchasePrice: data.purchasePrice,
      totalValuation,
      defaultSupplier: data.defaultSupplier,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    await db.transaction('rw', [db.ingredients, db.stockMovements, db.auditLogs], async () => {
      await db.ingredients.add(ingredient);

      if (data.initialStock > 0) {
        await db.stockMovements.add({
          id: `mov_init_${Date.now()}`,
          storeId,
          ingredientId: id,
          ingredientName: data.name,
          date: now.slice(0, 10),
          type: 'MASUK_PEMBELIAN',
          quantity: data.initialStock,
          unit: data.unit,
          unitPrice: data.purchasePrice,
          totalAmount: totalValuation,
          notes: 'Stok awal master bahan',
          createdAt: now,
          updatedAt: now
        });
      }

      await db.auditLogs.add({
        id: `audit_${Date.now()}`,
        action: 'ADD_INGREDIENT',
        entityType: 'INGREDIENT',
        entityId: id,
        details: `Tambah bahan baku: ${data.name} (${data.initialStock} ${data.unit})`,
        timestamp: now
      });
    });

    return ingredient;
  },

  /**
   * Catat Pergerakan Stok:
   * - MASUK_PEMBELIAN -> Tambah stok & hitung Weighted Average Cost (WAC)
   * - PEMAKAIAN_MANUAL -> Kurangi stok (pemakaian resep/dapur harian)
   * - RUSAK_TERBUANG -> Kurangi stok (bahan busuk, tumpah, layu)
   * - PENYESUAIAN_OPNAME -> Koreksi stok ke angka fisik riil
   */
  async recordMovement(payload: {
    storeId?: string;
    eventId?: string;
    ingredientId: string;
    date: string;
    type: StockMovementType;
    quantity: number;
    unitPrice?: number;
    notes?: string;
    relatedTransactionId?: string;
    fromStoreId?: string;
    toStoreId?: string;
    isInterStoreTransfer?: boolean;
  }): Promise<StockMovement> {
    if (payload.quantity <= 0) {
      throw new Error('Jumlah stok harus lebih besar dari 0');
    }

    const now = new Date().toISOString();
    const movId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    return await db.transaction('rw', [db.ingredients, db.stockMovements, db.auditLogs], async () => {
      const ing = await db.ingredients.get(payload.ingredientId);
      if (!ing) throw new Error('Bahan baku tidak ditemukan');

      const storeId = payload.storeId || ing.storeId;
      let newStock = ing.currentStock;
      let newAvgPrice = ing.averagePurchasePrice;
      let movementTotalAmount = 0;

      if (payload.type === 'MASUK_PEMBELIAN') {
        const purchasePrice = payload.unitPrice ?? ing.averagePurchasePrice;
        movementTotalAmount = Math.round(payload.quantity * purchasePrice);

        // Weighted Average Cost Formula:
        // (Old Total Cost + New Purchase Cost) / (Old Quantity + New Quantity)
        const oldTotalCost = ing.currentStock * ing.averagePurchasePrice;
        const newTotalCost = oldTotalCost + movementTotalAmount;
        newStock = ing.currentStock + payload.quantity;
        newAvgPrice = newStock > 0 ? Math.round(newTotalCost / newStock) : purchasePrice;
      } else if (payload.type === 'PEMAKAIAN_MANUAL' || payload.type === 'RUSAK_TERBUANG') {
        newStock = Math.max(0, ing.currentStock - payload.quantity);
        movementTotalAmount = Math.round(payload.quantity * ing.averagePurchasePrice);
      } else if (payload.type === 'PENYESUAIAN_OPNAME') {
        // Pada koreksi opname, quantity yang diinput adalah stok fisik baru
        const delta = payload.quantity - ing.currentStock;
        newStock = payload.quantity;
        movementTotalAmount = Math.round(Math.abs(delta) * ing.averagePurchasePrice);
      }

      const newTotalValuation = Math.round(newStock * newAvgPrice);

      await db.ingredients.update(payload.ingredientId, {
        currentStock: newStock,
        averagePurchasePrice: newAvgPrice,
        totalValuation: newTotalValuation,
        updatedAt: now
      });

      const movement: StockMovement = {
        id: movId,
        storeId,
        eventId: payload.eventId,
        ingredientId: ing.id,
        ingredientName: ing.name,
        date: payload.date,
        type: payload.type,
        quantity: payload.quantity,
        unit: ing.unit,
        unitPrice: payload.unitPrice ?? ing.averagePurchasePrice,
        totalAmount: movementTotalAmount,
        notes: payload.notes,
        relatedTransactionId: payload.relatedTransactionId,
        fromStoreId: payload.fromStoreId,
        toStoreId: payload.toStoreId,
        isInterStoreTransfer: payload.isInterStoreTransfer,
        createdAt: now,
        updatedAt: now
      };

      await db.stockMovements.add(movement);

      await db.auditLogs.add({
        id: `audit_${Date.now()}`,
        action: 'STOCK_MOVEMENT',
        storeId,
        entityType: 'INGREDIENT',
        entityId: ing.id,
        details: `${payload.type}: ${ing.name} qty ${payload.quantity} ${ing.unit} (Sisa: ${newStock} ${ing.unit})`,
        timestamp: now
      });

      return movement;
    });
  },

  /**
   * Hitung total valuasi persediaan bahan baku terkini
   */
  async getTotalValuation(storeId?: string): Promise<number> {
    const ingredients = await db.ingredients
      .filter((i) => i.isActive && (!storeId || storeId === 'ALL' || i.storeId === storeId))
      .toArray();
    return ingredients.reduce((sum, item) => sum + item.totalValuation, 0);
  },

  /**
   * Ambil daftar bahan yang stoknya berada di bawah stok minimum
   */
  async getLowStockAlerts(storeId?: string): Promise<Ingredient[]> {
    const ingredients = await db.ingredients
      .filter((i) => i.isActive && (!storeId || storeId === 'ALL' || i.storeId === storeId))
      .toArray();
    return ingredients.filter((i) => i.currentStock <= i.minimumStock);
  }
};
