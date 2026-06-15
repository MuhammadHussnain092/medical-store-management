const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });
    const user = await User.create({ name, email, password, role: role || 'staff', phone });
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshTokens.push({ token: refreshToken });
    await user.save();
    res.status(201).json({ success: true, message: 'User registered', data: user, accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Account deactivated' });
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshTokens.push({ token: refreshToken });
    user.lastLogin = new Date();
    user.loginHistory.push({ ip: req.ip, device: req.headers['user-agent'], success: true });
    await user.save();
    const userData = user.toJSON();
    res.json({ success: true, message: 'Login successful', data: userData, accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    req.user.refreshTokens = req.user.refreshTokens.filter(t => t.token !== refreshToken);
    await req.user.save();
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.some(t => t.token === refreshToken))
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    const accessToken = generateAccessToken(user._id);
    res.json({ success: true, accessToken });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token expired or invalid' });
  }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address, emergencyContact } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, phone, address, emergencyContact }, { new: true });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ success: false, message: 'Current password incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
