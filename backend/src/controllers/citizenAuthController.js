const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const DEV_OTP = process.env.DEV_OTP || '123456';

exports.sendOtp = async (req, res, next) => {
  try {
    const mobile = String(req.body.mobile || '').replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number' });
    }
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query(
      'INSERT INTO otp_challenges (mobile, otp, expires_at) VALUES (?, ?, ?)',
      [mobile, DEV_OTP, expires]
    );
    res.json({
      success: true,
      message: `OTP sent. For this first version use ${DEV_OTP}.`,
      devOtp: DEV_OTP,
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const mobile = String(req.body.mobile || '').replace(/\D/g, '');
    const otp = String(req.body.otp || '').trim();
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim();

    if (!/^[6-9]\d{9}$/.test(mobile) || !otp) {
      return res.status(400).json({ success: false, message: 'Mobile and OTP are required' });
    }

    const [rows] = await pool.query(
      `SELECT * FROM otp_challenges
       WHERE mobile = ? AND otp = ? AND verified = 0 AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [mobile, otp]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
    }
    await pool.query('UPDATE otp_challenges SET verified = 1 WHERE id = ?', [rows[0].id]);

    const [existing] = await pool.query('SELECT * FROM citizens WHERE mobile = ?', [mobile]);
    let citizen;
    if (existing.length) {
      await pool.query(
        'UPDATE citizens SET name = COALESCE(NULLIF(?, ""), name), email = COALESCE(NULLIF(?, ""), email) WHERE id = ?',
        [name, email, existing[0].id]
      );
      citizen = { ...existing[0], name: name || existing[0].name, email: email || existing[0].email };
    } else {
      const [ins] = await pool.query(
        'INSERT INTO citizens (mobile, name, email) VALUES (?, ?, ?)',
        [mobile, name || null, email || null]
      );
      citizen = { id: ins.insertId, mobile, name, email };
    }

    const token = jwt.sign(
      { id: citizen.id, type: 'citizen', mobile: citizen.mobile, name: citizen.name, email: citizen.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );
    res.json({ success: true, token, citizen });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res) => {
  res.json({ success: true, citizen: req.citizen });
};
