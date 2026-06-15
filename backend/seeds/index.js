require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Medicine = require('../models/Medicine');
const Customer = require('../models/Customer');
const EquipmentAsset = require('../models/EquipmentAsset');
const Settings = require('../models/Settings');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing
  await Promise.all([User.deleteMany(), Category.deleteMany(), Supplier.deleteMany(), Medicine.deleteMany(), Customer.deleteMany(), EquipmentAsset.deleteMany(), Settings.deleteMany()]);
  console.log('Cleared existing data');

  // Settings
  await Settings.create({ storeName: 'Bilal Inayat Medical Store', storeAddress: 'Main Bazar, Lahore', storePhone: '0300-1234567', currency: 'PKR' });

  // Users
  const users = await User.create([
    { name: 'Bilal Inayat', email: 'admin@bilalmedical.com', password: 'Admin@123', role: 'superadmin', phone: '0300-1234567', salary: 50000 },
    { name: 'Hussnain Ahmed', email: 'hussnain@bilalmedical.com', password: 'Admin@123', role: 'admin', phone: '0301-2345678', salary: 40000 },
    { name: 'Ali Raza', email: 'ali@bilalmedical.com', password: 'Staff@123', role: 'staff', phone: '0302-3456789', salary: 25000, shift: 'morning' },
    { name: 'Sara Khan', email: 'sara@bilalmedical.com', password: 'Staff@123', role: 'accountant', phone: '0303-4567890', salary: 30000 },
    { name: 'Usman Ali', email: 'usman@bilalmedical.com', password: 'Staff@123', role: 'inventory_manager', phone: '0304-5678901', salary: 28000 },
  ]);
  console.log('Users created');

  // Categories
  const categories = await Category.create([
    { name: 'Antibiotics', color: '#EF4444', icon: '💊' },
    { name: 'Painkillers', color: '#F97316', icon: '🩺' },
    { name: 'Vitamins & Supplements', color: '#22C55E', icon: '🌿' },
    { name: 'Cardiovascular', color: '#EF4444', icon: '❤️' },
    { name: 'Diabetes', color: '#8B5CF6', icon: '🩸' },
    { name: 'Antifungal', color: '#06B6D4', icon: '🔬' },
    { name: 'Gastrointestinal', color: '#84CC16', icon: '💉' },
    { name: 'Respiratory', color: '#3B82F6', icon: '🫁' },
    { name: 'Skin Care', color: '#F59E0B', icon: '🧴' },
    { name: 'Eye/Ear Drops', color: '#10B981', icon: '👁️' },
  ]);
  console.log('Categories created');

  // Suppliers
  const suppliers = await Supplier.create([
    { name: 'Ahmed Medical Supplies', company: 'Ahmed & Sons', email: 'ahmed@supplier.com', phone: '0310-1234567', city: 'Lahore', outstandingBalance: 15000 },
    { name: 'Pakistan Pharma Distributors', company: 'PPD Ltd', email: 'ppd@pharma.com', phone: '0311-2345678', city: 'Karachi', outstandingBalance: 8500 },
    { name: 'National Medical Center', company: 'NMC', email: 'nmc@medical.com', phone: '0312-3456789', city: 'Islamabad', outstandingBalance: 0 },
    { name: 'Zuberi Pharma', company: 'Zuberi Group', email: 'info@zuberi.com', phone: '0313-4567890', city: 'Lahore', outstandingBalance: 22000 },
  ]);
  console.log('Suppliers created');

  // Medicines
  const medicines = await Medicine.create([
    { name: 'Augmentin 625mg', genericName: 'Amoxicillin + Clavulanic Acid', brand: 'GSK', barcode: 'MED001', category: categories[0]._id, supplier: suppliers[0]._id, purchasePrice: 280, salePrice: 350, mrp: 380, quantity: 150, minStockLevel: 20, batchNo: 'BT2024A', expiryDate: new Date('2026-06-30'), unit: 'strip', packSize: 14 },
    { name: 'Panadol 500mg', genericName: 'Paracetamol', brand: 'GSK', barcode: 'MED002', category: categories[1]._id, supplier: suppliers[0]._id, purchasePrice: 15, salePrice: 22, mrp: 25, quantity: 500, minStockLevel: 50, batchNo: 'BT2024B', expiryDate: new Date('2026-12-31'), unit: 'strip', packSize: 10 },
    { name: 'Brufen 400mg', genericName: 'Ibuprofen', brand: 'Abbott', barcode: 'MED003', category: categories[1]._id, supplier: suppliers[1]._id, purchasePrice: 18, salePrice: 28, mrp: 30, quantity: 8, minStockLevel: 30, batchNo: 'BT2024C', expiryDate: new Date('2025-09-30'), unit: 'strip', packSize: 10 },
    { name: 'Vitamin C 1000mg', genericName: 'Ascorbic Acid', brand: 'Nutrifactor', barcode: 'MED004', category: categories[2]._id, supplier: suppliers[2]._id, purchasePrice: 450, salePrice: 600, mrp: 650, quantity: 80, minStockLevel: 15, batchNo: 'BT2024D', expiryDate: new Date('2026-03-31'), unit: 'bottle', packSize: 60 },
    { name: 'Metformin 500mg', genericName: 'Metformin HCl', brand: 'Getz Pharma', barcode: 'MED005', category: categories[4]._id, supplier: suppliers[3]._id, purchasePrice: 45, salePrice: 65, mrp: 75, quantity: 200, minStockLevel: 30, batchNo: 'BT2024E', expiryDate: new Date('2026-08-31'), prescriptionRequired: true, unit: 'strip', packSize: 20 },
    { name: 'Omeprazole 20mg', genericName: 'Omeprazole', brand: 'Hilton Pharma', barcode: 'MED006', category: categories[6]._id, supplier: suppliers[0]._id, purchasePrice: 55, salePrice: 80, mrp: 90, quantity: 160, minStockLevel: 25, batchNo: 'BT2024F', expiryDate: new Date('2026-05-31'), unit: 'strip', packSize: 14 },
    { name: 'Cetirizine 10mg', genericName: 'Cetirizine HCl', brand: 'AGP', barcode: 'MED007', category: categories[7]._id, supplier: suppliers[1]._id, purchasePrice: 12, salePrice: 20, mrp: 22, quantity: 5, minStockLevel: 40, batchNo: 'BT2024G', expiryDate: new Date('2025-11-30'), unit: 'strip', packSize: 10 },
    { name: 'Atorvastatin 20mg', genericName: 'Atorvastatin', brand: 'Pfizer', barcode: 'MED008', category: categories[3]._id, supplier: suppliers[2]._id, purchasePrice: 85, salePrice: 120, mrp: 135, quantity: 120, minStockLevel: 20, batchNo: 'BT2024H', expiryDate: new Date('2026-07-31'), prescriptionRequired: true, unit: 'strip', packSize: 10 },
    { name: 'Flagyl 400mg', genericName: 'Metronidazole', brand: 'Sanofi', barcode: 'MED009', category: categories[0]._id, supplier: suppliers[3]._id, purchasePrice: 35, salePrice: 55, mrp: 60, quantity: 95, minStockLevel: 20, batchNo: 'BT2024I', expiryDate: new Date('2025-12-31'), unit: 'strip', packSize: 20 },
    { name: 'Zinc Tablet 50mg', genericName: 'Zinc Sulphate', brand: 'Herbion', barcode: 'MED010', category: categories[2]._id, supplier: suppliers[0]._id, purchasePrice: 180, salePrice: 250, mrp: 275, quantity: 60, minStockLevel: 15, batchNo: 'BT2024J', expiryDate: new Date('2026-10-31'), unit: 'bottle', packSize: 30 },
    { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', brand: 'Genera', barcode: 'MED011', category: categories[0]._id, supplier: suppliers[1]._id, purchasePrice: 75, salePrice: 110, mrp: 125, quantity: 130, minStockLevel: 25, batchNo: 'BT2024K', expiryDate: new Date('2026-04-30'), prescriptionRequired: true, unit: 'strip', packSize: 10 },
    { name: 'ORS Sachets', genericName: 'Oral Rehydration Salts', brand: 'Nestle', barcode: 'MED012', category: categories[6]._id, supplier: suppliers[2]._id, purchasePrice: 8, salePrice: 15, mrp: 18, quantity: 300, minStockLevel: 50, batchNo: 'BT2024L', expiryDate: new Date('2026-01-31'), unit: 'sachet', packSize: 1 },
  ]);
  console.log('Medicines created');

  // Customers
  await Customer.create([
    { name: 'Muhammad Asif', phone: '0321-1234567', email: 'asif@gmail.com', address: 'Gulberg, Lahore', loyaltyPoints: 150, totalPurchases: 15000 },
    { name: 'Fatima Malik', phone: '0322-2345678', address: 'DHA Phase 5, Lahore', loyaltyPoints: 80, totalPurchases: 8000 },
    { name: 'Tariq Mehmood', phone: '0323-3456789', address: 'Johar Town, Lahore', loyaltyPoints: 200, totalPurchases: 20000 },
    { name: 'Zainab Hussain', phone: '0324-4567890', address: 'Model Town, Lahore', loyaltyPoints: 45, totalPurchases: 4500 },
    { name: 'Hassan Raza', phone: '0325-5678901', address: 'Cantt, Lahore', loyaltyPoints: 320, totalPurchases: 32000 },
  ]);
  console.log('Customers created');

  // Equipment Assets
  await EquipmentAsset.create([
    { name: 'Display Fridge #1', type: 'fridge', brand: 'Dawlance', model: 'DW-9191', purchaseDate: new Date('2022-01-15'), purchasePrice: 85000, warrantyExpiry: new Date('2025-01-15'), condition: 'good', location: 'Main counter', nextServiceDate: new Date('2025-06-01') },
    { name: 'AC Unit - Main Hall', type: 'ac', brand: 'Gree', model: '1.5 Ton Inverter', purchaseDate: new Date('2021-06-01'), purchasePrice: 95000, warrantyExpiry: new Date('2024-06-01'), condition: 'good', location: 'Main hall', nextServiceDate: new Date('2025-05-15') },
    { name: 'POS Computer', type: 'computer', brand: 'Dell', model: 'Optiplex 3080', purchaseDate: new Date('2023-03-10'), purchasePrice: 120000, warrantyExpiry: new Date('2026-03-10'), condition: 'excellent', location: 'Counter' },
    { name: 'Thermal Printer', type: 'thermal_printer', brand: 'Epson', model: 'TM-T82III', purchaseDate: new Date('2023-03-10'), purchasePrice: 25000, condition: 'excellent', location: 'Counter' },
    { name: 'UPS 2000VA', type: 'ups', brand: 'APC', model: 'Smart-UPS 2000', purchaseDate: new Date('2022-08-20'), purchasePrice: 45000, warrantyExpiry: new Date('2024-08-20'), condition: 'fair', location: 'Back room', nextServiceDate: new Date('2025-04-30') },
    { name: 'CCTV System', type: 'cctv', brand: 'Hikvision', model: '4-Camera DVR', purchaseDate: new Date('2021-12-01'), purchasePrice: 55000, condition: 'good', location: 'Store' },
  ]);
  console.log('Equipment created');

  console.log('\n✅ Seed completed successfully!');
  console.log('📧 Admin Login: admin@bilalmedical.com / Admin@123');
  console.log('📧 Staff Login: ali@bilalmedical.com / Staff@123');
  process.exit(0);
};

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
