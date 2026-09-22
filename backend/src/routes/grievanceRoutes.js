const express = require('express');
const ctrl = require('../controllers/grievanceController');
const { protectStaff, protectCitizen, optionalCitizen } = require('../middleware/auth');
const { attachmentsUpload } = require('../middleware/upload');

const router = express.Router();

router.get('/track', optionalCitizen, ctrl.getByReference);
router.get('/track/*', optionalCitizen, ctrl.getByReference);
router.post('/public', protectCitizen, attachmentsUpload, ctrl.create);
router.get('/public/mine', protectCitizen, ctrl.myPublic);

router.get('/', protectStaff, ctrl.list);
router.get('/dashboard', protectStaff, ctrl.dashboard);
router.post('/', protectStaff, attachmentsUpload, ctrl.create);
router.get('/:id(\\d+)', protectStaff, ctrl.getById);
router.post('/:id(\\d+)/attachments', protectStaff, attachmentsUpload, ctrl.addAttachments);
router.post('/:id(\\d+)/forward-to-pro', protectStaff, ctrl.forwardToPro);
router.post('/:id(\\d+)/assign-division', protectStaff, ctrl.assignToDivision);
router.post('/:id(\\d+)/submit-action', protectStaff, ctrl.submitAction);
router.post('/:id(\\d+)/revert', protectStaff, ctrl.revertToDivision);
router.post('/:id(\\d+)/complete', protectStaff, ctrl.complete);

module.exports = router;
