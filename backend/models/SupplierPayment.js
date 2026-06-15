const mongoose = require('mongoose');
const supplierPaymentSchema = new mongoose.Schema({
  supplier:      { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  amount:        { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash','bank','check'], default: 'cash' },
  reference:     { type: String },
  note:          { type: String },
  paidBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date:          { type: Date, default: Date.now },
}, { timestamps: true });
module.exports = mongoose.model('SupplierPayment', supplierPaymentSchema);
