const express = require('express');
const router = express.Router();
const resultController = require('./result.controller');
const { requireAuth, authorizeRoles } = require('../../middleware/auth.middleware');

router.post('/', requireAuth, authorizeRoles('lab_admin', 'lab_technologist'), resultController.createResult);
router.get('/', requireAuth, authorizeRoles('lab_admin', 'lab_technologist', 'result_verifier'), resultController.getAllResults);
router.get('/awaiting', requireAuth, authorizeRoles('lab_admin', 'lab_technologist'), resultController.getAwaitingResults);
router.patch('/:resultId/verify', requireAuth, authorizeRoles('lab_admin', 'result_verifier'), resultController.verifyResult);

// ADDED: Return for Correction route
router.patch('/:resultId/return', requireAuth, authorizeRoles('lab_admin', 'result_verifier'), resultController.returnForCorrection);

module.exports = router;