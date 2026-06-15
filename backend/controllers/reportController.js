const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const Medicine = require('../models/Medicine');

exports.getSalesReport = async (req, res) => {
  try {
    const { from, to, groupBy = 'day' } = req.query;
    let matchStage = { status: 'completed' };
    if (from || to) {
      matchStage.createdAt = {};
      if (from) matchStage.createdAt.$gte = new Date(from);
      if (to) { const toDate = new Date(to); toDate.setHours(23,59,59,999); matchStage.createdAt.$lte = toDate; }
    }
    const groupFormat = groupBy === 'month' ? '%Y-%m' : groupBy === 'year' ? '%Y' : '%Y-%m-%d';
    const salesData = await Sale.aggregate([
      { $match: matchStage },
      { $group: {
        _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
        avgOrder: { $avg: '$totalAmount' }
      }},
      { $sort: { _id: 1 } }
    ]);
    const summary = await Sale.aggregate([
      { $match: matchStage },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalOrders: { $sum: 1 }, avgOrder: { $avg: '$totalAmount' } } }
    ]);
    const topProducts = await Sale.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      { $group: { _id: '$items.medicineName', totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.subtotal' } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);
    res.json({ success: true, data: { salesData, summary: summary[0] || {}, topProducts } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getProfitReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    let matchStage = { status: 'completed' };
    if (from || to) {
      matchStage.createdAt = {};
      if (from) matchStage.createdAt.$gte = new Date(from);
      if (to) matchStage.createdAt.$lte = new Date(to);
    }
    let expenseMatch = {};
    if (from || to) {
      expenseMatch.date = {};
      if (from) expenseMatch.date.$gte = new Date(from);
      if (to) expenseMatch.date.$lte = new Date(to);
    }
    const [revenueData, expenseData] = await Promise.all([
      Sale.aggregate([{ $match: matchStage }, { $group: { _id: null, revenue: { $sum: '$totalAmount' }, cost: { $sum: { $reduce: { input: '$items', initialValue: 0, in: { $add: ['$$value', { $multiply: ['$$this.quantity', '$$this.purchasePrice'] }] } } } } } }]),
      Expense.aggregate([{ $match: expenseMatch }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);
    const revenue = revenueData[0]?.revenue || 0;
    const cost = revenueData[0]?.cost || 0;
    const expenses = expenseData[0]?.total || 0;
    const grossProfit = revenue - cost;
    const netProfit = grossProfit - expenses;
    res.json({ success: true, data: { revenue, cost, grossProfit, expenses, netProfit, grossMargin: revenue ? ((grossProfit/revenue)*100).toFixed(2) : 0, netMargin: revenue ? ((netProfit/revenue)*100).toFixed(2) : 0 } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getInventoryReport = async (req, res) => {
  try {
    const medicines = await Medicine.find({ isActive: true }).populate('category supplier');
    const totalValue = medicines.reduce((sum, m) => sum + (m.quantity * m.purchasePrice), 0);
    const lowStock = medicines.filter(m => m.quantity <= m.minStockLevel);
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
    const expiring = medicines.filter(m => m.expiryDate && m.expiryDate <= thirtyDays && m.expiryDate >= new Date());
    const expired = medicines.filter(m => m.expiryDate && m.expiryDate < new Date());
    res.json({ success: true, data: { totalMedicines: medicines.length, totalValue, lowStock: lowStock.length, expiring: expiring.length, expired: expired.length, medicines } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
