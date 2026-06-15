const Medicine = require('../models/Medicine');
const { Sale, Purchase, Expense, Customer, Notification, Attendance } = require('../models/index');
const User = require('../models/User');

// @GET /api/dashboard
const getDashboard = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    const [
      todaySales, monthSales, lastMonthSales,
      totalMedicines, lowStockCount, expiringCount, expiredCount,
      totalCustomers, activeStaff,
      monthExpenses, pendingPurchases,
      recentSales, lowStockMedicines, expiringMedicines,
      unreadNotifications
    ] = await Promise.all([
      Sale.aggregate([{ $match: { createdAt: { $gte: today, $lte: todayEnd }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, cost: { $sum: { $multiply: [{ $sum: '$items.purchasePrice' }, { $sum: '$items.quantity' }] } }, count: { $sum: 1 } } }]),
      Sale.aggregate([{ $match: { createdAt: { $gte: monthStart }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
      Sale.aggregate([{ $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Medicine.countDocuments({ isActive: true }),
      Medicine.countDocuments({ isActive: true, $expr: { $lte: ['$quantity', '$minStockLevel'] } }),
      Medicine.countDocuments({ isActive: true, expiryDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }),
      Medicine.countDocuments({ isActive: true, expiryDate: { $lt: new Date() } }),
      Customer.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true, isApproved: true }),
      Expense.aggregate([{ $match: { date: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Purchase.countDocuments({ paymentStatus: { $in: ['unpaid', 'partial'] } }),
      Sale.find({ status: 'completed' }).sort({ createdAt: -1 }).limit(5).populate('cashier', 'name'),
      Medicine.find({ isActive: true, $expr: { $lte: ['$quantity', '$minStockLevel'] } }).sort({ quantity: 1 }).limit(10).select('name quantity minStockLevel unit'),
      Medicine.find({ isActive: true, expiryDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }).sort({ expiryDate: 1 }).limit(10).select('name quantity expiryDate brand'),
      Notification.countDocuments({ isActive: true, 'readBy.user': { $ne: req.user._id } })
    ]);
    
    const todayRevenue = todaySales[0]?.total || 0;
    const monthRevenue = monthSales[0]?.total || 0;
    const lastMonthRevenue = lastMonthSales[0]?.total || 0;
    const monthExpenseTotal = monthExpenses[0]?.total || 0;
    const monthProfit = monthRevenue - monthExpenseTotal;
    const growthRate = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : 0;
    
    // Weekly chart
    const weeklyData = await Sale.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, status: 'completed' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, sales: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // Payment method breakdown
    const paymentBreakdown = await Sale.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: 'completed' } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      data: {
        kpis: {
          todayRevenue, todaySalesCount: todaySales[0]?.count || 0,
          monthRevenue, monthSalesCount: monthSales[0]?.count || 0,
          monthProfit, monthExpenses: monthExpenseTotal,
          growthRate: Number(growthRate)
        },
        inventory: { totalMedicines, lowStockCount, expiringCount, expiredCount },
        business: { totalCustomers, activeStaff, pendingPurchases, unreadNotifications },
        recentSales, lowStockMedicines, expiringMedicines,
        charts: { weeklyData, paymentBreakdown }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboard };
