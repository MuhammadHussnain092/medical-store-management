const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');
const Customer = require('../models/Customer');

exports.createSale = async (req, res) => {
  try {
    const { items, customer, customerName, paymentMethod, paidAmount, discountAmount, taxAmount, notes } = req.body;
    let subtotal = 0, totalCost = 0;
    const processedItems = [];
    for (const item of items) {
      const medicine = await Medicine.findById(item.medicine);
      if (!medicine) return res.status(404).json({ success: false, message: `Medicine ${item.medicine} not found` });
      if (medicine.quantity < item.quantity) return res.status(400).json({ success: false, message: `Insufficient stock for ${medicine.name}` });
      const itemSubtotal = item.quantity * item.unitPrice;
      subtotal += itemSubtotal;
      totalCost += item.quantity * (medicine.purchasePrice || 0);
      processedItems.push({ ...item, medicineName: medicine.name, purchasePrice: medicine.purchasePrice, subtotal: itemSubtotal });
      medicine.quantity -= item.quantity;
      await medicine.save();
    }
    const totalAmount = subtotal - (discountAmount || 0) + (taxAmount || 0);
    const changeAmount = (paidAmount || 0) - totalAmount;
    const sale = await Sale.create({
      items: processedItems, customer, customerName: customerName || 'Walk-in Customer',
      subtotal, discountAmount, taxAmount, totalAmount, paidAmount, changeAmount,
      paymentMethod, notes, servedBy: req.user._id, status: 'completed'
    });
    if (customer) {
      await Customer.findByIdAndUpdate(customer, { $inc: { totalPurchases: totalAmount, loyaltyPoints: Math.floor(totalAmount / 100) } });
    }
    const populatedSale = await Sale.findById(sale._id).populate('customer', 'name phone').populate('servedBy', 'name');
    res.status(201).json({ success: true, data: populatedSale, message: 'Sale created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSales = async (req, res) => {
  try {
    const { page = 1, limit = 20, from, to, status, paymentMethod } = req.query;
    let query = {};
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) { const toDate = new Date(to); toDate.setHours(23,59,59,999); query.createdAt.$lte = toDate; }
    }
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query)
      .populate('customer', 'name phone')
      .populate('servedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, data: sales, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('customer servedBy').populate('items.medicine', 'name barcode');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, data: sale });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);

    const [todaySales, monthSales, yearSales, totalSales] = await Promise.all([
      Sale.aggregate([{ $match: { createdAt: { $gte: today, $lt: tomorrow }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
      Sale.aggregate([{ $match: { createdAt: { $gte: monthStart }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
      Sale.aggregate([{ $match: { createdAt: { $gte: yearStart }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Sale.countDocuments({ status: 'completed' }),
    ]);

    const Medicine = require('../models/Medicine');
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
    const [lowStockCount, expiringCount, totalMedicines, totalCustomers] = await Promise.all([
      Medicine.countDocuments({ isActive: true, $expr: { $lte: ['$quantity', '$minStockLevel'] } }),
      Medicine.countDocuments({ isActive: true, expiryDate: { $lte: thirtyDays, $gte: new Date() } }),
      Medicine.countDocuments({ isActive: true }),
      require('../models/Customer').countDocuments({ isActive: true }),
    ]);

    const last7Days = await Sale.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, status: 'completed' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const monthlyRevenue = await Sale.aggregate([
      { $match: { createdAt: { $gte: yearStart }, status: 'completed' } },
      { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        todayRevenue: todaySales[0]?.total || 0,
        todayOrders: todaySales[0]?.count || 0,
        monthRevenue: monthSales[0]?.total || 0,
        monthOrders: monthSales[0]?.count || 0,
        yearRevenue: yearSales[0]?.total || 0,
        totalOrders: totalSales,
        lowStockCount, expiringCount, totalMedicines, totalCustomers,
        last7Days, monthlyRevenue,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
