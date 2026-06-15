const Purchase = require('../models/Purchase');
const Medicine = require('../models/Medicine');
const Supplier = require('../models/Supplier');
const SupplierPayment = require('../models/SupplierPayment');

exports.createPurchase = async (req, res) => {
  try {
    const { supplier, items, notes, status } = req.body;
    if (!supplier) return res.status(400).json({ success: false, message: 'Supplier is required' });
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'At least one item is required' });

    const processedItems = items.map(item => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      subtotal: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    }));
    const subtotal = processedItems.reduce((s, i) => s + i.subtotal, 0);

    const purchase = await Purchase.create({
      supplier, items: processedItems, notes,
      status: status || 'ordered',
      subtotal, totalAmount: subtotal,
      paidAmount: 0, dueAmount: subtotal,
      paymentStatus: 'unpaid',
      createdBy: req.user._id,
    });

    // Add to supplier outstanding balance
    await Supplier.findByIdAndUpdate(supplier, {
      $inc: { outstandingBalance: subtotal }
    });

    // If received immediately, update stock
    if (purchase.status === 'received') {
      for (const item of processedItems) {
        if (item.medicine) {
          await Medicine.findByIdAndUpdate(item.medicine, {
            $inc: { quantity: item.quantity },
            ...(item.expiryDate && { expiryDate: item.expiryDate }),
            ...(item.batchNo && { batchNo: item.batchNo }),
          });
        }
      }
    }

    const populated = await Purchase.findById(purchase._id)
      .populate('supplier', 'name phone')
      .populate('createdBy', 'name');
    res.status(201).json({ success: true, data: populated, message: 'Purchase order created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPurchases = async (req, res) => {
  try {
    const { page = 1, limit = 15, supplier, status, from, to } = req.query;
    let query = {};
    if (supplier) query.supplier = supplier;
    if (status) query.status = status;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }
    const total = await Purchase.countDocuments(query);
    const purchases = await Purchase.find(query)
      .populate('supplier', 'name phone')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, data: purchases, total, page: Number(page) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Mark as Received → update stock ───────────────────────────────
exports.updatePurchaseStatus = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id).populate('supplier');
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });

    const { status, paidAmount } = req.body;

    // ── Handle PAYMENT ──────────────────────────────────────────────
    if (paidAmount !== undefined) {
      const newPaid    = Number(paidAmount);
      const prevPaid   = purchase.paidAmount || 0;
      const addedNow   = newPaid - prevPaid;          // how much extra is being paid now
      const newDue     = Math.max(0, purchase.totalAmount - newPaid);

      purchase.paidAmount    = newPaid;
      purchase.dueAmount     = newDue;
      purchase.paymentStatus = newDue === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

      // ── SYNC to supplier ledger ─────────────────────────────────
      if (addedNow > 0) {
        // 1. Record in SupplierPayment collection
        await SupplierPayment.create({
          supplier:      purchase.supplier._id,
          amount:        addedNow,
          paymentMethod: req.body.paymentMethod || 'cash',
          reference:     `PO-${purchase.purchaseNo}`,
          note:          `Payment for purchase order ${purchase.purchaseNo}`,
          paidBy:        req.user._id,
        });

        // 2. Reduce supplier outstanding balance
        const sup = await Supplier.findById(purchase.supplier._id);
        if (sup) {
          const newBalance = Math.max(0, (sup.outstandingBalance || 0) - addedNow);
          await Supplier.findByIdAndUpdate(purchase.supplier._id, { outstandingBalance: newBalance });
        }
      }
    }

    // ── Handle STATUS CHANGE ─────────────────────────────────────────
    if (status && status !== purchase.status) {
      if (status === 'received' && purchase.status !== 'received') {
        // Update medicine stock
        for (const item of purchase.items) {
          if (item.medicine) {
            await Medicine.findByIdAndUpdate(item.medicine, {
              $inc: { quantity: item.quantity },
              ...(item.expiryDate && { expiryDate: item.expiryDate }),
              ...(item.batchNo && { batchNo: item.batchNo }),
            });
          }
        }
      }
      purchase.status = status;
    }

    await purchase.save();
    const updated = await Purchase.findById(purchase._id).populate('supplier', 'name phone').populate('createdBy', 'name');
    res.json({ success: true, data: updated, message: 'Purchase updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    // Reverse the outstanding balance when deleting unpaid purchase
    if (purchase.dueAmount > 0) {
      await Supplier.findByIdAndUpdate(purchase.supplier, {
        $inc: { outstandingBalance: -purchase.dueAmount }
      });
    }
    await Purchase.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Purchase deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
