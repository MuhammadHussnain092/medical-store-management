const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  purchasePrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
});

const saleSchema = new mongoose.Schema({
  invoiceNo: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, default: 'Walk-in Customer' },
  items: [saleItemSchema],
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, required: true },
  changeAmount: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['cash', 'card', 'online', 'split'], default: 'cash' },
  paymentDetails: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['completed', 'held', 'cancelled', 'refunded'], default: 'completed' },
  servedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  isReturn: { type: Boolean, default: false },
}, { timestamps: true });

saleSchema.pre('save', function(next) {
  if (!this.invoiceNo) {
    this.invoiceNo = 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  }
  next();
});

module.exports = mongoose.model('Sale', saleSchema);
