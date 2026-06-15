const Customer = require('../models/Customer');

exports.getCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    let query = { isActive: true };
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }];
    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query).sort({ name: 1 }).skip((page-1)*limit).limit(Number(limit));
    res.json({ success: true, data: customers, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, data: customer, message: 'Customer added successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer, message: 'Customer updated successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: `${customer.name} has been deleted` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
