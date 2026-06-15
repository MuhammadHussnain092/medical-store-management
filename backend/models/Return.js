const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  medicine:     { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', default: null },
  medicineName: { type: String, required: true },
  quantity:     { type: Number, required: true, min: 1 },
  unitPrice:    { type: Number, required: true, default: 0 },
  subtotal:     { type: Number, required: true, default: 0 },
  reason:       { type: String, default: 'Customer return' },
});

const returnSchema = new mongoose.Schema({
  returnNo:             { type: String, unique: true },
  returnType:           { type: String, enum: ['customer_return','sale_cancellation'], required: true },
  originalSale:         { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
  customer:             { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  customerName:         { type: String, default: 'Walk-in Customer' },
  items:                { type: [returnItemSchema], required: true },
  totalAmount:          { type: Number, required: true, default: 0 },
  refundMethod:         { type: String, enum: ['cash','card','credit','exchange'], default: 'cash' },
  refundStatus:         { type: String, enum: ['pending','completed'], default: 'completed' },
  cancelledWithin3Hours:{ type: Boolean, default: false },
  processedBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes:                { type: String, default: '' },
}, { timestamps: true });

returnSchema.pre('save', function(next) {
  if (!this.returnNo) this.returnNo = 'RET-' + Date.now() + '-' + Math.floor(Math.random()*999);
  next();
});

module.exports = mongoose.model('Return', returnSchema);
