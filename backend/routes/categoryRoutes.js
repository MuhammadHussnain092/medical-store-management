const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');
router.use(protect);
router.get('/', async (req, res) => {
  const cats = await Category.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, data: cats });
});
router.post('/', async (req, res) => {
  try { const cat = await Category.create(req.body); res.status(201).json({ success: true, data: cat }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/:id', async (req, res) => {
  try { const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, data: cat }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
module.exports = router;
