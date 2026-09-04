const pool = require('../config/db');

exports.list = async (req, res, next) => {
  try {
    const params = [];
    let sql = `SELECT * FROM notifications WHERE 1=1`;
    if (req.user) {
      sql += ' AND audience = "STAFF" AND staff_user_id = ?';
      params.push(req.user.id);
    } else {
      sql += ' AND audience = "PUBLIC" AND citizen_mobile = ?';
      params.push(req.citizen.mobile);
    }
    sql += ' ORDER BY id DESC LIMIT 100';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    if (req.user) {
      await pool.query(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND staff_user_id = ?',
        [req.params.id, req.user.id]
      );
    } else {
      await pool.query(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND citizen_mobile = ?',
        [req.params.id, req.citizen.mobile]
      );
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
