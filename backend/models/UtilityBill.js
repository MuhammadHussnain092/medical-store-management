const mongoose = require('mongoose');
const utilityBillSchema = new mongoose.Schema({
  type: { type: String, enum: ['electricity', 'gas', 'water', 'internet'], required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  billDate: { type: Date },
  paidDate: { type: Date },
  status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
  billNo: { type: String },
  notes: { type: String },
}, { timestamps: true });
module.exports = mongoose.model('UtilityBill', utilityBillSchema);
