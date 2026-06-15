const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['superadmin', 'admin', 'staff', 'accountant', 'inventory_manager'], default: 'staff' },
  phone: { type: String },
  cnic: { type: String },
  address: { type: String },
  salary: { type: Number, default: 0 },
  shift: { type: String, enum: ['morning', 'evening', 'night'], default: 'morning' },
  joiningDate: { type: Date, default: Date.now },
  emergencyContact: { type: String },
  avatar: { type: String },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  emailVerifyToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  loginHistory: [{ ip: String, device: String, time: { type: Date, default: Date.now }, success: Boolean }],
  refreshTokens: [{ token: String, createdAt: { type: Date, default: Date.now } }],
  lastLogin: Date,
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.twoFactorSecret;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
