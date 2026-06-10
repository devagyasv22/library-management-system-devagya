const express = require('express');
const jwt = require('jsonwebtoken');
const { Admin, User, Library, Attendance, Payment } = require('./models');
const { sendWhatsAppMessage, getWhatsAppStatus, logoutWhatsApp, connectWhatsApp } = require('./whatsapp');
const upload = require('./upload');
const router = express.Router();

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  try {
    req.user = decoded;
    if (decoded.role === 'admin') {
      const admin = await Admin.findById(decoded.id);
      if (!admin) return res.status(401).json({ error: 'Session expired. Please log in again.' });
      req.libraryId = admin.libraryId;
    } else if (decoded.role === 'user') {
      const user = await User.findById(decoded.id);
      if (!user) return res.status(401).json({ error: 'Session expired. Please log in again.' });
      
      if (!user.libraryId) {
        const defaultLibrary = await Library.findOne();
        if (defaultLibrary) {
          await User.updateOne({ _id: user._id }, { $set: { libraryId: defaultLibrary._id } });
          user.libraryId = defaultLibrary._id;
        }
      }
      
      req.libraryId = user.libraryId;
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Middleware error: ' + err.message });
  }
};

let otpStore = {}; 

router.post('/admin/request-otp', async (req, res) => {
  const { phone } = req.body;
  const otp = '1234'; // Hardcoded for testing
  console.log('OTP is:', otp);
  otpStore[phone] = otp;
  const admin = await Admin.findOne({ phone });
  if (admin && admin.libraryId) {
    await sendWhatsAppMessage(admin.libraryId.toString(), phone, `Your Admin OTP is ${otp}`);
  }
  res.json({ message: 'OTP sent' });
});

router.post('/admin/login', async (req, res) => {
  const { phone, otp } = req.body;
  if (otpStore[phone] !== otp) return res.status(400).json({ error: 'Invalid OTP' });
  delete otpStore[phone];

  const admin = await Admin.findOne({ phone });
  if (!admin) return res.status(404).json({ error: 'Admin not found. Please sign up.' });

  if (!admin.libraryId) {
    const library = await Library.create({ name: 'My Library', adminId: admin._id });
    admin.libraryId = library._id;
    await admin.save();
  }

  const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET);
  res.json({ token, admin, libraryId: admin.libraryId });
});

router.post('/admin/signup', async (req, res) => {
  const { phone, otp, name, libraryName } = req.body;
  if (otpStore[phone] !== otp) return res.status(400).json({ error: 'Invalid OTP' });
  delete otpStore[phone];

  let admin = await Admin.findOne({ phone });
  if (admin) {
    if (admin.libraryId) {
      return res.status(400).json({ error: 'Admin already registered a library. Please login.' });
    }
    // Legacy admin found without a library. Upgrade them!
    admin.name = name || admin.name;
  } else {
    admin = await Admin.create({ phone, name });
  }

  const library = await Library.create({ name: libraryName, adminId: admin._id });
  
  admin.libraryId = library._id;
  await admin.save();

  const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET);
  res.json({ token, admin, library });
});

