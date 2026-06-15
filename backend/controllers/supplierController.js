const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const SupplierPayment = require('../models/SupplierPayment');

exports.getSuppliers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = { isActive: true };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
    ];
    const suppliers = await Supplier.find(query).sort({ name: 1 });
    res.json({ success: true, data: suppliers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json({ success: true, data: supplier, message: 'Supplier added' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: supplier });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteSupplier = async (req, res) => {
  try {
    await Supplier.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Supplier deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Ledger: purchases + supplier-level payments combined ───────────
exports.getSupplierLedger = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Not found' });

    const { from, to } = req.query;
    let dateFilter = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.$gte = new Date(from);
      if (to) { const d = new Date(to); d.setHours(23,59,59,999); dateFilter.createdAt.$lte = d; }
    }

    const purchases = await Purchase.find({ supplier: req.params.id, ...dateFilter }).sort({ createdAt: 1 });
    const payments  = await SupplierPayment.find({ supplier: req.params.id, ...dateFilter })
      .populate('paidBy', 'name').sort({ date: 1 });

    // Build unified entry list
    const entries = [];
    purchases.forEach(p => entries.push({
      _id: p._id, date: p.createdAt, type: 'purchase',
      description: `Purchase Order — ${p.purchaseNo}`,
      items: p.items?.length || 0,
      debit: p.totalAmount, credit: 0,
      ref: p.purchaseNo, status: p.status,
    }));
    payments.forEach(p => entries.push({
      _id: p._id, date: p.date, type: 'payment',
      description: `Payment — ${p.paymentMethod.toUpperCase()}${p.reference ? ' · ' + p.reference : ''}`,
      debit: 0, credit: p.amount,
      ref: p.reference, note: p.note,
      paidBy: p.paidBy?.name,
    }));

    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Running balance
    let running = 0;
    entries.forEach(e => { running += e.debit - e.credit; e.balance = running; });

    const totalPurchases = purchases.reduce((s, p) => s + p.totalAmount, 0);
    const totalPaid      = payments.reduce((s, p) => s + p.amount, 0);

    res.json({
      success: true,
      data: {
        supplier,
        entries,
        summary: {
          totalPurchases, totalPaid,
          outstanding: totalPurchases - totalPaid,
          purchaseCount: purchases.length,
          paymentCount: payments.length,
        }
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Record a SUPPLIER-LEVEL payment → also update matching PO(s) ──
exports.recordPayment = async (req, res) => {
  try {
    const { amount, paymentMethod, reference, note } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    let remaining = Number(amount);

    // ── Distribute payment across oldest unpaid/partial purchase orders ──
    const unpaidPOs = await Purchase.find({
      supplier: req.params.id,
      dueAmount: { $gt: 0 },
    }).sort({ createdAt: 1 }); // oldest first (FIFO)

    for (const po of unpaidPOs) {
      if (remaining <= 0) break;

      const applyToPO = Math.min(remaining, po.dueAmount);
      const newPaid   = (po.paidAmount || 0) + applyToPO;
      const newDue    = Math.max(0, po.totalAmount - newPaid);

      await Purchase.findByIdAndUpdate(po._id, {
        paidAmount:    newPaid,
        dueAmount:     newDue,
        paymentStatus: newDue === 0 ? 'paid' : 'partial',
      });

      remaining -= applyToPO;
    }

    // ── Save supplier payment record ─────────────────────────────────
    const payment = await SupplierPayment.create({
      supplier: req.params.id,
      amount:   Number(amount),
      paymentMethod: paymentMethod || 'cash',
      reference, note,
      paidBy: req.user._id,
    });

    // ── Reduce supplier outstanding balance ──────────────────────────
    const newBalance = Math.max(0, (supplier.outstandingBalance || 0) - Number(amount));
    await Supplier.findByIdAndUpdate(req.params.id, { outstandingBalance: newBalance });

    const populated = await SupplierPayment.findById(payment._id).populate('paidBy', 'name');
    res.status(201).json({
      success: true, data: populated,
      message: `Payment of PKR ${Number(amount).toLocaleString()} recorded and applied to ${unpaidPOs.length} order(s)`
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
