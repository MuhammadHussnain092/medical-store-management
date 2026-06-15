const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
router.use(protect);
router.get('/sales', ctrl.getSalesReport);
router.get('/profit', ctrl.getProfitReport);
router.get('/inventory', ctrl.getInventoryReport);
module.exports = router;
