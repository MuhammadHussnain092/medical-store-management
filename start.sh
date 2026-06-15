#!/bin/bash
echo "🏥 Bilal Inayat Medical Store — Setup Script"
echo "=============================================="

# Backend
echo ""
echo "📦 Installing Backend Dependencies..."
cd backend
npm install
echo "✅ Backend installed"

# Seed database
echo ""
echo "🌱 Seeding Database with Demo Data..."
npm run seed
echo "✅ Database seeded"

# Frontend
echo ""
echo "📦 Installing Frontend Dependencies..."
cd ../frontend
npm install
echo "✅ Frontend installed"

echo ""
echo "=============================================="
echo "✅ Setup Complete!"
echo ""
echo "🚀 To run the application:"
echo "   Terminal 1 (Backend):  cd backend && npm run dev"
echo "   Terminal 2 (Frontend): cd frontend && npm start"
echo ""
echo "🌐 Open: http://localhost:3000"
echo ""
echo "🔐 Login: admin@bilalmedical.com / Admin@123"
echo "=============================================="
