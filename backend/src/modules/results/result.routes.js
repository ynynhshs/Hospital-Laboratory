const express = require('express');
const router = express.Router();
const resultController = require('./result.controller');
const { requireAuth, authorizeRoles } = require('../../middleware/auth.middleware');

// Technologists and Admins can enter results. Verifiers and Admins can view them.
router.post('/', requireAuth, authorizeRoles('lab_admin', 'lab_technologist'), resultController.createResult);
router.get('/', requireAuth, authorizeRoles('lab_admin', 'lab_technologist', 'result_verifier'), resultController.getAllResults);
router.get('/awaiting', requireAuth, authorizeRoles('lab_admin', 'lab_technologist'), resultController.getAwaitingResults);

module.exports = router;