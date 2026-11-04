
const express = require('express');

const {
    createDraftRequestController,
    getLaboratoryRequestsController,
    getLaboratoryRequestByIdController,
    updateDraftRequestController
} = require('./laboratory-request.controller');

const {
    requireAuth,
    authorizeRoles
} = require('../../middleware/auth.middleware');

const router = express.Router();

// ==========================================
// MEDILINK LABORATORY
// LABORATORY REQUEST ROUTES
// ==========================================

// ==========================================
// 1. GET AND SEARCH LABORATORY REQUESTS
// ==========================================

// All authorized laboratory roles may view requests.
// Requesting clinicians are restricted to their own
// requests by the service access filter.

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
    getLaboratoryRequestsController
);

// ==========================================
// 2. GET LABORATORY REQUEST BY ID
// ==========================================

router.get(
    '/:requestId',
    requireAuth,
    authorizeRoles(
        'lab_admin',
        'lab_receptionist',
        'lab_technologist',
        'result_verifier',
        'requesting_clinician'
    ),
    getLaboratoryRequestByIdController
);

// ==========================================
// 3. CREATE LABORATORY REQUEST DRAFT
// ==========================================

router.post(
    '/',
    requireAuth,
    authorizeRoles(
        'lab_admin',
        'lab_receptionist',
        'requesting_clinician'
    ),
    createDraftRequestController
);

// ==========================================
// 4. UPDATE LABORATORY REQUEST DRAFT
// ==========================================

router.patch(
    '/:requestId',
    requireAuth,
    authorizeRoles(
        'lab_admin',
        'lab_receptionist',
        'requesting_clinician'
    ),
    updateDraftRequestController
);

module.exports = router;
