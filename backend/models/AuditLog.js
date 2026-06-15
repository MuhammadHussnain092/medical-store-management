const mongoose = require('mongoose');
const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String },
  action: { type: String, required: true },
  module: { type: String, required: true },
  description: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  oldData: { type: mongoose.Schema.Types.Mixed },
  newData: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });
module.exports = mongoose.model('AuditLog', auditLogSchema);
