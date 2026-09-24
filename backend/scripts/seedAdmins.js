const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');
const { ADMINS } = require('../src/utils/ensureAdminUsers');

async function run() {
  const passwordHash = await bcrypt.hash('Ksba@123', 10);
  const created = [];
  const existing = [];

  for (const admin of ADMINS) {
    const [rows] = await pool.query('SELECT id FROM staff_users WHERE email = ?', [admin.email]);
    if (rows.length) {
      existing.push(admin.email);
      continue;
    }
    await pool.query(
      `INSERT INTO staff_users (name, email, mobile, password_hash, role_code, is_active)
       VALUES (?, ?, '9999999999', ?, 'admin', 1)`,
      [admin.name, admin.email, passwordHash]
    );
    created.push(admin.email);
  }

  console.log('DB host:', process.env.DB_HOST, process.env.DB_NAME);
  console.log('Created:', created.length ? created.join(', ') : 'none (already present)');
  console.log('Already present:', existing.length ? existing.join(', ') : 'none');
  console.log('Use the same official demo password as the other staff logins.');
  await pool.end();
}

run().catch((err) => {
  console.error('Could not create admin logins:', err.message);
  process.exit(1);
});
