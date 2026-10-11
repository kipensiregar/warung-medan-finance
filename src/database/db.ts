/**
 * WARUNG MEDAN FINANCE - DEXIE MULTI-STORE DATABASE
 * Warung Medan CT Catering
 *
 * Supported Business Units:
 * 1. Sungai Baung (STORE_SUNGAI_BAUNG_ID)
 * 2. Palembang Center (STORE_PALEMBANG_CENTER_ID)
 * 3. Bazar (STORE_BAZAR_ID)
 */

import Dexie, { type Table } from 'dexie';
import {
  STORE_SUNGAI_BAUNG_ID,
  STORE_PALEMBANG_CENTER_ID,
  STORE_BAZAR_ID,
  CONSOLIDATED_STORE_ID,
  type Store,
  type BazarEvent,
  type StoreBudget,
  type Account,
  type DailySalesSummary,
  type FinancialTransaction,
  type Ingredient,
  type StockMovement,
  type ProductMenu,
  type Payable,
  type Receivable,
  type OpeningBalanceConfig,
  type AuditLog,
  type SyncOutboxItem,
  type AppSettings
} from '../types';

export class WarungFinanceDB extends Dexie {
  stores!: Table<Store, string>;
  bazarEvents!: Table<BazarEvent, string>;
  budgets!: Table<StoreBudget, string>;
  accounts!: Table<Account, string>;
  dailySales!: Table<DailySalesSummary, string>;
  transactions!: Table<FinancialTransaction, string>;
  ingredients!: Table<Ingredient, string>;
  stockMovements!: Table<StockMovement, string>;
  products!: Table<ProductMenu, string>;
  payables!: Table<Payable, string>;
  receivables!: Table<Receivable, string>;
  openingBalances!: Table<OpeningBalanceConfig, string>;
  auditLogs!: Table<AuditLog, string>;
  syncOutbox!: Table<SyncOutboxItem, string>;
  settings!: Table<AppSettings & { id: string }, string>;

  constructor() {
    super('WarungMedanFinanceDB');

    // Version 1: Legacy Single Store
    this.version(1).stores({
      accounts: 'id, name, type',
      dailySales: 'id, date, channel, paymentMethod, isVoided',
      transactions: 'id, date, type, category, sourceAccountId, isVoided',
      ingredients: 'id, name, category, isActive',
      stockMovements: 'id, ingredientId, date, type',
      products: 'id, name, category, isActive',
      payables: 'id, supplierName, dueDate, status',
      receivables: 'id, customerName, dueDate, status',
      openingBalances: 'id, effectiveDate',
      auditLogs: 'id, timestamp, action, entityType',
      syncOutbox: 'id, entityType, status, createdAt',
      settings: 'id'
    });

    // Version 2: Multi-Store Finance Expansion
    this.version(2)
      .stores({
        stores: 'id, name, code, isActive',
        bazarEvents: 'id, storeId, status, startDate, endDate',
        budgets: 'id, storeId, month',
        accounts: 'id, storeId, name, type',
        dailySales: 'id, storeId, eventId, date, channel, paymentMethod, isVoided',
        transactions: 'id, storeId, eventId, date, type, category, sourceAccountId, destinationStoreId, isVoided',
        ingredients: 'id, storeId, name, category, isActive',
        stockMovements: 'id, storeId, eventId, ingredientId, date, type, fromStoreId, toStoreId',
        products: 'id, name, category, isActive',
        payables: 'id, storeId, supplierName, dueDate, status',
        receivables: 'id, storeId, eventId, customerName, dueDate, status',
        openingBalances: 'id, storeId, effectiveDate',
        auditLogs: 'id, storeId, timestamp, action, entityType',
        syncOutbox: 'id, storeId, entityType, status, createdAt',
        settings: 'id'
      })
      .upgrade(async (tx) => {
        // Upgrade migration: Pastikan semua data historis terpetakan dengan aman
        // Menandai record lama yang belum memiliki storeId
        await tx.table('accounts').toCollection().modify((acc: any) => {
          if (!acc.storeId) acc.storeId = STORE_PALEMBANG_CENTER_ID;
        });
        await tx.table('dailySales').toCollection().modify((sale: any) => {
          if (!sale.storeId) {
            sale.storeId = sale.channel === 'Bazar' ? STORE_BAZAR_ID : STORE_PALEMBANG_CENTER_ID;
          }
        });
        await tx.table('transactions').toCollection().modify((t: any) => {
          if (!t.storeId) t.storeId = STORE_PALEMBANG_CENTER_ID;
        });
        await tx.table('ingredients').toCollection().modify((i: any) => {
          if (!i.storeId) i.storeId = STORE_PALEMBANG_CENTER_ID;
        });
        await tx.table('stockMovements').toCollection().modify((m: any) => {
          if (!m.storeId) m.storeId = STORE_PALEMBANG_CENTER_ID;
        });
        await tx.table('payables').toCollection().modify((p: any) => {
          if (!p.storeId) p.storeId = STORE_PALEMBANG_CENTER_ID;
        });
        await tx.table('receivables').toCollection().modify((r: any) => {
          if (!r.storeId) r.storeId = r.channel === 'Bazar' ? STORE_BAZAR_ID : STORE_PALEMBANG_CENTER_ID;
        });
        await tx.table('openingBalances').toCollection().modify((ob: any) => {
          if (!ob.storeId) ob.storeId = STORE_PALEMBANG_CENTER_ID;
        });
      });
  }
}

