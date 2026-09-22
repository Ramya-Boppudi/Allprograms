const path = require('path');
const dotenv = require('dotenv');

const env = process.env.NODE_ENV || 'local';
dotenv.config({ path: path.resolve(__dirname, `../.env.${env}`) });

const app = require('./app');
const PORT = process.env.PORT || 8013;
// const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`WAQF grievance API running on port ${PORT} (${env})`);
});
