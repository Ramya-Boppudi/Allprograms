const pool = require('../config/db');

exports.districts = async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM districts ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.grievanceTypes = async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.id, t.name, t.default_division_id, d.name AS default_division_name
       FROM grievance_types t
       LEFT JOIN divisions d ON d.id = t.default_division_id
       WHERE t.is_active = 1
       ORDER BY t.sort_order`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.divisions = async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id, d.code, d.name,
              s.id AS manager_id, s.name AS manager_name
       FROM divisions d
       LEFT JOIN staff_users s ON s.division_id = d.id AND s.role_code = 'divisional_manager' AND s.is_active = 1
       WHERE d.is_active = 1
       ORDER BY d.id`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.branding = async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT code, title, mime_type, UNIX_TIMESTAMP(updated_at) AS updated_at
       FROM portal_logos
       ORDER BY sort_order, id`
    );
    res.json({
      success: true,
      data: {
        org_name: 'Karnataka State Board of Auqaf',
        logos: rows.map((row) => ({
          code: row.code,
          title: row.title,
          mime_type: row.mime_type,
          url: `/api/masters/logos/${row.code}?v=${row.updated_at || 0}`,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.logoImage = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT mime_type, image_data FROM portal_logos WHERE code = ?',
      [req.params.code]
    );
    if (!rows.length || !rows[0].image_data) {
      return res.status(404).json({ success: false, message: 'Logo not found' });
    }
    res.set('Content-Type', rows[0].mime_type || 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(rows[0].image_data);
  } catch (err) {
    next(err);
  }
};
