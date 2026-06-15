const mongoose = require('mongoose');
const salaryAdvanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  reason: { type: String },
  date: { type: Date, default: Date.now },
  repaymentMonth: { type: Number },
  repaymentYear: { type: Number },
  status: { type: String, enum: ['pending', 'repaid', 'deducted'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
}, { timestamps: true });
module.exports = mongoose.model('SalaryAdvance', salaryAdvanceSchema);
