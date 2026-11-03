
const express = require('express');

const {
    registerTest,
    getTestByIdController,
    searchTestsController
} = require('./test-catalog.controller');

const {
    requireAuth,
    authorizeRoles
} = require('../../middleware/auth.middleware');

const router = express.Router();

// ==========================================
// MEDILINK LABORATORY
// TEST CATALOG ROUTES
// ==========================================

// 1. REGISTER LABORATORY TEST
// Only laboratory administrators can add tests.

router.post(
    '/',
    requireAuth,
    authorizeRoles('lab_admin'),
    registerTest
);

// ==========================================
// 2. SEARCH AND FILTER LABORATORY TESTS
// All authenticated laboratory roles can view tests.
// ==========================================

router.get(
    '/',
    requireAuth,
    authorizeRoles(
        'lab_admin',
        'lab_receptionist',
        'lab_technologist',
        'result_verifier',
        'requesting_clinician'
    ),
    searchTestsController
);

// ==========================================
// 3. GET LABORATORY TEST BY ID
// ==========================================

router.get(
    '/:testId',
    requireAuth,
    authorizeRoles(
        'lab_admin',
        'lab_receptionist',
        'lab_technologist',
        'result_verifier',
        'requesting_clinician'
    ),
    getTestByIdController
);

module.exports = router;
