const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
  medicineName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  batchNo: { type: String },
  expiryDate: { type: Date },
  subtotal: { type: Number, required: true },
});

const purchaseSchema = new mongoose.Schema({
  purchaseNo: { type: String, unique: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  items: [purchaseItemSchema],
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
  paymentMethod: { type: String, enum: ['cash', 'bank', 'check'], default: 'cash' },
  invoiceDate: { type: Date, default: Date.now },
  receivedDate: { type: Date },
  status: { type: String, enum: ['ordered', 'received', 'partial', 'cancelled'], default: 'ordered' },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

purchaseSchema.pre('save', function(next) {
  if (!this.purchaseNo) {
    this.purchaseNo = 'PO-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  }
  next();
});

module.exports = mongoose.model('Purchase', purchaseSchema);
