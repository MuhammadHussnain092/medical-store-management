const mongoose = require('mongoose');
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  company: { type: String },
  email: { type: String },
  phone: { type: String, required: true },
  address: { type: String },
  city: { type: String },
  ntn: { type: String },
  creditLimit: { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0 },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('Supplier', supplierSchema);
