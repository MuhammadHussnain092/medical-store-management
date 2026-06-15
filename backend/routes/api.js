const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Auth routes
const authController = require('../controllers/authController');
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/logout', protect, authController.logout);
router.post('/auth/logout-all', protect, authController.logoutAll);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/verify-otp', authController.verifyOTP);
router.post('/auth/reset-password', authController.resetPassword);
router.get('/auth/me', protect, authController.getMe);
router.put('/auth/change-password', protect, authController.changePassword);
router.put('/auth/profile', protect, authController.updateProfile);

// Dashboard
const { getDashboard } = require('../controllers/dashboardController');
router.get('/dashboard', protect, getDashboard);

// Medicine routes
const medCtrl = require('../controllers/medicineController');
router.get('/medicines/search', protect, medCtrl.searchMedicines);
router.get('/medicines/expiry-alerts', protect, medCtrl.getExpiryAlerts);
router.get('/medicines', protect, medCtrl.getMedicines);
router.get('/medicines/:id', protect, medCtrl.getMedicine);
router.post('/medicines', protect, authorize('superadmin', 'admin', 'inventory_manager'), medCtrl.createMedicine);
router.put('/medicines/:id', protect, authorize('superadmin', 'admin', 'inventory_manager'), medCtrl.updateMedicine);
router.delete('/medicines/:id', protect, authorize('superadmin', 'admin'), medCtrl.deleteMedicine);
router.put('/medicines/:id/adjust-stock', protect, authorize('superadmin', 'admin', 'inventory_manager'), medCtrl.adjustStock);

// Sales routes
const salesCtrl = require('../controllers/salesController');
router.post('/sales', protect, salesCtrl.createSale);
router.get('/sales/analytics', protect, salesCtrl.getSalesAnalytics);
router.get('/sales', protect, salesCtrl.getSales);
router.get('/sales/:id', protect, salesCtrl.getSale);

