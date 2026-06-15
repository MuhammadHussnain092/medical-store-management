const mongoose = require('mongoose');
const payrollSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  basicSalary: { type: Number, required: true },
  bonus: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  overtime: { type: Number, default: 0 },
  netSalary: { type: Number, required: true },
  paymentDate: { type: Date },
  paymentMethod: { type: String, enum: ['cash', 'bank'], default: 'cash' },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  notes: { type: String },
}, { timestamps: true });
module.exports = mongoose.model('Payroll', payrollSchema);
