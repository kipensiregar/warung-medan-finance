/**
 * WARUNG MEDAN FINANCE - MULTI-STORE DATA TYPES & DOMAIN MODELS
 * Warung Medan CT Catering
 *
 * Supported Units:
 * 1. Sungai Baung
 * 2. Palembang Center
 * 3. Bazar
 */

export const STORE_SUNGAI_BAUNG_ID = 'store_sungai_baung';
export const STORE_PALEMBANG_CENTER_ID = 'store_palembang_center';
export const STORE_BAZAR_ID = 'store_bazar';
export const CONSOLIDATED_STORE_ID = 'ALL';

export type StoreId = typeof STORE_SUNGAI_BAUNG_ID | typeof STORE_PALEMBANG_CENTER_ID | typeof STORE_BAZAR_ID;

export interface Store {
  id: string; // UUID / stable ID
  name: string; // 'Sungai Baung' | 'Palembang Center' | 'Bazar'
  code: string; // 'SB' | 'PC' | 'BZ'
  address: string;
  phone?: string;
  isBazarUnit?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BazarEvent {
  id: string;
  storeId: string; // linked to STORE_BAZAR_ID
  name: string; // e.g. "Festival Danau Ranau 2026", "Bazar Kuliner PIM"
  location: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  targetRevenue?: number;
  notes?: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

export type SalesChannel = 'Dine-in' | 'Takeaway' | 'Catering' | 'Bazar' | 'Lainnya';

export type PaymentMethod = 'Tunai' | 'Transfer Bank' | 'QRIS' | 'Campuran';

export type AccountType = 'Kas' | 'Bank' | 'E-Wallet';

export type ExpenseCategory =
  | 'Bahan Baku'
  | 'Gaji Karyawan'
  | 'Sewa Tempat'
  | 'Listrik & Air'
  | 'Gas LPG'
  | 'Transportasi & Bensin'
  | 'Kemasan & Plastik'
  | 'Peralatan Masak'
  | 'Perawatan & Servis'
  | 'Pemasaran & Promosi'
  | 'Administrasi & Bank'
  | 'Pajak & Retribusi'
  | 'Lain-lain';

export type TransactionType =
  | 'PENGELUARAN_OPERASIONAL'
  | 'PEMBELIAN_BAHAN_BAKU'
  | 'PEMBELIAN_ASET'
  | 'PEMBAYARAN_UTANG'
  | 'PENERIMAAN_PIUTANG'
  | 'SETORAN_MODAL'
  | 'PRIVE_PEMILIK'
  | 'TRANSFER_ANTAR_AKUN'
  | 'TRANSFER_ANTAR_CABANG';

export type UnitType =
  | 'kg'
  | 'gram'
  | 'liter'
  | 'ml'
  | 'butir'
  | 'potong'
  | 'bungkus'
  | 'pack'
  | 'unit'
  | 'ikat';

export type StockMovementType =
  | 'MASUK_PEMBELIAN'
  | 'PEMAKAIAN_MANUAL'
  | 'RUSAK_TERBUANG'
  | 'PENYESUAIAN_OPNAME'
  | 'TRANSFER_MASUK_CABANG'
  | 'TRANSFER_KELUAR_CABANG';

export interface Account {
  id: string;
  storeId: string; // Unit Cabang Pemilik Akun
  name: string;
  type: AccountType;
  accountNumber?: string;
  initialBalance: number;
  currentBalance: number;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSplitItem {
  accountId: string;
  accountName: string;
  method: 'Tunai' | 'Transfer Bank' | 'QRIS';
  amount: number;
}

export interface DailySalesSummary {
  id: string;
  storeId: string; // Foreign key ke stores
  eventId?: string; // Foreign key opsional ke bazar_events jika unit Bazar
  date: string; // YYYY-MM-DD
  channel: SalesChannel;
  grossSales: number;
  discount: number;
  refund: number;
  netSales: number; // grossSales - discount - refund
  paymentMethod: PaymentMethod;
  splits: PaymentSplitItem[];
  notes?: string;
  referenceNumber?: string;
  isVoided?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialTransaction {
  id: string;
  storeId: string; // Foreign key ke stores
  eventId?: string; // Foreign key opsional ke bazar_events
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: ExpenseCategory | 'Transfer Antar-Akun' | 'Transfer Antar-Cabang' | 'Ekuitas Pemilik' | 'Utang/Piutang';
  amount: number;
  recipientOrSupplier?: string;
  sourceAccountId: string;
  destinationAccountId?: string; // untuk transfer antar akun / antar cabang
  destinationStoreId?: string; // untuk transfer antar cabang
  paymentMethod: 'Tunai' | 'Transfer Bank' | 'QRIS';
  notes?: string;
  referenceNumber?: string;
  attachmentUrl?: string;
  isPayableSettlement?: boolean;
  relatedPayableId?: string;
  isReceivableSettlement?: boolean;
  relatedReceivableId?: string;
  isInterStoreTransfer?: boolean;
  isVoided?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Ingredient {
  id: string;
  storeId: string; // Persediaan bahan baku tersimpan di unit cabang mana
  name: string;
  category: string; // e.g. Bumbu Khas Batak, Daging & Unggas, Ikan Air Tawar, Sayuran, Bahan Pokok
  unit: UnitType;
  initialStock: number;
  currentStock: number;
  minimumStock: number;
  averagePurchasePrice: number; // Weighted average cost per unit
  totalValuation: number; // currentStock * averagePurchasePrice
  defaultSupplier?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  storeId: string; // Unit cabang pencatat mutasi
  eventId?: string; // Terkait event bazar bila ada
  ingredientId: string;
  ingredientName: string;
  date: string; // YYYY-MM-DD
  type: StockMovementType;
  quantity: number; // positive number
  unit: UnitType;
  unitPrice?: number; // for purchase or transfer valuation
  totalAmount?: number;
  notes?: string;
  relatedTransactionId?: string;
  fromStoreId?: string; // untuk transfer stok antar cabang
  toStoreId?: string; // untuk transfer stok antar cabang
  isInterStoreTransfer?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InterStoreStockTransfer {
  id: string;
  date: string;
  fromStoreId: string;
  toStoreId: string;
  ingredientName: string;
  quantity: number;
  unit: UnitType;
  valuationCost: number;
  totalValuation: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductMenu {
  id: string;
  name: string;
  category: 'Lauk Utama' | 'Sayur & Pelengkap' | 'Mie & Sarapan' | 'Paket Catering' | 'Minuman';
  sellingPrice: number;
  estimatedHpp?: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payable {
  id: string;
  storeId: string; // Utang supplier milik cabang mana
  supplierName: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'BELUM_LUNAS' | 'SEBAGIAN' | 'LUNAS';
  category: ExpenseCategory;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Receivable {
  id: string;
  storeId: string; // Piutang catering milik cabang mana
  eventId?: string; // Piutang khusus pesanan event bazar
  customerName: string;
  invoiceNumber: string;
  orderDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'BELUM_LUNAS' | 'SEBAGIAN' | 'LUNAS';
  channel: SalesChannel;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpeningBalanceConfig {
  id: string;
  storeId: string; // Saldo awal per cabang
  effectiveDate: string; // YYYY-MM-DD
  cashBalance: number;
  bankBalance: number;
  ewalletBalance: number;
  initialInventoryValue: number;
  initialPayables: number;
  initialReceivables: number;
  ownerEquity: number;
  isConfirmed: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreBudget {
  id: string;
  storeId: string;
  month: string; // YYYY-MM
  targetRevenue: number;
  maxExpenseBudget: number;
  targetNetProfit: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  storeId?: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
  userEmail?: string;
}

export interface SyncOutboxItem {
  id: string;
  storeId?: string;
  entityType: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payloadJson: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  lastAttemptAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface AppSettings {
  businessName: string;
  ownerName: string;
  address: string;
  phone: string;
  timezone: string;
  pinLockEnabled: boolean;
  pinCode?: string;
  autoSyncEnabled: boolean;
  isDemoMode?: boolean;
  lastSyncAt?: string;
  lastBackupAt?: string;
  defaultStoreId?: string;
}

export interface ProfitLossReport {
  periodLabel: string;
  startDate: string;
  endDate: string;
  storeId?: string;
  storeName?: string;
  isConsolidated?: boolean;
  eventId?: string;
  eventName?: string;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  // HPP breakdown
  beginningInventory: number;
  purchasesForInventory: number;
  endingInventory: number;
  wasteAndDamagedAdjustments: number;
  costOfGoodsSold: number; // HPP
  grossProfit: number; // netSales - costOfGoodsSold
  grossMarginPct: number;
  // Operating Expenses
  operatingExpenses: Record<ExpenseCategory, number>;
  totalOperatingExpenses: number;
  // Inter-store transfer eliminations
  interStoreTransfersIn?: number;
  interStoreTransfersOut?: number;
  eliminatedInternalTransfers?: number;
  // Operating Profit
  operatingProfit: number;
  otherIncome: number;
  otherExpenses: number;
  netProfit: number; // Laba Bersih
  netMarginPct: number;
}

export interface CashFlowReport {
  periodLabel: string;
  startDate: string;
  endDate: string;
  storeId?: string;
  storeName?: string;
  isConsolidated?: boolean;
  startingCash: number;
  cashInflowFromSales: number;
  cashInflowFromReceivables: number;
  cashInflowFromCapital: number;
  cashInflowFromBranchTransfers?: number; // transfer masuk dari cabang lain
  totalCashInflow: number;
  cashOutflowOperating: number;
  cashOutflowInventoryPurchases: number;
  cashOutflowDebtPayments: number;
  cashOutflowAssetPurchases: number;
  cashOutflowPrive: number;
  cashOutflowToBranchTransfers?: number; // transfer keluar ke cabang lain
  totalCashOutflow: number;
  netCashFlow: number;
  endingCash: number;
}

export interface StoreComparisonItem {
  storeId: string;
  storeName: string;
  code: string;
  netSales: number;
  cogs: number;
  operatingExpenses: number;
  grossProfit: number;
  netProfit: number;
  netMarginPct: number;
  activeAccountsCash: number;
  inventoryValuation: number;
  pendingPayables: number;
  pendingReceivables: number;
}
