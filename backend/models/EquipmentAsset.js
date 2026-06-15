const mongoose = require('mongoose');
const equipmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['fridge', 'ac', 'printer', 'thermal_printer', 'computer', 'ups', 'generator', 'cctv', 'shelf', 'wifi_router', 'scanner', 'other'], required: true },
  brand: { type: String },
  model: { type: String },
  serialNo: { type: String },
  purchaseDate: { type: Date },
  purchasePrice: { type: Number },
  warrantyExpiry: { type: Date },
  location: { type: String },
  condition: { type: String, enum: ['excellent', 'good', 'fair', 'poor', 'broken'], default: 'good' },
  lastServiceDate: { type: Date },
  nextServiceDate: { type: Date },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('EquipmentAsset', equipmentSchema);
