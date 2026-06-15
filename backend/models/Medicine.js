const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  genericName: { type: String, trim: true },
  formula: { type: String },
  brand: { type: String },
  barcode: { type: String, unique: true, sparse: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  batchNo: { type: String },
  rackLocation: { type: String },
  purchasePrice: { type: Number, required: true, default: 0 },
  salePrice: { type: Number, required: true, default: 0 },
  mrp: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  minStockLevel: { type: Number, default: 10 },
  expiryDate: { type: Date },
  manufacturingDate: { type: Date },
  prescriptionRequired: { type: Boolean, default: false },
  taxPercent: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  notes: { type: String },
  images: [{ type: String }],
  isActive: { type: Boolean, default: true },
  unit: { type: String, default: 'strip' },
  packSize: { type: Number, default: 1 },
}, { timestamps: true });

medicineSchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.minStockLevel;
});

medicineSchema.virtual('isExpiringSoon').get(function() {
  if (!this.expiryDate) return false;
  const daysUntilExpiry = Math.ceil((this.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= 30;
});

medicineSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return this.expiryDate < new Date();
});

medicineSchema.set('toJSON', { virtuals: true });
module.exports = mongoose.model('Medicine', medicineSchema);