export const db = new WarungFinanceDB();

/**
 * Initial Default Seed Data for Multi-Store Warung Medan CT Catering
 */
export async function seedInitialDataIfEmpty(): Promise<void> {
  const storeCount = await db.stores.count();
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // 1. Inisialisasi 3 Cabang Wajib
  if (storeCount === 0) {
    const defaultStores: Store[] = [
      {
        id: STORE_SUNGAI_BAUNG_ID,
        name: 'Sungai Baung',
        code: 'SB',
        address: 'Kompleks Industri Sungai Baung, OKI, Sumatera Selatan',
        phone: '0813-7890-1122',
        isBazarUnit: false,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: STORE_PALEMBANG_CENTER_ID,
        name: 'Palembang Center',
        code: 'PC',
        address: 'Jl. R. Sukamto No. 88, Palembang',
        phone: '0812-3456-7890',
        isBazarUnit: false,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: STORE_BAZAR_ID,
        name: 'Bazar',
        code: 'BZ',
        address: 'Unit Operasional Bazar & Mobile Catering Event',
        phone: '0811-9988-7766',
        isBazarUnit: true,
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ];
    await db.stores.bulkAdd(defaultStores);
  }

  // 2. Inisialisasi Event Bazar Awal
  const eventCount = await db.bazarEvents.count();
  if (eventCount === 0) {
    const defaultEvents: BazarEvent[] = [
      {
        id: 'ev_danau_ranau_2026',
        storeId: STORE_BAZAR_ID,
        name: 'Festival Danau Ranau 2026',
        location: 'Bandar Agung, Ranau',
        startDate: '2026-10-01',
        endDate: '2026-10-15',
        targetRevenue: 15000000,
        notes: 'Stand kuliner khas Batak & Medan CT Catering di festival danau',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'ev_kuliner_pim_2026',
        storeId: STORE_BAZAR_ID,
        name: 'Bazar Kuliner PIM Palembang',
        location: 'Atrium Palembang Indah Mall',
        startDate: '2026-10-20',
        endDate: '2026-10-25',
        targetRevenue: 12000000,
        notes: 'Event akhir pekan tenant kuliner tradisional',
        status: 'UPCOMING',
        createdAt: now,
        updatedAt: now
      }
    ];
    await db.bazarEvents.bulkAdd(defaultEvents);
  }

  // 3. Inisialisasi Akun Kas & Bank per Cabang
  const accountCount = await db.accounts.count();
  if (accountCount === 0) {
    const initialAccounts: Account[] = [
      // SUNGAI BAUNG
      {
        id: 'acc_kas_sb',
        storeId: STORE_SUNGAI_BAUNG_ID,
        name: 'Kas Fisik Sungai Baung (Laci)',
        type: 'Kas',
        accountNumber: 'KAS-SB-01',
        initialBalance: 2000000,
        currentBalance: 2000000,
        isDefault: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'acc_bank_sb',
        storeId: STORE_SUNGAI_BAUNG_ID,
        name: 'BCA Operasional Sungai Baung',
        type: 'Bank',
        accountNumber: '8220194821',
        initialBalance: 12000000,
        currentBalance: 12000000,
        isDefault: false,
        createdAt: now,
        updatedAt: now
      },

      // PALEMBANG CENTER
      {
        id: 'acc_kas_pc',
        storeId: STORE_PALEMBANG_CENTER_ID,
        name: 'Kas Fisik Palembang Center (Laci)',
        type: 'Kas',
        accountNumber: 'KAS-PC-01',
        initialBalance: 3000000,
        currentBalance: 3000000,
        isDefault: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'acc_bank_pc',
        storeId: STORE_PALEMBANG_CENTER_ID,
        name: 'BCA Rekening CT Catering Palembang',
        type: 'Bank',
        accountNumber: '8220194829',
        initialBalance: 18000000,
        currentBalance: 18000000,
        isDefault: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'acc_qris_pc',
        storeId: STORE_PALEMBANG_CENTER_ID,
        name: 'QRIS & E-Wallet Palembang Center',
        type: 'E-Wallet',
        accountNumber: 'QRIS-PC-88',
        initialBalance: 1500000,
        currentBalance: 1500000,
        isDefault: false,
        createdAt: now,
        updatedAt: now
      },

      // BAZAR
      {
        id: 'acc_kas_bazar',
        storeId: STORE_BAZAR_ID,
        name: 'Kas Kasir Stand Bazar',
        type: 'Kas',
        accountNumber: 'KAS-BZ-01',
        initialBalance: 1000000,
        currentBalance: 1000000,
        isDefault: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'acc_qris_bazar',
        storeId: STORE_BAZAR_ID,
        name: 'QRIS Event Bazar',
        type: 'E-Wallet',
        accountNumber: 'QRIS-BZ-99',
        initialBalance: 800000,
        currentBalance: 800000,
        isDefault: false,
        createdAt: now,
        updatedAt: now
      }
    ];
    await db.accounts.bulkAdd(initialAccounts);
  }

  // 4. Inisialisasi Bahan Baku per Cabang
  const ingredientCount = await db.ingredients.count();
  if (ingredientCount === 0) {
    const makeIngsForStore = (storeId: string, prefix: string) => [
      {
        id: `${prefix}_andaliman`,
        storeId,
        name: 'Andaliman Segar Khas Toba',
        category: 'Bumbu Khas Batak',
        unit: 'kg' as const,
        initialStock: 10,
        currentStock: 10,
        minimumStock: 3,
        averagePurchasePrice: 85000,
        totalValuation: 10 * 85000,
        defaultSupplier: 'Inang Pasar Sambu Medan',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: `${prefix}_beras_ramos`,
        storeId,
        name: 'Beras Ramos Super',
        category: 'Bahan Pokok',
        unit: 'kg' as const,
        initialStock: 200,
        currentStock: 200,
        minimumStock: 40,
        averagePurchasePrice: 15000,
        totalValuation: 200 * 15000,
        defaultSupplier: 'Toko Beras Sinar Jaya',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: `${prefix}_ayam_kampung`,
        storeId,
        name: 'Ayam Kampung Segar (Napinadar)',
        category: 'Daging & Unggas',
        unit: 'potong' as const,
        initialStock: 35,
        currentStock: 35,
        minimumStock: 10,
        averagePurchasePrice: 65000,
        totalValuation: 35 * 65000,
        defaultSupplier: 'Agen Ayam Berastagi',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: `${prefix}_ikan_mas`,
        storeId,
        name: 'Ikan Mas Segar Hidup (Arsik)',
        category: 'Ikan Air Tawar',
        unit: 'kg' as const,
        initialStock: 25,
        currentStock: 25,
        minimumStock: 8,
        averagePurchasePrice: 42000,
        totalValuation: 25 * 42000,
        defaultSupplier: 'Petani Ikan Toba',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: `${prefix}_minyak_goreng`,
        storeId,
        name: 'Minyak Goreng Jerigen Kemasan',
        category: 'Bahan Pokok',
        unit: 'liter' as const,
        initialStock: 50,
        currentStock: 50,
        minimumStock: 15,
        averagePurchasePrice: 17500,
        totalValuation: 50 * 17500,
        defaultSupplier: 'Distributor Sembako',
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ];

    const allIngs = [
      ...makeIngsForStore(STORE_SUNGAI_BAUNG_ID, 'ing_sb'),
      ...makeIngsForStore(STORE_PALEMBANG_CENTER_ID, 'ing_pc'),
      ...makeIngsForStore(STORE_BAZAR_ID, 'ing_bz')
    ];
    await db.ingredients.bulkAdd(allIngs);
  }

  // 5. Inisialisasi Master Produk / Menu
  const productCount = await db.products.count();
  if (productCount === 0) {
    const initialProducts: ProductMenu[] = [
      {
        id: 'prd_napinadar',
        name: 'Paket Ayam Napinadar Khas Batak',
        category: 'Lauk Utama',
        sellingPrice: 45000,
        estimatedHpp: 24000,
        isActive: true,
        notes: 'Disajikan dengan sambal goti andaliman & daun ubi tumbuk',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'prd_naniura',
        name: 'Naniura Ikan Mas (Sashimi Khas Batak)',
        category: 'Lauk Utama',
        sellingPrice: 50000,
        estimatedHpp: 26000,
        isActive: true,
        notes: 'Ikan segar dimatangkan asam jungga & bumbu andaliman',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'prd_arsik',
        name: 'Arsik Ikan Mas Andaliman',
        category: 'Lauk Utama',
        sellingPrice: 42000,
        estimatedHpp: 22000,
        isActive: true,
        notes: 'Kaya rempah lokio, asam gelugur & andaliman',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'prd_nila_tombur',
        name: 'Nila Bakar/Goreng Sambal Tombur',
        category: 'Lauk Utama',
        sellingPrice: 38000,
        estimatedHpp: 19000,
        isActive: true,
        notes: 'Sambal tombur andaliman kecombrang',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'prd_mie_sop',
        name: 'Mie Sop Medan Kaldu Ayam Spesial',
        category: 'Mie & Sarapan',
        sellingPrice: 25000,
        estimatedHpp: 11000,
        isActive: true,
        notes: 'Kuah rempah wangi kapulaga kayu manis, kerupuk merah',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'prd_mie_gomak_kuah',
        name: 'Mie Gomak Kuah Lontong Andaliman',
        category: 'Mie & Sarapan',
        sellingPrice: 22000,
        estimatedHpp: 9500,
        isActive: true,
        notes: 'Spaghetti batak dengan kuah santan bumbu andaliman gurih pedas',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'prd_lontong_medan',
        name: 'Lontong Sayur Medan Komplit',
        category: 'Mie & Sarapan',
        sellingPrice: 28000,
        estimatedHpp: 12500,
        isActive: true,
        notes: 'Sayur tauco, rendang telur, sambal teri kacang, kerupuk udang',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'prd_catering_prasmanan',
        name: 'Paket Catering Prasmanan Adat/Pesta (Per Porsi)',
        category: 'Paket Catering',
        sellingPrice: 65000,
        estimatedHpp: 32000,
        isActive: true,
        notes: 'Menu lengkap lauk utama, sop, sayur, sambal andaliman & buah',
        createdAt: now,
        updatedAt: now
      }
    ];
    await db.products.bulkAdd(initialProducts);
  }

  // 6. Inisialisasi Saldo Awal per Cabang
  const opbCount = await db.openingBalances.count();
  if (opbCount === 0) {
    const openingConfigs: OpeningBalanceConfig[] = [
      {
        id: 'opb_sb',
        storeId: STORE_SUNGAI_BAUNG_ID,
        effectiveDate: today,
        cashBalance: 2000000,
        bankBalance: 12000000,
        ewalletBalance: 0,
        initialInventoryValue: 7850000,
        initialPayables: 2000000,
        initialReceivables: 3000000,
        ownerEquity: 2000000 + 12000000 + 7850000 + 3000000 - 2000000,
        isConfirmed: true,
        notes: 'Saldo awal pembukuan unit Sungai Baung',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'opb_pc',
        storeId: STORE_PALEMBANG_CENTER_ID,
        effectiveDate: today,
        cashBalance: 3000000,
        bankBalance: 18000000,
        ewalletBalance: 1500000,
        initialInventoryValue: 7850000,
        initialPayables: 3500000,
        initialReceivables: 4800000,
        ownerEquity: 3000000 + 18000000 + 1500000 + 7850000 + 4800000 - 3500000,
        isConfirmed: true,
        notes: 'Saldo awal pembukuan unit Palembang Center',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'opb_bz',
        storeId: STORE_BAZAR_ID,
        effectiveDate: today,
        cashBalance: 1000000,
        bankBalance: 0,
        ewalletBalance: 800000,
        initialInventoryValue: 7850000,
        initialPayables: 500000,
        initialReceivables: 1200000,
        ownerEquity: 1000000 + 800000 + 7850000 + 1200000 - 500000,
        isConfirmed: true,
        notes: 'Saldo awal pembukuan unit Bazar & Event',
        createdAt: now,
        updatedAt: now
      }
    ];
    await db.openingBalances.bulkAdd(openingConfigs);
  }

  // 7. Inisialisasi Anggaran Target Bulanan per Cabang
  const budgetCount = await db.budgets.count();
  if (budgetCount === 0) {
    const currentMonth = today.slice(0, 7);
    const initialBudgets: StoreBudget[] = [
      {
        id: `bgt_sb_${currentMonth}`,
        storeId: STORE_SUNGAI_BAUNG_ID,
        month: currentMonth,
        targetRevenue: 45000000,
        maxExpenseBudget: 22000000,
        targetNetProfit: 15000000,
        notes: 'Target bulanan operasional catering Sungai Baung',
        createdAt: now,
        updatedAt: now
      },
      {
        id: `bgt_pc_${currentMonth}`,
        storeId: STORE_PALEMBANG_CENTER_ID,
        month: currentMonth,
        targetRevenue: 60000000,
        maxExpenseBudget: 28000000,
        targetNetProfit: 20000000,
        notes: 'Target bulanan resto & catering Palembang Center',
        createdAt: now,
        updatedAt: now
      },
      {
        id: `bgt_bz_${currentMonth}`,
        storeId: STORE_BAZAR_ID,
        month: currentMonth,
        targetRevenue: 25000000,
        maxExpenseBudget: 12000000,
        targetNetProfit: 8000000,
        notes: 'Target bulanan event bazar dan festival kuliner',
        createdAt: now,
        updatedAt: now
      }
    ];
    await db.budgets.bulkAdd(initialBudgets);
  }

  // 8. Settings
  const settingCount = await db.settings.count();
  if (settingCount === 0) {
    const appSettings: AppSettings & { id: string } = {
      id: 'app_settings',
      businessName: 'Warung Medan CT Catering',
      ownerName: 'Pemilik Usaha CT',
      address: 'Jl. R. Sukamto No. 88, Palembang',
      phone: '0812-3456-7890',
      timezone: 'Asia/Jakarta',
      pinLockEnabled: false,
      autoSyncEnabled: true,
      isDemoMode: true,
      defaultStoreId: CONSOLIDATED_STORE_ID,
      lastSyncAt: now,
      lastBackupAt: now
    };
    await db.settings.add(appSettings);
  }
}

/**
 * Migrasi Transaksi Tanpa Cabang (Unassigned Legacy Records)
 * Mengizinkan pemilik memetakan seluruh data lama yang belum ber-storeId ke cabang tertentu
 */
export async function migrateUnassignedRecordsToStore(targetStoreId: string): Promise<number> {
  let updatedCount = 0;
  await db.transaction(
    'rw',
    [
      db.accounts,
      db.dailySales,
      db.transactions,
      db.ingredients,
      db.stockMovements,
      db.payables,
      db.receivables,
      db.openingBalances
    ],
    async () => {
      const sales = await db.dailySales.filter((s) => !s.storeId).toArray();
      for (const s of sales) {
        await db.dailySales.update(s.id, { storeId: targetStoreId });
        updatedCount++;
      }

      const txs = await db.transactions.filter((t) => !t.storeId).toArray();
      for (const t of txs) {
        await db.transactions.update(t.id, { storeId: targetStoreId });
        updatedCount++;
      }

      const accs = await db.accounts.filter((a) => !a.storeId).toArray();
      for (const a of accs) {
        await db.accounts.update(a.id, { storeId: targetStoreId });
        updatedCount++;
      }

      const ings = await db.ingredients.filter((i) => !i.storeId).toArray();
      for (const i of ings) {
        await db.ingredients.update(i.id, { storeId: targetStoreId });
        updatedCount++;
      }
    }
  );

  return updatedCount;
}
