const mongoose = require('mongoose');
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  loyaltyPoints: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0 },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('Customer', customerSchema);
