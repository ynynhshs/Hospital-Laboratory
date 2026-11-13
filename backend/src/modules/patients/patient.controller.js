
const {
    createPatient,
    getPatientByCode,
    getPatientById,
    searchPatients,
    updatePatient
} = require('./patient.service');

// =========================================
// 1. REGISTER PATIENT
// =========================================

async function registerPatient(req, res, next) {
    try {
        const patient = await createPatient(req.body);

        return res.status(201).json({
            success: true,
            message: 'Patient registered successfully.',
            data: {
                patient
            }
        });

    } catch (error) {
        return next(error);
    }
}

// =========================================
// 2. GET PATIENT BY CODE
// =========================================

async function getPatientByCodeController(req, res, next) {
    try {
        const patient = await getPatientByCode(
            req.params.patientCode
        );

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Patient retrieved successfully.',
            data: {
                patient
            }
        });

    } catch (error) {
        return next(error);
    }
}

// =========================================
// 3. GET PATIENT BY MONGODB ID
// =========================================

async function getPatientByIdController(req, res, next) {
    try {
        const patient = await getPatientById(
            req.params.patientId
        );

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Patient retrieved successfully.',
            data: {
                patient
            }
        });

    } catch (error) {
        return next(error);
    }
}

// =========================================
// 4. SEARCH PATIENTS
// =========================================

async function searchPatientsController(req, res, next) {
    try {
        const {
            search,
            page,
            limit
        } = req.query;

        const result = await searchPatients(search, {
            page,
            limit
        });

        return res.status(200).json({
            success: true,
            message: 'Patient records retrieved successfully.',
            data: result
        });

    } catch (error) {
        return next(error);
    }
}

// 6. UPDATE PATIENT
async function updatePatientController(req, res, next) {
    try {
        const patient = await updatePatient(req.params.patientId, req.body);
        return res.status(200).json({
            success: true,
            message: 'Patient updated successfully.',
            data: { patient }
        });
    } catch (error) {
        return next(error);
    }
}

// =========================================
// 5. EXPORT CONTROLLER FUNCTIONS
// =========================================

module.exports = {
    registerPatient,
    getPatientByCodeController,
    getPatientByIdController,
    searchPatientsController,
    updatePatientController
};
