const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

const env = process.env.NODE_ENV || 'local';
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });

const pool = mysql.createPool({
  host: process.env.DB_HOST || '192.168.1.106',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ksba_grievance',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+05:30',
  typeCast(field, next) {
    if (field.type === 'DATE' || field.type === 10) {
      return field.string();
    }
    return next();
  },
});

const rawPool = pool.pool || pool;
rawPool.on('connection', (connection) => {
  connection.query("SET time_zone = '+05:30'");
});

async function checkDbConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL:', process.env.DB_HOST, process.env.DB_NAME);
    connection.release();
  } catch (err) {
    console.error('MySQL connection error:', err.message);
  }
}

checkDbConnection();

module.exports = pool;
