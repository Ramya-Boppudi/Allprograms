const path = require('path');
const dotenv = require('dotenv');

const env = process.env.NODE_ENV || 'local';
dotenv.config({ path: path.resolve(__dirname, `../.env.${env}`) });

const app = require('./app');
const pool = require('./config/db');
const { ensurePaymentSchema } = require('./utils/ensurePaymentSchema');
const { ensureAdminUsers } = require('./utils/ensureAdminUsers');

ensurePaymentSchema(pool).catch((err) => {
  console.error('Payment schema setup failed:', err.message);
});
ensureAdminUsers(pool).catch((err) => {
  console.error('Admin login setup failed:', err.message);
});

const PORT = process.env.PORT || 8013;
// const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`WAQF grievance API running on port ${PORT} (${env})`);
});
