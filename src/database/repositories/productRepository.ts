/**
 * Product & Menu Repository - Warung Medan Finance
 * Master Menu Khas Medan & Paket Catering
 */

import { db } from '../db';
import type { ProductMenu } from '../../types';

export const productRepository = {
  async getAll(): Promise<ProductMenu[]> {
    return await db.products.toArray();
  },

  async getActive(): Promise<ProductMenu[]> {
    return await db.products.filter((p) => p.isActive).toArray();
  },

  async create(data: {
    name: string;
    category: ProductMenu['category'];
    sellingPrice: number;
    estimatedHpp?: number;
    notes?: string;
  }): Promise<ProductMenu> {
    const now = new Date().toISOString();
    const id = `prd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const product: ProductMenu = {
      id,
      name: data.name,
      category: data.category,
      sellingPrice: data.sellingPrice,
      estimatedHpp: data.estimatedHpp,
      isActive: true,
      notes: data.notes,
      createdAt: now,
      updatedAt: now
    };

    await db.products.add(product);
    return product;
  },

  async update(id: string, updates: Partial<ProductMenu>): Promise<void> {
    await db.products.update(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await db.products.update(id, {
      isActive,
      updatedAt: new Date().toISOString()
    });
  }
};
