const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const staffAuthRoutes = require('./routes/staffAuthRoutes');
const citizenAuthRoutes = require('./routes/citizenAuthRoutes');
const masterRoutes = require('./routes/masterRoutes');
const grievanceRoutes = require('./routes/grievanceRoutes');
const { staff: staffNoteRoutes, publicNotes } = require('./routes/notificationRoutes');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, name: 'WAQF Board Public Grievance Redressal Portal' });
});

app.use('/api/staff/auth', staffAuthRoutes);
app.use('/api/public/auth', citizenAuthRoutes);
app.use('/api/masters', masterRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/staff/notifications', staffNoteRoutes);
app.use('/api/public/notifications', publicNotes);

app.use(errorHandler);
module.exports = app;
