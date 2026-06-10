const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String },
  libraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Library' }
});

const LibrarySchema = new mongoose.Schema({
  name: { type: String, required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  latitude: { type: Number, default: 0 },
  longitude: { type: Number, default: 0 },
  radiusMeters: { type: Number, default: 50 },
  upiId: { type: String },
  qrCodeUrl: { type: String }
});

const UserSchema = new mongoose.Schema({
  libraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Library', required: true },
  phone: { type: String, required: true },
  name: { type: String, required: true },
  parentPhone: { type: String },
  isPremium: { type: Boolean, default: false },
  subscriptionEndDate: { type: Date },
  status: { type: String, enum: ['active', 'inactive', 'pending_payment'], default: 'active' },
});
UserSchema.index({ libraryId: 1, phone: 1 }, { unique: true });

const AttendanceSchema = new mongoose.Schema({
  libraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Library', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  totalMinutes: { type: Number, default: 0 },
  status: { type: String, enum: ['checked_in', 'checked_out'], default: 'checked_in' }
});

const PaymentSchema = new mongoose.Schema({
  libraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Library', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  utrNumber: { type: String, required: true },
  screenshotUrl: { type: String, required: true },
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', AdminSchema);
const Library = mongoose.model('Library', LibrarySchema);
const User = mongoose.model('User', UserSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);
const Payment = mongoose.model('Payment', PaymentSchema);

module.exports = { Admin, Library, User, Attendance, Payment };
