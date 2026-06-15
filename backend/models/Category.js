const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String },
  color: { type: String, default: '#3B82F6' },
  icon: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('Category', categorySchema);
