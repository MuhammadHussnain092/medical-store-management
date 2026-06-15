const mongoose = require('mongoose');
const settingsSchema = new mongoose.Schema({
  storeName: { type: String, default: 'Bilal Inayat Medical Store' },
  storeAddress: { type: String },
  storePhone: { type: String },
  storeEmail: { type: String },
  storeLogo: { type: String },
  currency: { type: String, default: 'PKR' },
  taxRate: { type: Number, default: 0 },
  invoiceFooter: { type: String },
  lowStockThreshold: { type: Number, default: 10 },
  expiryAlertDays: { type: Number, default: 30 },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  language: { type: String, enum: ['en', 'ur'], default: 'en' },
  smsEnabled: { type: Boolean, default: false },
  emailEnabled: { type: Boolean, default: false },
  printerType: { type: String, enum: ['a4', 'thermal'], default: 'a4' },
}, { timestamps: true });
module.exports = mongoose.model('Settings', settingsSchema);
