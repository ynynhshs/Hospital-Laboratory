const express = require('express');
const {
    getPatientByCodeController,
    getPatientByIdController,
    searchPatientsController
} = require('./patient.controller');

const {
    requireAuth,
    authorizeRoles
} = require('../../middleware/auth.middleware');

const router = express.Router();

// =========================================
// 1. SEARCH AND LIST PATIENTS (Read-Only)
// =========================================

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
    searchPatientsController
);

// =========================================
// 2. GET PATIENT BY PATIENT CODE (Read-Only)
// =========================================

router.get(
    '/code/:patientCode',
    requireAuth,
    authorizeRoles(
        'lab_admin',
        'lab_receptionist',
        'lab_technologist',
        'result_verifier',
        'requesting_clinician'
    ),
    getPatientByCodeController
);

// =========================================
// 3. GET PATIENT BY MONGODB ID (Read-Only)
// =========================================

router.get(
    '/:patientId',
    requireAuth,
    authorizeRoles(
        'lab_admin',
        'lab_receptionist',
        'lab_technologist',
        'result_verifier',
        'requesting_clinician'
    ),
    getPatientByIdController
);

module.exports = router;