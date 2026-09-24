const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const env = process.env.NODE_ENV || 'local';
dotenv.config({ path: path.resolve(__dirname, `../.env.${env}`) });

const DISTRICTS = [
  'Bagalkote', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
  'Bidar', 'Chamarajanagara', 'Chikkaballapura', 'Chikkamagaluru', 'Chitradurga',
  'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan',
  'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal',
  'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga',
  'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Vijayanagara', 'Yadgir',
];

const TYPES = [
  { name: 'Bye Law / Scheme Of Administration', division: 1 },
  { name: 'Appointment of Muthawalli', division: 1 },
  { name: 'Committee Related', division: 1 },
  { name: 'No Objection Certificate', division: 2 },
  { name: 'Appointment of Administrator/ Caretaker', division: 1 },
  { name: 'Election', division: 1 },
  { name: 'Grants', division: 3 },
  { name: 'Accounts', division: 3 },
  { name: 'Audit', division: 3 },
  { name: 'Legal matters', division: 2 },
  { name: 'Complaints against WAQF employees', division: 4 },
  { name: 'Others', division: 5 },
];

async function main() {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || 'ksba_grievance';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;

  console.log(`Connecting to ${host} as ${user} ...`);
  const root = await mysql.createConnection({ host, user, password, port });
  await root.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`Database ${database} is ready.`);
  await root.end();

  const conn = await mysql.createConnection({ host, user, password, port, database, multipleStatements: true });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS divisions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(120) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS staff_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      mobile VARCHAR(15) NULL,
      password_hash VARCHAR(255) NOT NULL,
      role_code VARCHAR(40) NOT NULL,
      division_id INT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      last_login DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_staff_division FOREIGN KEY (division_id) REFERENCES divisions(id)
    );

    CREATE TABLE IF NOT EXISTS grievance_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      default_division_id INT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      CONSTRAINT fk_type_division FOREIGN KEY (default_division_id) REFERENCES divisions(id)
    );

    CREATE TABLE IF NOT EXISTS districts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS grievance_sequences (
      year INT PRIMARY KEY,
      last_number INT NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS grievances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reference_no VARCHAR(40) NOT NULL UNIQUE,
      citizen_name VARCHAR(150) NOT NULL,
      citizen_mobile VARCHAR(15) NOT NULL,
      citizen_email VARCHAR(150) NULL,
      district_id INT NOT NULL,
      taluk VARCHAR(80) NOT NULL,
      grievance_type_id INT NOT NULL,
      description TEXT NOT NULL,
      status ENUM('CREATED','PENDING','COMPLETED') NOT NULL DEFAULT 'CREATED',
      stage ENUM('DRAFT_SAVED','WITH_PRO','WITH_DIVISION','WITH_PRO_REVIEW','COMPLETED') NOT NULL DEFAULT 'DRAFT_SAVED',
      division_id INT NULL,
      assigned_dm_id INT NULL,
      created_by_staff_id INT NULL,
      filed_by ENUM('STAFF','PUBLIC') NOT NULL DEFAULT 'STAFF',
      due_date DATE NULL,
      action_taken TEXT NULL,
      completed_at DATETIME NULL,
      fee_applicable TINYINT(1) NOT NULL DEFAULT 0,
      fee_amount DECIMAL(10,2) NOT NULL DEFAULT 10.00,
      fee_collected TINYINT(1) NOT NULL DEFAULT 0,
      fee_transaction_id VARCHAR(80) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_g_district FOREIGN KEY (district_id) REFERENCES districts(id),
      CONSTRAINT fk_g_type FOREIGN KEY (grievance_type_id) REFERENCES grievance_types(id),
      CONSTRAINT fk_g_division FOREIGN KEY (division_id) REFERENCES divisions(id),
      CONSTRAINT fk_g_dm FOREIGN KEY (assigned_dm_id) REFERENCES staff_users(id),
      CONSTRAINT fk_g_creator FOREIGN KEY (created_by_staff_id) REFERENCES staff_users(id)
    );

    CREATE TABLE IF NOT EXISTS grievance_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      grievance_id INT NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      stored_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(120) NULL,
      file_size INT NOT NULL DEFAULT 0,
      file_path VARCHAR(500) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_att_g FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS grievance_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      grievance_id INT NOT NULL,
      actor_type ENUM('STAFF','PUBLIC','SYSTEM') NOT NULL,
      actor_id INT NULL,
      action VARCHAR(80) NOT NULL,
      from_stage VARCHAR(40) NULL,
      to_stage VARCHAR(40) NULL,
      remarks TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_ev_g FOREIGN KEY (grievance_id) REFERENCES grievances(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      audience ENUM('STAFF','PUBLIC') NOT NULL,
      staff_user_id INT NULL,
      citizen_mobile VARCHAR(15) NULL,
      grievance_id INT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      channel ENUM('INAPP','EMAIL','SMS') NOT NULL DEFAULT 'INAPP',
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_n_staff FOREIGN KEY (staff_user_id) REFERENCES staff_users(id),
      CONSTRAINT fk_n_g FOREIGN KEY (grievance_id) REFERENCES grievances(id)
    );

    CREATE TABLE IF NOT EXISTS grievance_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      grievance_id INT NOT NULL,
      order_ref VARCHAR(40) NOT NULL UNIQUE,
      amount DECIMAL(10,2) NOT NULL,
      status ENUM('PENDING','PAID','EXPIRED','CANCELLED') NOT NULL DEFAULT 'PENDING',
      upi_link TEXT NOT NULL,
      pay_url VARCHAR(500) NOT NULL,
      transaction_id VARCHAR(80) NULL,
      payer_vpa VARCHAR(80) NULL,
      paid_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_pay_g FOREIGN KEY (grievance_id) REFERENCES grievances(id)
    );

    CREATE TABLE IF NOT EXISTS otp_challenges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mobile VARCHAR(15) NOT NULL,
      otp VARCHAR(10) NOT NULL,
      expires_at DATETIME NOT NULL,
      verified TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS citizens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mobile VARCHAR(15) NOT NULL UNIQUE,
      name VARCHAR(150) NULL,
      email VARCHAR(150) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS portal_logos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(40) NOT NULL UNIQUE,
      title VARCHAR(150) NOT NULL,
      mime_type VARCHAR(80) NOT NULL,
      file_name VARCHAR(120) NOT NULL,
      image_data MEDIUMBLOB NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  const [divCount] = await conn.query('SELECT COUNT(*) AS c FROM divisions');
  if (!divCount[0].c) {
    for (let i = 1; i <= 5; i += 1) {
      await conn.query(
        'INSERT INTO divisions (code, name) VALUES (?, ?)',
        [`DIV${i}`, `Division ${i}`]
      );
    }
    console.log('Seeded Division 1–5 (placeholder names).');
  }

  const [distCount] = await conn.query('SELECT COUNT(*) AS c FROM districts');
  if (!distCount[0].c) {
    for (const name of DISTRICTS) {
      await conn.query('INSERT INTO districts (name) VALUES (?)', [name]);
    }
    console.log('Seeded 31 Karnataka districts.');
  }

  const [typeCount] = await conn.query('SELECT COUNT(*) AS c FROM grievance_types');
  if (!typeCount[0].c) {
    for (let i = 0; i < TYPES.length; i += 1) {
      await conn.query(
        'INSERT INTO grievance_types (name, default_division_id, sort_order) VALUES (?, ?, ?)',
        [TYPES[i].name, TYPES[i].division, i + 1]
      );
    }
    console.log('Seeded 12 grievance types.');
  }

  const passwordHash = await bcrypt.hash('Ksba@123', 10);
  const staff = [
    { name: 'Chairman, KSBA', email: 'chairman@ksba.karnataka.gov.in', role: 'chairman' },
    { name: 'Chief Executive Officer, KSBA', email: 'ceo@ksba.karnataka.gov.in', role: 'ceo' },
    { name: 'Additional CEO, KSBA', email: 'aceo@ksba.karnataka.gov.in', role: 'aceo' },
    { name: 'Chief Accounts Officer, KSBA', email: 'cao@ksba.karnataka.gov.in', role: 'cao' },
    { name: 'Assistant Secretary, KSBA', email: 'asst.secretary@ksba.karnataka.gov.in', role: 'asst_secretary' },
    { name: 'Public Relation Officer, KSBA', email: 'pro@ksba.karnataka.gov.in', role: 'pro' },
    { name: 'Admin 1', email: 'admin1@ksba.karnataka.gov.in', role: 'admin' },
    { name: 'Admin 2', email: 'admin2@ksba.karnataka.gov.in', role: 'admin' },
    { name: 'Admin 3', email: 'admin3@ksba.karnataka.gov.in', role: 'admin' },
    { name: 'Admin 4', email: 'admin4@ksba.karnataka.gov.in', role: 'admin' },
    { name: 'Admin 5', email: 'admin5@ksba.karnataka.gov.in', role: 'admin' },
    { name: 'Divisional Manager 1', email: 'dm1@ksba.karnataka.gov.in', role: 'divisional_manager', division: 1 },
    { name: 'Divisional Manager 2', email: 'dm2@ksba.karnataka.gov.in', role: 'divisional_manager', division: 2 },
    { name: 'Divisional Manager 3', email: 'dm3@ksba.karnataka.gov.in', role: 'divisional_manager', division: 3 },
    { name: 'Divisional Manager 4', email: 'dm4@ksba.karnataka.gov.in', role: 'divisional_manager', division: 4 },
    { name: 'Divisional Manager 5', email: 'dm5@ksba.karnataka.gov.in', role: 'divisional_manager', division: 5 },
  ];

  for (const s of staff) {
    const [existing] = await conn.query('SELECT id FROM staff_users WHERE email = ?', [s.email]);
    if (!existing.length) {
      await conn.query(
        `INSERT INTO staff_users (name, email, mobile, password_hash, role_code, division_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [s.name, s.email, '9999999999', passwordHash, s.role, s.division || null]
      );
    }
  }
  console.log('Seeded official logins. Default password: Ksba@123');

  const logosDir = path.resolve(__dirname, '../assets/logos');
  const logos = [
    {
      code: 'board_logo',
      title: 'Karnataka State Board of Auqaf',
      mime_type: 'image/jpeg',
      file_name: 'board-logo.jpg',
      sort_order: 1,
    },
    {
      code: 'state_emblem',
      title: 'Government of Karnataka',
      mime_type: 'image/png',
      file_name: 'state-emblem.png',
      sort_order: 2,
    },
  ];

  for (const logo of logos) {
    const filePath = path.join(logosDir, logo.file_name);
    if (!fs.existsSync(filePath)) {
      console.warn(`Logo file missing, skipped: ${filePath}`);
      continue;
    }
    const imageData = fs.readFileSync(filePath);
    await conn.query(
      `INSERT INTO portal_logos (code, title, mime_type, file_name, image_data, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         mime_type = VALUES(mime_type),
         file_name = VALUES(file_name),
         image_data = VALUES(image_data),
         sort_order = VALUES(sort_order)`,
      [logo.code, logo.title, logo.mime_type, logo.file_name, imageData, logo.sort_order]
    );
  }
  console.log('Seeded portal logos into the database.');

  await conn.end();
  console.log('initDb complete.');
}

main().catch((err) => {
  console.error('initDb failed:', err.message);
  process.exit(1);
});
