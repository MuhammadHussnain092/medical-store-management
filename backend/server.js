const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const http    = require('http');
const socketIo= require('socket.io');
require('dotenv').config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Register all models upfront to avoid "Schema hasn't been registered" errors
require('./models/User');
require('./models/Medicine');
require('./models/Category');
require('./models/Supplier');
require('./models/Customer');
require('./models/Sale');
require('./models/Purchase');
require('./models/Expense');
require('./models/EquipmentAsset');
require('./models/Attendance');
require('./models/Payroll');
require('./models/Notification');
require('./models/AuditLog');
require('./models/UtilityBill');
require('./models/MaintenanceLog');
require('./models/Settings');
require('./models/SalaryAdvance');
require('./models/SupplierPayment');
require('./models/Return');

connectDB();

const allowedOrigins = [
  'http://localhost:3000',
  'https://medical-store-management-seven.vercel.app'
];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

const app    = express();
const server = http.createServer(app);
const io     = socketIo(server, {
  cors: { origin: allowedOrigins, methods: ['GET','POST'] }
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.set('io', io);

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/medicines',     require('./routes/medicineRoutes'));
app.use('/api/categories',    require('./routes/categoryRoutes'));
app.use('/api/sales',         require('./routes/saleRoutes'));
app.use('/api/purchases',     require('./routes/purchaseRoutes'));
app.use('/api/suppliers',     require('./routes/supplierRoutes'));
app.use('/api/customers',     require('./routes/customerRoutes'));
app.use('/api/expenses',      require('./routes/expenseRoutes'));
app.use('/api/staff',         require('./routes/staffRoutes'));
app.use('/api/reports',       require('./routes/reportRoutes'));
app.use('/api/assets',        require('./routes/assetRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/utility-bills', require('./routes/utilityRoutes'));
app.use('/api/returns',       require('./routes/returnRoutes'));   // ← RETURNS (cancel + return)

const mongoose = require('mongoose');
app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', store: 'Bilal Inayat Medical Store', db: mongoose.connection.db ? mongoose.connection.db.databaseName : 'unknown', time: new Date() })
);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join', (room) => socket.join(room));
  socket.on('disconnect', () => console.log('Disconnected:', socket.id));
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📋 Returns API: http://localhost:${PORT}/api/returns`);
});

module.exports = { app, io };
