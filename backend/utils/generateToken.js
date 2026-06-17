const jwt = require('jsonwebtoken');

exports.generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'bilal_medical_jwt_secret_2024_ultra_secure_key', { expiresIn: process.env.JWT_EXPIRE || '7d' });

exports.generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || 'bilal_medical_refresh_secret_2024_key', { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' });
