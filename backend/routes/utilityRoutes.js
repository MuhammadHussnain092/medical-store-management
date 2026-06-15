const express = require('express');
const router = express.Router();
const UtilityBill = require('../models/UtilityBill');
const { protect } = require('../middleware/auth');
router.use(protect);
router.get('/', async (req, res) => {
  const bills = await UtilityBill.find().sort({ dueDate: 1 });
  res.json({ success: true, data: bills });
});
router.post('/', async (req, res) => {
  try { const bill = await UtilityBill.create(req.body); res.status(201).json({ success: true, data: bill }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/:id', async (req, res) => {
  try { const bill = await UtilityBill.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, data: bill }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
module.exports = router;
