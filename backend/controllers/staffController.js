const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');
const SalaryAdvance = require('../models/SalaryAdvance');

exports.getStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: { $ne: 'superadmin' } }).sort({ name: 1 });
    res.json({ success: true, data: staff });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createStaff = async (req, res) => {
  try {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });
    const user = await User.create(req.body);
    res.status(201).json({ success: true, data: user, message: 'Staff member added successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateStaff = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const updateData = { ...rest };
    if (password && password.length >= 6) {
      const bcrypt = require('bcryptjs');
      updateData.password = await bcrypt.hash(password, 12);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.json({ success: true, data: user, message: 'Staff updated successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteStaff = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    if (user.role === 'superadmin') return res.status(403).json({ success: false, message: 'Cannot delete super admin' });
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: `${user.name} has been removed from staff` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.markAttendance = async (req, res) => {
  try {
    const { userId, date, checkIn, checkOut, status } = req.body;
    const attendance = await Attendance.findOneAndUpdate(
      { user: userId, date: new Date(date) },
      { user: userId, date: new Date(date), checkIn, checkOut, status },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: attendance });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getAttendance = async (req, res) => {
  try {
    const { userId, from, to } = req.query;
    let query = {};
    if (userId) query.user = userId;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }
    const attendance = await Attendance.find(query).populate('user', 'name role').sort({ date: -1 });
    res.json({ success: true, data: attendance });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.generatePayroll = async (req, res) => {
  try {
    const { userId, month, year, bonus, deductions } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });

    // Check salary advances for this month
    const advances = await SalaryAdvance.find({
      user: userId,
      repaymentMonth: month,
      repaymentYear: year,
      status: 'pending'
    });
    const advanceDeductions = advances.reduce((s, a) => s + a.amount, 0);
    const totalDeductions = (Number(deductions) || 0) + advanceDeductions;
    const netSalary = (user.salary || 0) + (Number(bonus) || 0) - totalDeductions;

    const payroll = await Payroll.findOneAndUpdate(
      { user: userId, month, year },
      { user: userId, month, year, basicSalary: user.salary, bonus: Number(bonus) || 0, deductions: totalDeductions, netSalary, status: 'pending' },
      { upsert: true, new: true }
    );

    // Mark advances as deducted
    if (advances.length > 0) {
      await SalaryAdvance.updateMany(
        { user: userId, repaymentMonth: month, repaymentYear: year, status: 'pending' },
        { status: 'deducted' }
      );
    }

    const populated = await Payroll.findById(payroll._id).populate('user', 'name role salary');
    res.json({ success: true, data: populated, message: 'Payroll generated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getPayroll = async (req, res) => {
  try {
    const { month, year, userId } = req.query;
    let query = {};
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);
    if (userId) query.user = userId;
    const payroll = await Payroll.find(query).populate('user', 'name role salary').sort({ createdAt: -1 });
    res.json({ success: true, data: payroll });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.markPayrollPaid = async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paymentDate: new Date(), paymentMethod: req.body.paymentMethod || 'cash' },
      { new: true }
    ).populate('user', 'name role');
    if (!payroll) return res.status(404).json({ success: false, message: 'Payroll record not found' });
    res.json({ success: true, data: payroll, message: `Salary paid to ${payroll.user.name}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.recordSalaryAdvance = async (req, res) => {
  try {
    const { userId, amount, reason, repaymentMonth, repaymentYear } = req.body;
    if (!userId || !amount) return res.status(400).json({ success: false, message: 'User and amount required' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Staff not found' });
    const advance = await SalaryAdvance.create({
      user: userId, amount, reason,
      repaymentMonth: repaymentMonth || new Date().getMonth() + 1,
      repaymentYear: repaymentYear || new Date().getFullYear(),
      approvedBy: req.user._id
    });
    const populated = await SalaryAdvance.findById(advance._id).populate('user', 'name').populate('approvedBy', 'name');
    res.status(201).json({ success: true, data: populated, message: `Advance of PKR ${amount} recorded for ${user.name}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getSalaryAdvances = async (req, res) => {
  try {
    const { userId, status } = req.query;
    let query = {};
    if (userId) query.user = userId;
    if (status) query.status = status;
    const advances = await SalaryAdvance.find(query)
      .populate('user', 'name role')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: advances });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
