
const express = require('express');

const {
    registerPatient,
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
// 1. PATIENT REGISTRATION
// =========================================

// Only administrators and receptionists can register patients.
router.post(
    '/',
    requireAuth,
    authorizeRoles('lab_admin', 'lab_receptionist'),
    registerPatient
);

// =========================================
// 2. SEARCH AND LIST PATIENTS
// =========================================

// All authenticated laboratory roles can search patients.
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
// 3. GET PATIENT BY PATIENT CODE
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
// 4. GET PATIENT BY MONGODB ID
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
