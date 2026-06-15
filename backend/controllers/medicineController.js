const Medicine = require('../models/Medicine');

exports.getMedicines = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, lowStock, expiring } = req.query;
    let query = { isActive: true };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { genericName: { $regex: search, $options: 'i' } },
      { barcode: { $regex: search, $options: 'i' } },
    ];
    if (category) query.category = category;
    if (lowStock === 'true') query.$expr = { $lte: ['$quantity', '$minStockLevel'] };
    if (expiring === 'true') {
      const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
      query.expiryDate = { $lte: thirtyDays, $gte: new Date() };
    }
    const total = await Medicine.countDocuments(query);
    const medicines = await Medicine.find(query)
      .populate('category', 'name color')
      .populate('supplier', 'name phone')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, data: medicines, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id).populate('category supplier');
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, data: medicine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.create(req.body);
    res.status(201).json({ success: true, data: medicine, message: 'Medicine added' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, data: medicine, message: 'Medicine updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, message: 'Medicine deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getByBarcode = async (req, res) => {
  try {
    const medicine = await Medicine.findOne({ barcode: req.params.barcode, isActive: true }).populate('category');
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, data: medicine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const medicines = await Medicine.find({ isActive: true, $expr: { $lte: ['$quantity', '$minStockLevel'] } }).populate('category supplier');
    res.json({ success: true, data: medicines, count: medicines.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getExpiringMedicines = async (req, res) => {
  try {
    const days = req.query.days || 30;
    const targetDate = new Date(); targetDate.setDate(targetDate.getDate() + Number(days));
    const medicines = await Medicine.find({ isActive: true, expiryDate: { $lte: targetDate, $gte: new Date() } }).populate('category supplier');
    res.json({ success: true, data: medicines, count: medicines.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
