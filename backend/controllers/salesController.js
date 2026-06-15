const { Sale, Customer, StockMovement, Notification } = require('../models/index');
const Medicine = require('../models/Medicine');

const generateInvoiceNo = async () => {
  const count = await Sale.countDocuments();
  return `INV-${String(count + 1).padStart(6, '0')}`;
};

// @POST /api/sales
const createSale = async (req, res) => {
  try {
    const { items, customerId, customerName, paymentMethod, paidAmount, discountAmount, taxAmount, splitPayment, notes } = req.body;
    
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'No items in sale.' });
    
    let subtotal = 0;
    const processedItems = [];
    
    for (const item of items) {
      const medicine = await Medicine.findById(item.medicineId);
      if (!medicine) return res.status(404).json({ success: false, message: `Medicine not found: ${item.medicineId}` });
      if (medicine.quantity < item.quantity) return res.status(400).json({ success: false, message: `Insufficient stock for ${medicine.name}. Available: ${medicine.quantity}` });
      
      const itemTotal = item.salePrice * item.quantity;
      subtotal += itemTotal;
      
      processedItems.push({
        medicine: medicine._id, medicineName: medicine.name,
        quantity: item.quantity, purchasePrice: medicine.purchasePrice,
        salePrice: item.salePrice, discountPercent: item.discountPercent || 0,
        taxPercent: item.taxPercent || 0, total: itemTotal
      });
    }
    
    const totalAmount = subtotal - (discountAmount || 0) + (taxAmount || 0);
    const invoiceNo = await generateInvoiceNo();
    
    const sale = await Sale.create({
      invoiceNo, customer: customerId || null, customerName: customerName || 'Walk-in Customer',
      cashier: req.user._id, items: processedItems, subtotal,
      discountAmount: discountAmount || 0, taxAmount: taxAmount || 0, totalAmount,
      paidAmount, changeAmount: Math.max(0, paidAmount - totalAmount),
      paymentMethod, splitPayment, notes
    });
    
    // Deduct stock
    for (const item of processedItems) {
      const medicine = await Medicine.findById(item.medicine);
      const previousQty = medicine.quantity;
      medicine.quantity -= item.quantity;
      await medicine.save();
      
      await StockMovement.create({
        medicine: medicine._id, type: 'out', quantity: item.quantity,
        previousQty, newQty: medicine.quantity,
        reason: `Sale: ${invoiceNo}`, reference: invoiceNo, performedBy: req.user._id
      });
      
      if (medicine.quantity <= medicine.minStockLevel) {
        await Notification.create({
          title: 'Low Stock Alert', message: `${medicine.name} stock is low (${medicine.quantity} remaining)`,
          type: 'low_stock', priority: 'high', targetRoles: ['superadmin', 'admin', 'inventory_manager']
        });
      }
    }
    
    // Update customer loyalty points
    if (customerId) {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { totalPurchases: 1, totalSpent: totalAmount, loyaltyPoints: Math.floor(totalAmount / 100) }
      });
    }
    
    const populatedSale = await Sale.findById(sale._id).populate('cashier', 'name').populate('customer', 'name phone');
    
    res.status(201).json({ success: true, message: 'Sale completed.', data: populatedSale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @GET /api/sales
const getSales = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, cashier, paymentMethod, status } = req.query;
    const query = {};
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); query.createdAt.$lte = end; }
    }
    if (cashier) query.cashier = cashier;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (status) query.status = status;
    
    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query)
      .populate('cashier', 'name')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    
    res.json({ success: true, data: sales, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @GET /api/sales/:id
const getSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('cashier', 'name email').populate('customer', 'name phone email');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @GET /api/sales/analytics
const getSalesAnalytics = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);
    
    const [todaySales, monthSales, yearSales, totalSales] = await Promise.all([
      Sale.aggregate([{ $match: { createdAt: { $gte: today, $lte: todayEnd }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
      Sale.aggregate([{ $match: { createdAt: { $gte: monthStart }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
      Sale.aggregate([{ $match: { createdAt: { $gte: yearStart }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
      Sale.countDocuments({ status: 'completed' })
    ]);
    
    // Daily sales for last 7 days
    const last7Days = await Sale.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, status: 'completed' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // Monthly sales for last 12 months
    const last12Months = await Sale.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }, status: 'completed' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // Top selling medicines
    const topMedicines = await Sale.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.medicineName', totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.total' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      success: true, data: {
        today: todaySales[0] || { total: 0, count: 0 },
        month: monthSales[0] || { total: 0, count: 0 },
        year: yearSales[0] || { total: 0, count: 0 },
        totalSales, last7Days, last12Months, topMedicines
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createSale, getSales, getSale, getSalesAnalytics };
