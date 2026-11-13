const express = require('express');

const {
    registerPatient,
    getPatientByCodeController,
    getPatientByIdController,
    searchPatientsController,
    updatePatientController // <-- ADDED THIS IMPORT
} = require('./patient.controller');

const {
    requireAuth,
    authorizeRoles
} = require('../../middleware/auth.middleware');

const router = express.Router();

// =========================================
// 1. PATIENT REGISTRATION
// =========================================

router.post(
    '/',
    requireAuth,
    authorizeRoles('lab_admin', 'lab_receptionist'),
    registerPatient
);

// =========================================
// 2. SEARCH AND LIST PATIENTS
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

// =========================================
// 5. UPDATE PATIENT (Added this route)
// =========================================

router.patch(
    '/:patientId',
    requireAuth,
    authorizeRoles('lab_admin', 'lab_receptionist'),
    updatePatientController
);

module.exports = router;