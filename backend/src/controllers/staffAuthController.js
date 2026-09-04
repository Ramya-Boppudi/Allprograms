const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const signStaff = (user) =>
  jwt.sign(
    { id: user.id, type: 'staff', role: user.role_code },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const [rows] = await pool.query(
      `SELECT s.*, d.name AS division_name
       FROM staff_users s
       LEFT JOIN divisions d ON d.id = s.division_id
       WHERE s.email = ?`,
      [email.trim()]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account inactive' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    await pool.query('UPDATE staff_users SET last_login = NOW() WHERE id = ?', [user.id]);
    const token = signStaff(user);
    delete user.password_hash;
    res.json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res) => {
  res.json({ success: true, user: req.user });
};
