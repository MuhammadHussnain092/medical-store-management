const mongoose = require('mongoose');

// Category Schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String },
  color: { type: String, default: '#3B82F6' },
  icon: { type: String, default: 'pill' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Supplier Schema
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  company: { type: String, trim: true },
  phone: { type: String, required: true },
  email: { type: String, lowercase: true },
  address: { type: String },
  city: { type: String },
  ntn: { type: String },
  bankAccount: { type: String },
  bankName: { type: String },
  totalPurchases: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  creditLimit: { type: Number, default: 0 },
  notes: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

supplierSchema.virtual('balance').get(function() {
  return this.totalPurchases - this.totalPaid;
});

// Customer Schema
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String },
  email: { type: String, lowercase: true },
  address: { type: String },
  cnic: { type: String },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  loyaltyPoints: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  notes: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Sale Schema
const saleSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  customerName: { type: String, default: 'Walk-in Customer' },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    medicineName: { type: String, required: true },
    quantity: { type: Number, required: true },
    purchasePrice: { type: Number, required: true },
    salePrice: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 0 },
    total: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, required: true },
  changeAmount: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['cash', 'card', 'online', 'split'], default: 'cash' },
  splitPayment: {
    cashAmount: { type: Number, default: 0 },
    cardAmount: { type: Number, default: 0 },
    onlineAmount: { type: Number, default: 0 }
  },
  status: { type: String, enum: ['completed', 'cancelled', 'refunded', 'held'], default: 'completed' },
  notes: { type: String },
  prescriptionImage: { type: String }
}, { timestamps: true });

saleSchema.index({ createdAt: -1 });
saleSchema.index({ invoiceNo: 1 });
saleSchema.index({ cashier: 1 });

// Purchase Schema
const purchaseSchema = new mongoose.Schema({
  purchaseNo: { type: String, required: true, unique: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    medicineName: { type: String, required: true },
    quantity: { type: Number, required: true },
    purchasePrice: { type: Number, required: true },
    batchNo: { type: String },
    expiryDate: { type: Date },
    total: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
  paymentMethod: { type: String, enum: ['cash', 'bank', 'cheque'], default: 'cash' },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  supplierInvoiceNo: { type: String },
  status: { type: String, enum: ['received', 'pending', 'cancelled'], default: 'received' },
  notes: { type: String }
}, { timestamps: true });

purchaseSchema.virtual('balance').get(function() {
  return this.totalAmount - this.paidAmount;
});

// Expense Schema
const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: { type: String, enum: ['electricity', 'gas', 'internet', 'rent', 'salary', 'repair', 'maintenance', 'purchase', 'miscellaneous'], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ['cash', 'bank', 'cheque'], default: 'cash' },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receipt: { type: String },
  notes: { type: String },
  isRecurring: { type: Boolean, default: false },
  recurringCycle: { type: String, enum: ['monthly', 'quarterly', 'yearly'] }
}, { timestamps: true });

// Notification Schema
const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['low_stock', 'expiry', 'supplier_due', 'equipment', 'utility', 'salary', 'info', 'warning', 'success', 'error'], default: 'info' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  targetRoles: [{ type: String }],
  targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readBy: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, readAt: { type: Date } }],
  link: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Equipment Asset Schema
const equipmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['fridge', 'ac', 'printer', 'thermal_printer', 'computer', 'ups', 'generator', 'cctv', 'shelf', 'router', 'scanner', 'other'], required: true },
  brand: { type: String },
  model: { type: String },
  serialNo: { type: String },
  purchaseDate: { type: Date },
  purchasePrice: { type: Number },
  warrantyExpiry: { type: Date },
  location: { type: String },
  condition: { type: String, enum: ['excellent', 'good', 'fair', 'poor', 'out_of_service'], default: 'good' },
  lastServiceDate: { type: Date },
  nextServiceDate: { type: Date },
  notes: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Maintenance Log Schema
const maintenanceLogSchema = new mongoose.Schema({
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
  type: { type: String, enum: ['service', 'repair', 'replacement', 'inspection'], required: true },
  description: { type: String, required: true },
  cost: { type: Number, default: 0 },
  performedBy: { type: String },
  performedAt: { type: Date, default: Date.now },
  nextDueDate: { type: Date },
  status: { type: String, enum: ['completed', 'pending', 'in_progress'], default: 'completed' }
}, { timestamps: true });

