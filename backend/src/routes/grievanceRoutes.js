const express = require('express');
const ctrl = require('../controllers/grievanceController');
const { protectStaff, protectCitizen, optionalCitizen } = require('../middleware/auth');
const { attachmentsUpload } = require('../middleware/upload');

const router = express.Router();

router.get('/track/:referenceNo', optionalCitizen, ctrl.getByReference);
router.post('/public', protectCitizen, attachmentsUpload, ctrl.create);
router.get('/public/mine', protectCitizen, ctrl.myPublic);

router.get('/', protectStaff, ctrl.list);
router.get('/dashboard', protectStaff, ctrl.dashboard);
router.post('/', protectStaff, attachmentsUpload, ctrl.create);
router.get('/:id', protectStaff, ctrl.getById);
router.post('/:id/attachments', protectStaff, attachmentsUpload, ctrl.addAttachments);
router.post('/:id/forward-to-pro', protectStaff, ctrl.forwardToPro);
router.post('/:id/assign-division', protectStaff, ctrl.assignToDivision);
router.post('/:id/submit-action', protectStaff, ctrl.submitAction);
router.post('/:id/revert', protectStaff, ctrl.revertToDivision);
router.post('/:id/complete', protectStaff, ctrl.complete);

module.exports = router;
