const mongoose = require('mongoose');
const maintenanceSchema = new mongoose.Schema({
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'EquipmentAsset', required: true },
  type: { type: String, enum: ['routine', 'repair', 'replacement', 'inspection'], required: true },
  description: { type: String, required: true },
  cost: { type: Number, default: 0 },
  performedBy: { type: String },
  date: { type: Date, default: Date.now },
  nextMaintenanceDate: { type: Date },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'completed' },
}, { timestamps: true });
module.exports = mongoose.model('MaintenanceLog', maintenanceSchema);
