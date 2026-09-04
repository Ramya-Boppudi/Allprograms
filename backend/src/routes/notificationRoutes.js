const express = require('express');
const { list, markRead } = require('../controllers/notificationController');
const { protectStaff, protectCitizen } = require('../middleware/auth');

const staff = express.Router();
staff.get('/', protectStaff, list);
staff.post('/:id/read', protectStaff, markRead);

const publicNotes = express.Router();
publicNotes.get('/', protectCitizen, list);
publicNotes.post('/:id/read', protectCitizen, markRead);

module.exports = { staff, publicNotes };
