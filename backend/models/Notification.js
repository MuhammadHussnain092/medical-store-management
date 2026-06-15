const mongoose = require('mongoose');
const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['low_stock', 'expiry', 'new_order', 'supplier_due', 'maintenance', 'utility_bill', 'staff', 'revenue', 'general'], default: 'general' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  isRead: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  targetRole: { type: String },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  relatedModel: { type: String },
}, { timestamps: true });
module.exports = mongoose.model('Notification', notificationSchema);
