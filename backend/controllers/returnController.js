const Return   = require('../models/Return');
const Sale     = require('../models/Sale');
const Medicine = require('../models/Medicine');
const Customer = require('../models/Customer');
const mongoose = require('mongoose');

const restoreStock = async (items) => {
  for (const item of items) {
    const medId = item.medicine?._id || item.medicine;
    if (medId && mongoose.Types.ObjectId.isValid(medId)) {
      await Medicine.findByIdAndUpdate(medId, { $inc: { quantity: item.quantity } });
    }
  }
};

// CHECK cancel window
exports.checkCancelWindow = async (req, res) => {
  try {
    const { saleId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(saleId))
      return res.status(400).json({ success: false, message: 'Invalid sale ID' });
    const sale = await Sale.findById(saleId);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    const THREE_HOURS = 3 * 60 * 60 * 1000;
    const ageMs = Date.now() - new Date(sale.createdAt).getTime();
    res.json({
      success: true,
      data: {
        canCancel: ageMs <= THREE_HOURS && sale.status === 'completed',
        minutesLeft: Math.max(0, Math.floor((THREE_HOURS - ageMs) / 60000)),
        ageMinutes: Math.floor(ageMs / 60000),
        status: sale.status,
        invoiceNo: sale.invoiceNo,
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// CANCEL sale
exports.cancelSale = async (req, res) => {
  try {
    const { saleId } = req.params;
    console.log('cancelSale called, saleId:', saleId);

    if (!mongoose.Types.ObjectId.isValid(saleId))
      return res.status(400).json({ success: false, message: 'Invalid sale ID format' });

    const sale = await Sale.findById(saleId).populate('customer');
    if (!sale) return res.status(404).json({ success: false, message: `Sale not found: ${saleId}` });

    console.log('Found sale:', sale.invoiceNo, 'status:', sale.status);

    if (sale.status === 'cancelled') return res.status(400).json({ success: false, message: 'Sale is already cancelled' });
    if (sale.status === 'refunded')  return res.status(400).json({ success: false, message: 'Sale is already refunded' });

    // 3-hour check
    const THREE_HOURS = 3 * 60 * 60 * 1000;
    const ageMs = Date.now() - new Date(sale.createdAt).getTime();
    if (ageMs > THREE_HOURS) {
      return res.status(403).json({
        success: false,
        message: `Cancellation window closed. Sale is ${(ageMs/3600000).toFixed(1)} hours old. Use Return instead.`,
      });
    }

    // Restore stock
    await restoreStock(sale.items);

    // Update sale status
    await Sale.findByIdAndUpdate(saleId, { status: 'cancelled' });

    // Build return items safely
    const returnItems = (sale.items || []).map(i => ({
      medicine:     i.medicine || null,
      medicineName: i.medicineName || 'Unknown',
      quantity:     Number(i.quantity) || 0,
      unitPrice:    Number(i.unitPrice) || 0,
      subtotal:     Number(i.subtotal) || (Number(i.quantity) * Number(i.unitPrice)),
      reason:       'Sale cancelled within 3-hour window',
    }));

    // Create cancellation record
    const ret = await Return.create({
      returnType:            'sale_cancellation',
      originalSale:          sale._id,
      customer:              sale.customer?._id || null,
      customerName:          sale.customerName || 'Walk-in Customer',
      items:                 returnItems,
      totalAmount:           Number(sale.totalAmount) || 0,
      refundMethod:          req.body.refundMethod || 'cash',
      cancelledWithin3Hours: true,
      processedBy:           req.user._id,
      notes:                 req.body.notes || '',
    });

    // Reverse customer loyalty points
    if (sale.customer?._id) {
      await Customer.findByIdAndUpdate(sale.customer._id, {
        $inc: {
          loyaltyPoints:  -Math.floor(sale.totalAmount / 100),
          totalPurchases: -sale.totalAmount
        }
      });
    }

    console.log('Cancellation successful, return:', ret.returnNo);
    res.json({
      success: true,
      message: `Sale ${sale.invoiceNo} cancelled. Refund PKR ${sale.totalAmount?.toLocaleString()} via ${req.body.refundMethod || 'cash'}.`,
      data: { returnNo: ret.returnNo },
    });
  } catch (err) {
    console.error('cancelSale ERROR:', err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
};

// CREATE return
exports.createReturn = async (req, res) => {
  try {
    const { saleId, items, refundMethod, notes } = req.body;
    console.log('createReturn called, saleId:', saleId, 'items:', items?.length);

    if (!items || items.length === 0)
      return res.status(400).json({ success: false, message: 'No items provided' });

    let customerName = 'Walk-in Customer';
    let customerId   = null;
    let originalSaleId = null;

    if (saleId && mongoose.Types.ObjectId.isValid(saleId)) {
      const sale = await Sale.findById(saleId).populate('customer');
      if (sale) {
        if (sale.status === 'cancelled')
          return res.status(400).json({ success: false, message: 'Cannot return items from cancelled sale' });
        customerName   = sale.customerName || 'Walk-in Customer';
        customerId     = sale.customer?._id || null;
        originalSaleId = sale._id;
        const totalQtySold     = (sale.items || []).reduce((s,i) => s + i.quantity, 0);
        const totalQtyReturned = items.reduce((s,i) => s + (Number(i.quantity)||0), 0);
        if (totalQtyReturned >= totalQtySold) {
          await Sale.findByIdAndUpdate(saleId, { status: 'refunded' });
        }
      }
    }

    const processedItems = items.map(i => ({
      medicine:     (i.medicine && mongoose.Types.ObjectId.isValid(i.medicine)) ? i.medicine : null,
      medicineName: i.medicineName || 'Unknown',
      quantity:     Number(i.quantity) || 1,
      unitPrice:    Number(i.unitPrice) || 0,
      subtotal:     (Number(i.quantity)||1) * (Number(i.unitPrice)||0),
      reason:       i.reason || 'Customer return',
    }));

    const totalAmount = processedItems.reduce((s,i) => s + i.subtotal, 0);

    await restoreStock(processedItems);

    const ret = await Return.create({
      returnType:   'customer_return',
      originalSale: originalSaleId,
      customer:     customerId,
      customerName,
      items:        processedItems,
      totalAmount,
      refundMethod: refundMethod || 'cash',
      processedBy:  req.user._id,
      notes:        notes || '',
    });

    if (customerId) {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { loyaltyPoints: -Math.floor(totalAmount/100), totalPurchases: -totalAmount }
      });
    }

    const populated = await Return.findById(ret._id)
      .populate('originalSale','invoiceNo totalAmount')
      .populate('customer','name phone')
      .populate('processedBy','name');

    res.status(201).json({
      success: true,
      data: populated,
      message: `Return ${ret.returnNo} processed. Refund PKR ${totalAmount.toLocaleString()} via ${refundMethod||'cash'}.`,
    });
  } catch (err) {
    console.error('createReturn ERROR:', err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
};

// GET all returns
exports.getReturns = async (req, res) => {
  try {
    const { page=1, limit=20, type, from, to } = req.query;
    let query = {};
    if (type) query.returnType = type;
    if (from||to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) { const d = new Date(to); d.setHours(23,59,59,999); query.createdAt.$lte = d; }
    }
    const total   = await Return.countDocuments(query);
    const returns = await Return.find(query)
      .populate('originalSale','invoiceNo totalAmount')
      .populate('customer','name phone')
      .populate('processedBy','name')
      .sort({ createdAt:-1 }).skip((page-1)*limit).limit(Number(limit));
    res.json({ success:true, data:returns, total });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

exports.getReturn = async (req, res) => {
  try {
    const ret = await Return.findById(req.params.id)
      .populate('originalSale').populate('customer','name phone').populate('processedBy','name');
    if (!ret) return res.status(404).json({ success:false, message:'Not found' });
    res.json({ success:true, data:ret });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};
