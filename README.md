# 🏥 Bilal Inayat Medical Store — Management System

A complete enterprise-grade MERN stack application for medical store management.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Backend Setup
```bash
cd backend
npm install
npm run seed       # Load demo data into MongoDB
npm run dev        # Start backend on port 5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start          # Start frontend on port 3000
```

### 3. Open in Browser
Visit: http://localhost:3000

## 🔐 Demo Login Credentials

| Role        | Email                         | Password   |
|-------------|-------------------------------|------------|
| Super Admin | admin@bilalmedical.com        | Admin@123  |
| Staff       | ali@bilalmedical.com          | Staff@123  |
| Accountant  | sara@bilalmedical.com         | Staff@123  |
| Inv Manager | usman@bilalmedical.com        | Staff@123  |

## 📦 Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React.js, Redux Toolkit, Recharts       |
| Backend    | Node.js, Express.js                     |
| Database   | MongoDB Atlas                           |
| Auth       | JWT + Refresh Tokens                    |
| Real-time  | Socket.io                               |

## 📁 Project Structure

```
bilal-medical/
├── backend/
│   ├── config/          # DB config
│   ├── controllers/     # Business logic
│   ├── middleware/       # Auth, error handling
│   ├── models/          # MongoDB schemas (15+ models)
│   ├── routes/          # API routes
│   ├── seeds/           # Demo data
│   ├── utils/           # Helpers
│   └── server.js        # Entry point
│
└── frontend/
    └── src/
        ├── components/  # Reusable UI components
        ├── pages/       # All 14 module pages
        ├── store/       # Redux slices
        └── utils/       # API client
```

## 🎯 Modules

- ✅ Dashboard with live charts
- ✅ Medicine Management (CRUD + filters)
- ✅ Billing / POS System
- ✅ Sales Tracking
- ✅ Purchase Orders
- ✅ Supplier Management
- ✅ Customer Profiles & Loyalty
- ✅ Inventory & Stock Alerts
- ✅ Staff & Payroll
- ✅ Expense Tracking
- ✅ Financial Reports
- ✅ Equipment Asset Management
- ✅ Utility Bills Tracker
- ✅ Settings & Themes
- ✅ Light / Dark Mode
- ✅ Role-based Access Control
