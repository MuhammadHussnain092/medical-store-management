const EquipmentAsset = require('../models/EquipmentAsset');
const MaintenanceLog = require('../models/MaintenanceLog');

exports.getAssets = async (req, res) => {
  try {
    const assets = await EquipmentAsset.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: assets });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createAsset = async (req, res) => {
  try {
    const asset = await EquipmentAsset.create(req.body);
    res.status(201).json({ success: true, data: asset, message: 'Asset added successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateAsset = async (req, res) => {
  try {
    const asset = await EquipmentAsset.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.json({ success: true, data: asset, message: 'Asset updated successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteAsset = async (req, res) => {
  try {
    const asset = await EquipmentAsset.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.json({ success: true, message: `${asset.name} has been deleted` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getMaintenanceLogs = async (req, res) => {
  try {
    const logs = await MaintenanceLog.find({ equipment: req.params.assetId }).sort({ date: -1 });
    res.json({ success: true, data: logs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.addMaintenanceLog = async (req, res) => {
  try {
    const log = await MaintenanceLog.create({ ...req.body, equipment: req.params.assetId });
    if (req.body.nextMaintenanceDate) {
      await EquipmentAsset.findByIdAndUpdate(req.params.assetId, {
        nextServiceDate: req.body.nextMaintenanceDate,
        lastServiceDate: new Date()
      });
    }
    res.status(201).json({ success: true, data: log, message: 'Maintenance log added' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