router.get('/admin/dashboard', authMiddleware, async (req, res) => {
  try {
    if (!req.libraryId) return res.status(400).json({ error: 'No library associated' });
    
    const users = await User.find({ libraryId: req.libraryId });
    const config = await Library.findById(req.libraryId);

    const today = new Date();
    today.setHours(0,0,0,0);
    const attendances = await Attendance.find({ libraryId: req.libraryId, date: { $gte: today } });
    
    const usersWithAttendance = users.map(user => {
      const userAttendance = attendances.find(a => a.userId.toString() === user._id.toString());
      return {
        ...user.toObject(),
        isPresent: userAttendance?.status === 'checked_in',
        todayMinutes: userAttendance?.totalMinutes || 0
      };
    });

    res.json({ users: usersWithAttendance, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/users', authMiddleware, async (req, res) => {
  try {
    const { phone, name, parentPhone, isPremium } = req.body;
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

    const user = await User.create({ libraryId: req.libraryId, phone, name, parentPhone, isPremium, subscriptionEndDate });

    const attendanceUrl = `http://localhost:5173/user-login`;
    await sendWhatsAppMessage(req.libraryId.toString(), user.phone, `Welcome ${name}! Your library account has been created. Please log in here to mark your attendance: ${attendanceUrl}`);

    res.json({ message: 'User created', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/users/:id', authMiddleware, async (req, res) => {
  try {
    const { phone, name, parentPhone, isPremium, subscriptionEndDate } = req.body;
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, libraryId: req.libraryId },
      { phone, name, parentPhone, isPremium, subscriptionEndDate },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User updated', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/users/:id', authMiddleware, async (req, res) => {
  await User.findOneAndDelete({ _id: req.params.id, libraryId: req.libraryId });
  res.json({ message: 'User deleted' });
});

router.get('/admin/whatsapp/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view WhatsApp status' });
    }
    const status = getWhatsAppStatus(req.libraryId.toString());
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/whatsapp/logout', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can disconnect WhatsApp' });
    }
    await logoutWhatsApp(req.libraryId.toString());
    res.json({ success: true, message: 'WhatsApp disconnected. Generating new QR...' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/whatsapp/reset', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can reset WhatsApp' });
    }
    const fs = require('fs');
    const sessionPath = `.wwebjs_auth/session-${req.libraryId.toString()}`;
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    await logoutWhatsApp(req.libraryId.toString());
    res.json({ success: true, message: 'WhatsApp session cleared.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Explicit connect endpoint - only launches Chrome when admin clicks "Connect"
router.post('/admin/whatsapp/connect', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can connect WhatsApp' });
    }
    const status = await connectWhatsApp(req.libraryId.toString());
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/payments/pending', authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ libraryId: req.libraryId, status: 'pending' })
      .populate('userId', 'name phone')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/payments/:id/verify', authMiddleware, async (req, res) => {
  try {
    const { action } = req.body; // 'verify' or 'reject'
    const payment = await Payment.findOne({ _id: req.params.id, libraryId: req.libraryId }).populate('userId');
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (action === 'verify') {
      payment.status = 'verified';
      
      // Add 1 month to user subscription
      const user = payment.userId;
      const currentEnd = user.subscriptionEndDate && user.subscriptionEndDate > new Date() ? new Date(user.subscriptionEndDate) : new Date();
      currentEnd.setMonth(currentEnd.getMonth() + 1);
      
      user.subscriptionEndDate = currentEnd;
      user.status = 'active';
      await user.save();
      
      await sendWhatsAppMessage(req.libraryId.toString(), user.phone, `Your payment of ₹${payment.amount} has been verified. Your subscription is now active until ${currentEnd.toLocaleDateString()}.`);
    } else {
      payment.status = 'rejected';
      await sendWhatsAppMessage(req.libraryId.toString(), payment.userId.phone, `Your payment of ₹${payment.amount} (UTR: ${payment.utrNumber}) could not be verified. Please contact the admin.`);
    }
    
    await payment.save();
    res.json({ message: `Payment ${action}ed`, payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/users/:id/history', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, libraryId: req.libraryId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const attendance = await Attendance.find({ userId: user._id }).sort({ date: -1 }).limit(30);
    const payments = await Payment.find({ userId: user._id }).sort({ createdAt: -1 });

    res.json({ user, attendance, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/users/:id/payment', authMiddleware, async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, libraryId: req.libraryId });
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.status = 'active';
  const newEnd = new Date(user.subscriptionEndDate || new Date());
  newEnd.setMonth(newEnd.getMonth() + 1);
  user.subscriptionEndDate = newEnd;

  await user.save();
  await sendWhatsAppMessage(req.libraryId.toString(), user.phone, `Payment confirmed. Your subscription is renewed until ${newEnd.toDateString()}`);
  res.json({ message: 'Payment approved', user });
});

router.post('/admin/config', authMiddleware, async (req, res) => {
  const { latitude, longitude, radiusMeters, upiId } = req.body;
  let config = await Library.findById(req.libraryId);
  if (!config) return res.status(400).json({ error: 'Library not found. Please log in again.' });
  
  config.latitude = latitude; config.longitude = longitude;
  config.radiusMeters = radiusMeters; config.upiId = upiId;
  await config.save();
  
  res.json({ message: 'Config updated', config });
});

// ----- USER ROUTES -----

router.post('/user/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const users = await User.find({ phone }).populate('libraryId');
    if (users.length === 0) return res.status(404).json({ error: 'User not found. Please contact admin to register.' });
    
    const user = users[0];
    const otp = '1234'; // Hardcoded for testing. In prod: Math.floor(1000 + Math.random() * 9000).toString()
    otpStore[phone] = otp;
    console.log('User OTP is:', otp);

    if (user.libraryId) {
      const { sendWhatsAppMessage } = require('./whatsapp');
      await sendWhatsAppMessage(user.libraryId._id.toString(), phone, `Your Library Login OTP is ${otp}`);
    }

    res.json({ message: 'OTP sent via WhatsApp' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/user/login', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (otpStore[phone] !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    delete otpStore[phone];

    const users = await User.find({ phone }).populate('libraryId');
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const user = users[0];

    if (!user.libraryId) {
      const defaultLibrary = await Library.findOne();
      if (defaultLibrary) {
        await User.updateOne({ _id: user._id }, { $set: { libraryId: defaultLibrary._id } });
        user.libraryId = defaultLibrary._id;
      }
    }

    const token = jwt.sign({ id: user._id, role: 'user' }, process.env.JWT_SECRET);
    res.json({ token, user, library: user.libraryId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/user/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const config = req.libraryId ? await Library.findById(req.libraryId) : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendance = await Attendance.findOne({ userId: req.user.id, date: { $gte: today } });

    res.json({ user, config, attendance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

router.post('/user/attendance/check-in', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const config = await Library.findById(req.libraryId);
    if (!config || !config.latitude) return res.status(400).json({ error: 'Library location not configured yet' });

    const distance = getDistanceInMeters(latitude, longitude, config.latitude, config.longitude);
    if (distance > (config.radiusMeters || 50)) {
      return res.status(400).json({ error: `You are not within the library radius. Distance: ${Math.round(distance)}m` });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({ userId: req.user.id, date: { $gte: today } });
    if (!attendance) {
      attendance = await Attendance.create({ libraryId: req.libraryId, userId: req.user.id, checkInTime: new Date() });
    } else {
      if (!attendance.libraryId) attendance.libraryId = req.libraryId; // Legacy data patch
      attendance.status = 'checked_in';
      attendance.checkInTime = new Date();
      await attendance.save();
    }
    
    const user = await User.findById(req.user.id);
    if (user && user.phone) {
      const dashboardUrl = `http://localhost:5173/user-dashboard`;
      await sendWhatsAppMessage(req.libraryId.toString(), user.phone, `You have successfully checked in at ${config.name}! When you leave, please click this link to check out: ${dashboardUrl}`);
    }
    
    const io = req.app.get('io');
    if (io) io.emit(`attendanceUpdate_${req.libraryId}`);
    
    res.json({ message: 'Checked In successfully', attendance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/user/attendance/check-out', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({ userId: req.user.id, date: { $gte: today } });
    if (!attendance || attendance.status === 'checked_out') {
      return res.status(400).json({ error: 'You are not checked in' });
    }

    if (!attendance.libraryId) attendance.libraryId = req.libraryId; // Legacy data patch
    attendance.status = 'checked_out';
    attendance.checkOutTime = new Date();

    const diffMs = attendance.checkOutTime - attendance.checkInTime;
    const diffMins = Math.round(diffMs / 60000);
    attendance.totalMinutes += diffMins;

    await attendance.save();

    const io = req.app.get('io');
    if (io) io.emit(`attendanceUpdate_${req.libraryId}`);

    res.json({ message: 'Checked out successfully', totalMinutes: attendance.totalMinutes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/user/history', authMiddleware, async (req, res) => {
  try {
    const attendance = await Attendance.find({ userId: req.user.id }).sort({ date: -1 }).limit(30);
    const payments = await Payment.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ attendance, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/user/payments', authMiddleware, upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Screenshot is required' });
    
    const { amount, utrNumber } = req.body;
    if (!amount || !utrNumber) return res.status(400).json({ error: 'Amount and UTR number are required' });

    const payment = await Payment.create({
      libraryId: req.libraryId,
      userId: req.user.id,
      amount,
      utrNumber,
      screenshotUrl: `/uploads/${req.file.filename}`
    });

    const user = await User.findById(req.user.id);
    const admin = await Admin.findOne({ libraryId: req.libraryId });
    if (admin) {
      await sendWhatsAppMessage(req.libraryId.toString(), admin.phone, `New payment submitted by ${user.name} for ₹${amount}. UTR: ${utrNumber}. Please verify in your dashboard.`);
    }

    res.json({ message: 'Payment submitted successfully', payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
