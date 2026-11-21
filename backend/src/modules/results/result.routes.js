const express = require('express');
const router = express.Router();
const resultController = require('./result.controller');
const { requireAuth, authorizeRoles } = require('../../middleware/auth.middleware');

// Result entry is limited to the technologist role. Administrators may view
// results but do not automatically receive entry or verification permission.
router.post('/', requireAuth, authorizeRoles('lab_technologist'), resultController.createResult);
router.get('/', requireAuth, authorizeRoles('lab_admin', 'lab_technologist', 'result_verifier'), resultController.getAllResults);
router.get('/awaiting', requireAuth, authorizeRoles('lab_technologist'), resultController.getAwaitingResults);

// Verification and return-for-correction belong to the separate verifier role.
router.patch('/:resultId/verify', requireAuth, authorizeRoles('result_verifier'), resultController.verifyResult);

router.patch('/:resultId/return', requireAuth, authorizeRoles('result_verifier'), resultController.returnForCorrection);

module.exports = router;