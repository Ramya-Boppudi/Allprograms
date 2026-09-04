const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const protectStaff = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.type !== 'staff') {
      return res.status(401).json({ success: false, message: 'Staff token required' });
    }
    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.email, s.mobile, s.role_code, s.division_id, s.is_active,
              d.name AS division_name
       FROM staff_users s
       LEFT JOIN divisions d ON d.id = s.division_id
       WHERE s.id = ?`,
      [decoded.id]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (!rows[0].is_active) {
      return res.status(403).json({ success: false, message: 'Account inactive' });
    }
    req.user = { ...rows[0], type: 'staff' };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token failed' });
  }
};

const protectCitizen = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.type !== 'citizen') {
      return res.status(401).json({ success: false, message: 'Citizen token required' });
    }
    req.citizen = {
      id: decoded.id,
      mobile: decoded.mobile,
      name: decoded.name || '',
      email: decoded.email || '',
      type: 'citizen',
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token failed' });
  }
};

const optionalCitizen = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.type === 'citizen') {
      req.citizen = {
        id: decoded.id,
        mobile: decoded.mobile,
        name: decoded.name || '',
        email: decoded.email || '',
        type: 'citizen',
      };
    }
  } catch (_) {
    /* ignore invalid optional token */
  }
  next();
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role_code)) {
    return res.status(403).json({ success: false, message: 'Not allowed for this role' });
  }
  next();
};

module.exports = { protectStaff, protectCitizen, optionalCitizen, authorize };
