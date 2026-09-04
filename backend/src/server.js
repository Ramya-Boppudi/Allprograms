const path = require('path');
const dotenv = require('dotenv');

const env = process.env.NODE_ENV || 'local';
dotenv.config({ path: path.resolve(__dirname, `../.env.${env}`) });

const app = require('./app');
const PORT = process.env.PORT || 8010;

app.listen(PORT, () => {
  console.log(`WAQF grievance API running on port ${PORT} (${env})`);
});
