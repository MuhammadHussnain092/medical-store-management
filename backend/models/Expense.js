const mongoose = require('mongoose');
const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, enum: ['electricity', 'gas', 'internet', 'rent', 'salary', 'repair', 'maintenance', 'purchase', 'miscellaneous'], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ['cash', 'bank', 'check'], default: 'cash' },
  description: { type: String },
  receipt: { type: String },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isRecurring: { type: Boolean, default: false },
  recurringPeriod: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
}, { timestamps: true });
module.exports = mongoose.model('Expense', expenseSchema);