// Generic CRUD helper
const createCRUD = (Model, populateFields = '') => {
  const ctrl = {};
  ctrl.getAll = async (req, res) => {
    try {
      const { page = 1, limit = 20, search, isActive } = req.query;
      const query = {};
      if (isActive !== undefined) query.isActive = isActive === 'true';
      if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }];
      const total = await Model.countDocuments(query);
      let q = Model.find(query).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
      if (populateFields) q = q.populate(populateFields);
      const data = await q;
      res.json({ success: true, data, pagination: { total, page: Number(page), pages: Math.ceil(total/limit) } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  };
  ctrl.getOne = async (req, res) => {
    try {
      let q = Model.findById(req.params.id);
      if (populateFields) q = q.populate(populateFields);
      const data = await q;
      if (!data) return res.status(404).json({ success: false, message: 'Not found.' });
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  };
  ctrl.create = async (req, res) => {
    try {
      const data = await Model.create(req.body);
      res.status(201).json({ success: true, message: 'Created successfully.', data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  };
  ctrl.update = async (req, res) => {
    try {
      const data = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!data) return res.status(404).json({ success: false, message: 'Not found.' });
      res.json({ success: true, message: 'Updated successfully.', data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  };
  ctrl.remove = async (req, res) => {
    try {
      await Model.findByIdAndUpdate(req.params.id, { isActive: false });
      res.json({ success: true, message: 'Deleted successfully.' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  };
  return ctrl;
};

// Suppliers
const { Supplier, Customer, Category, Expense, Equipment, MaintenanceLog, UtilityBill, Attendance, Payroll, Notification, AuditLog, Purchase, Return, Settings } = require('../models/index');
const supCtrl = createCRUD(Supplier);
router.get('/suppliers', protect, supCtrl.getAll);
router.get('/suppliers/:id', protect, supCtrl.getOne);
router.post('/suppliers', protect, authorize('superadmin', 'admin', 'inventory_manager'), supCtrl.create);
router.put('/suppliers/:id', protect, authorize('superadmin', 'admin', 'inventory_manager'), supCtrl.update);

// Customers
const custCtrl = createCRUD(Customer);
router.get('/customers', protect, custCtrl.getAll);
router.get('/customers/:id', protect, custCtrl.getOne);
router.post('/customers', protect, custCtrl.create);
router.put('/customers/:id', protect, custCtrl.update);

// Categories
const catCtrl = createCRUD(Category);
router.get('/categories', protect, catCtrl.getAll);
router.post('/categories', protect, authorize('superadmin', 'admin'), catCtrl.create);
router.put('/categories/:id', protect, authorize('superadmin', 'admin'), catCtrl.update);

// Expenses
const expCtrl = createCRUD(Expense);
router.get('/expenses', protect, authorize('superadmin', 'admin', 'accountant'), expCtrl.getAll);
router.post('/expenses', protect, authorize('superadmin', 'admin', 'accountant'), expCtrl.create);
router.put('/expenses/:id', protect, authorize('superadmin', 'admin', 'accountant'), expCtrl.update);
router.get('/expenses/analytics', protect, authorize('superadmin', 'admin', 'accountant'), async (req, res) => {
  try {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const byCategory = await Expense.aggregate([
      { $match: { date: { $gte: monthStart } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const monthly = await Expense.aggregate([
      { $match: { date: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]);
    res.json({ success: true, data: { byCategory, monthly } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Equipment
const eqCtrl = createCRUD(Equipment);
router.get('/equipment', protect, eqCtrl.getAll);
router.get('/equipment/:id', protect, eqCtrl.getOne);
router.post('/equipment', protect, authorize('superadmin', 'admin'), eqCtrl.create);
router.put('/equipment/:id', protect, authorize('superadmin', 'admin'), eqCtrl.update);

// Maintenance Logs
const maintCtrl = createCRUD(MaintenanceLog, 'equipment');
router.get('/maintenance', protect, maintCtrl.getAll);
router.post('/maintenance', protect, authorize('superadmin', 'admin'), maintCtrl.create);

// Utility Bills
const utilCtrl = createCRUD(UtilityBill);
router.get('/utility-bills', protect, utilCtrl.getAll);
router.post('/utility-bills', protect, authorize('superadmin', 'admin', 'accountant'), utilCtrl.create);
router.put('/utility-bills/:id', protect, authorize('superadmin', 'admin', 'accountant'), utilCtrl.update);

// Attendance
router.get('/attendance', protect, async (req, res) => {
  try {
    const { userId, startDate, endDate, page = 1, limit = 30 } = req.query;
    const query = {};
    if (userId) query.user = userId;
    else if (req.user.role === 'staff') query.user = req.user._id;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    const total = await Attendance.countDocuments(query);
    const data = await Attendance.find(query).populate('user', 'name role').sort({ date: -1 }).skip((page-1)*limit).limit(Number(limit));
    res.json({ success: true, data, pagination: { total, page: Number(page), pages: Math.ceil(total/limit) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/attendance', protect, async (req, res) => {
  try {
    const data = await Attendance.create({ ...req.body, user: req.body.userId || req.user._id });
    res.status(201).json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.put('/attendance/:id', protect, async (req, res) => {
  try {
    const data = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Payroll
router.get('/payroll', protect, authorize('superadmin', 'admin', 'accountant'), async (req, res) => {
  try {
    const data = await Payroll.find().populate('user', 'name role salary').sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/payroll', protect, authorize('superadmin', 'admin', 'accountant'), async (req, res) => {
  try {
    const data = await Payroll.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.put('/payroll/:id', protect, authorize('superadmin', 'admin', 'accountant'), async (req, res) => {
  try {
    const data = await Payroll.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Staff management (users)
router.get('/staff', protect, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const staff = await User.find({ role: { $ne: 'superadmin' } }).sort({ createdAt: -1 });
    res.json({ success: true, data: staff });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.put('/staff/:id', protect, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const { isActive, isApproved, role, salary, shift } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive, isApproved, role, salary, shift }, { new: true });
    res.json({ success: true, data: user });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Notifications
router.get('/notifications', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({
      isActive: true,
      $or: [{ targetRoles: req.user.role }, { targetUsers: req.user._id }, { targetRoles: [], targetUsers: [] }]
    }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: notifications });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.put('/notifications/:id/read', protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { $push: { readBy: { user: req.user._id, readAt: new Date() } } });
    res.json({ success: true, message: 'Marked as read.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.put('/notifications/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ isActive: true }, { $push: { readBy: { user: req.user._id, readAt: new Date() } } });
    res.json({ success: true, message: 'All marked as read.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Purchases
router.get('/purchases', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await Purchase.countDocuments();
    const data = await Purchase.find().populate('supplier', 'name phone').populate('receivedBy', 'name').sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
    res.json({ success: true, data, pagination: { total, page: Number(page), pages: Math.ceil(total/limit) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/purchases', protect, authorize('superadmin', 'admin', 'inventory_manager'), async (req, res) => {
  try {
    const count = await Purchase.countDocuments();
    const purchaseNo = `PUR-${String(count + 1).padStart(6, '0')}`;
    const purchase = await Purchase.create({ ...req.body, purchaseNo, receivedBy: req.user._id });
    
    // Update stock
    for (const item of purchase.items) {
      const med = await Medicine.findById(item.medicine);
      if (med) {
        const prev = med.quantity;
        med.quantity += item.quantity;
        if (item.expiryDate) med.expiryDate = item.expiryDate;
        if (item.batchNo) med.batchNo = item.batchNo;
        await med.save();
        await StockMovement.create({ medicine: med._id, type: 'in', quantity: item.quantity, previousQty: prev, newQty: med.quantity, reason: `Purchase: ${purchaseNo}`, reference: purchaseNo, performedBy: req.user._id });
      }
    }
    
    await Supplier.findByIdAndUpdate(req.body.supplier, { $inc: { totalPurchases: purchase.totalAmount } });
    
    res.status(201).json({ success: true, data: purchase });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Settings
router.get('/settings', protect, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    res.json({ success: true, data: settings });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.put('/settings', protect, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.json({ success: true, data: settings });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Audit Logs
router.get('/audit-logs', protect, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const total = await AuditLog.countDocuments();
    const data = await AuditLog.find().sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
    res.json({ success: true, data, pagination: { total, page: Number(page), pages: Math.ceil(total/limit) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Returns
router.post('/returns', protect, async (req, res) => {
  try {
    const count = await Return.countDocuments();
    const returnNo = `RET-${String(count + 1).padStart(6, '0')}`;
    const data = await Return.create({ ...req.body, returnNo, processedBy: req.user._id });
    res.status(201).json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.get('/returns', protect, async (req, res) => {
  try {
    const data = await Return.find().populate('processedBy', 'name').sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

const Medicine = require('../models/Medicine');
const { StockMovement } = require('../models/index');

module.exports = router;