// Utility Bill Schema
const utilityBillSchema = new mongoose.Schema({
  type: { type: String, enum: ['electricity', 'gas', 'water', 'internet', 'other'], required: true },
  billNo: { type: String },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  paidDate: { type: Date },
  status: { type: String, enum: ['paid', 'unpaid', 'overdue'], default: 'unpaid' },
  month: { type: String },
  notes: { type: String }
}, { timestamps: true });

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  status: { type: String, enum: ['present', 'absent', 'late', 'half_day', 'leave'], default: 'present' },
  workHours: { type: Number, default: 0 },
  overtime: { type: Number, default: 0 },
  notes: { type: String }
}, { timestamps: true });

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

// Payroll Schema
const payrollSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true },
  year: { type: Number, required: true },
  basicSalary: { type: Number, required: true },
  bonus: { type: Number, default: 0 },
  overtime: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  netSalary: { type: Number, required: true },
  paidDate: { type: Date },
  paymentMethod: { type: String, enum: ['cash', 'bank'], default: 'cash' },
  status: { type: String, enum: ['paid', 'unpaid', 'partial'], default: 'unpaid' },
  notes: { type: String }
}, { timestamps: true });

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String },
  action: { type: String, required: true },
  module: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },
  ip: { type: String },
  userAgent: { type: String },
  status: { type: String, enum: ['success', 'failed'], default: 'success' }
}, { timestamps: true });

// Stock Movement Schema
const stockMovementSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  type: { type: String, enum: ['in', 'out', 'adjustment', 'damage', 'return', 'transfer'], required: true },
  quantity: { type: Number, required: true },
  previousQty: { type: Number, required: true },
  newQty: { type: Number, required: true },
  reason: { type: String },
  reference: { type: String },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Return Schema
const returnSchema = new mongoose.Schema({
  returnNo: { type: String, required: true, unique: true },
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
    medicineName: { type: String },
    quantity: { type: Number },
    salePrice: { type: Number },
    total: { type: Number },
    reason: { type: String }
  }],
  totalAmount: { type: Number, required: true },
  refundMethod: { type: String, enum: ['cash', 'store_credit'], default: 'cash' },
  status: { type: String, enum: ['completed', 'pending'], default: 'completed' },
  notes: { type: String }
}, { timestamps: true });

// Settings Schema
const settingsSchema = new mongoose.Schema({
  storeName: { type: String, default: 'Bilal Inayat Medical Store' },
  storeEmail: { type: String },
  storePhone: { type: String },
  storeAddress: { type: String },
  storeCity: { type: String, default: 'Lahore' },
  storeLogo: { type: String },
  currency: { type: String, default: 'PKR' },
  currencySymbol: { type: String, default: 'Rs.' },
  taxEnabled: { type: Boolean, default: true },
  taxPercent: { type: Number, default: 0 },
  loyaltyPointsEnabled: { type: Boolean, default: true },
  loyaltyPointsRate: { type: Number, default: 1 },
  lowStockThreshold: { type: Number, default: 10 },
  invoicePrefix: { type: String, default: 'INV' },
  purchasePrefix: { type: String, default: 'PUR' },
  returnPrefix: { type: String, default: 'RET' },
  receiptHeader: { type: String },
  receiptFooter: { type: String, default: 'Thank you for your purchase!' },
  smsEnabled: { type: Boolean, default: false },
  emailEnabled: { type: Boolean, default: false },
  backupEnabled: { type: Boolean, default: true },
  backupFrequency: { type: String, default: 'daily' }
}, { timestamps: true });

module.exports = {
  Category: mongoose.model('Category', categorySchema),
  Supplier: mongoose.model('Supplier', supplierSchema),
  Customer: mongoose.model('Customer', customerSchema),
  Sale: mongoose.model('Sale', saleSchema),
  Purchase: mongoose.model('Purchase', purchaseSchema),
  Expense: mongoose.model('Expense', expenseSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  Equipment: mongoose.model('Equipment', equipmentSchema),
  MaintenanceLog: mongoose.model('MaintenanceLog', maintenanceLogSchema),
  UtilityBill: mongoose.model('UtilityBill', utilityBillSchema),
  Attendance: mongoose.model('Attendance', attendanceSchema),
  Payroll: mongoose.model('Payroll', payrollSchema),
  AuditLog: mongoose.model('AuditLog', auditLogSchema),
  StockMovement: mongoose.model('StockMovement', stockMovementSchema),
  Return: mongoose.model('Return', returnSchema),
  Settings: mongoose.model('Settings', settingsSchema)
};
