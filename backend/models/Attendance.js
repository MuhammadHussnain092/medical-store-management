const mongoose = require('mongoose');
const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  status: { type: String, enum: ['present', 'absent', 'late', 'half_day', 'leave'], default: 'present' },
  hoursWorked: { type: Number, default: 0 },
  overtime: { type: Number, default: 0 },
  notes: { type: String },
}, { timestamps: true });
module.exports = mongoose.model('Attendance', attendanceSchema);
