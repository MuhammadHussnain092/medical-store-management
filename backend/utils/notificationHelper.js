const Notification = require('../models/Notification');
const Medicine = require('../models/Medicine');

// Generate system notifications based on current data
exports.generateSystemNotifications = async () => {
  try {
    const now = new Date();
    const notifications = [];

    // Low stock medicines
    const lowStock = await Medicine.find({
      isActive: true,
      $expr: { $lte: ['$quantity', '$minStockLevel'] }
    }).limit(20);

    for (const med of lowStock) {
      const exists = await Notification.findOne({
        relatedId: med._id,
        type: 'low_stock',
        createdAt: { $gte: new Date(now - 24*60*60*1000) }
      });
      if (!exists) {
        notifications.push({
          title: '⚠️ Low Stock Alert',
          message: `${med.name} has only ${med.quantity} ${med.unit} left (min: ${med.minStockLevel})`,
          type: 'low_stock',
          priority: med.quantity === 0 ? 'critical' : 'high',
          relatedId: med._id,
          relatedModel: 'Medicine',
        });
      }
    }

    // Expiring medicines (30 days)
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
    const expiring = await Medicine.find({
      isActive: true,
      expiryDate: { $lte: thirtyDays, $gte: now }
    }).limit(20);

    for (const med of expiring) {
      const daysLeft = Math.ceil((new Date(med.expiryDate) - now) / 86400000);
      const exists = await Notification.findOne({
        relatedId: med._id,
        type: 'expiry',
        createdAt: { $gte: new Date(now - 24*60*60*1000) }
      });
      if (!exists) {
        notifications.push({
          title: '🕐 Expiry Alert',
          message: `${med.name} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (${new Date(med.expiryDate).toLocaleDateString('en-PK')})`,
          type: 'expiry',
          priority: daysLeft <= 7 ? 'critical' : daysLeft <= 15 ? 'high' : 'medium',
          relatedId: med._id,
          relatedModel: 'Medicine',
        });
      }
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    return notifications.length;
  } catch (err) {
    console.error('Notification generation error:', err.message);
    return 0;
  }
};
