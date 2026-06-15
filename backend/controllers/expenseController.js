const Expense = require('../models/Expense');
exports.getExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, from, to } = req.query;
    let query = {};
    if (category) query.category = category;
    if (from || to) { query.date = {}; if (from) query.date.$gte = new Date(from); if (to) query.date.$lte = new Date(to); }
    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query).populate('paidBy', 'name').sort({ date: -1 }).skip((page-1)*limit).limit(Number(limit));
    const totalAmount = await Expense.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    res.json({ success: true, data: expenses, total, totalAmount: totalAmount[0]?.total || 0 });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createExpense = async (req, res) => {
  try {
    const expense = await Expense.create({ ...req.body, paidBy: req.user._id });
    res.status(201).json({ success: true, data: expense });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: expense });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteExpense = async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
