const bcrypt = require('bcryptjs');

const ADMINS = [
  { name: 'Admin 1', email: 'admin1@ksba.karnataka.gov.in' },
  { name: 'Admin 2', email: 'admin2@ksba.karnataka.gov.in' },
  { name: 'Admin 3', email: 'admin3@ksba.karnataka.gov.in' },
  { name: 'Admin 4', email: 'admin4@ksba.karnataka.gov.in' },
  { name: 'Admin 5', email: 'admin5@ksba.karnataka.gov.in' },
];

async function ensureAdminUsers(pool) {
  const passwordHash = await bcrypt.hash('Ksba@123', 10);
  for (const admin of ADMINS) {
    const [existing] = await pool.query('SELECT id FROM staff_users WHERE email = ?', [admin.email]);
    if (existing.length) continue;
    await pool.query(
      `INSERT INTO staff_users (name, email, mobile, password_hash, role_code, is_active)
       VALUES (?, ?, '9999999999', ?, 'admin', 1)`,
      [admin.name, admin.email, passwordHash]
    );
  }
}

module.exports = { ensureAdminUsers, ADMINS };
