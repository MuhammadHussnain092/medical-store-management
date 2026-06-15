const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { generateSystemNotifications } = require('../utils/notificationHelper');

router.use(protect);

// GET all notifications - auto-generate system ones first
router.get('/', async (req, res) => {
  try {
    // Auto-generate system notifications
    await generateSystemNotifications();

    const notifs = await Notification.find({
      $or: [
        { targetUser: req.user._id },
        { targetRole: req.user.role },
        { targetUser: null, targetRole: null },
      ]
    }).sort({ createdAt: -1 }).limit(50);

    const unreadCount = notifs.filter(n => !n.readBy.includes(req.user._id)).length;
    res.json({ success: true, data: notifs, unreadCount });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Mark one as read
router.put('/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { $addToSet: { readBy: req.user._id } });
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Mark all as read
router.put('/read-all', async (req, res) => {
  try {
    await Notification.updateMany({}, { $addToSet: { readBy: req.user._id } });
    res.json({ success: true, message: 'All marked as read' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Create manual notification
router.post('/', async (req, res) => {
  try {
    const notif = await Notification.create(req.body);
    res.status(201).json({ success: true, data: notif });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
