const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/returnController');
const { protect, authorize } = require('../middleware/auth');
router.use(protect);
// specific routes MUST come before /:id
router.get('/check-cancel/:saleId',  ctrl.checkCancelWindow);
router.post('/cancel/:saleId',       authorize('superadmin','admin','staff'), ctrl.cancelSale);
router.get('/',                      ctrl.getReturns);
router.post('/',                     ctrl.createReturn);
router.get('/:id',                   ctrl.getReturn);
module.exports = router;
