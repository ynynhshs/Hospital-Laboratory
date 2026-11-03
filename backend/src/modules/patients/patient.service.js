const Patient = require('./patient.model');
const AppError = require('../../shared/utils/app-error');

// =========================================
// 1. CREATE PATIENT
// =========================================

async function createPatient(patientData) {

    if (
        !patientData ||
        typeof patientData !== 'object' ||
        Array.isArray(patientData)
    ) {
        throw new AppError(
            'Patient information is required.',
            400
        );
    }

    const {
        patientCode,
        firstName,
        middleName,
        lastName,
        suffix,
        dateOfBirth,
        sex,
        contactNumber
    } = patientData;

    if (
        !patientCode ||
        !String(patientCode).trim() ||
        !firstName ||
        !String(firstName).trim() ||
        !lastName ||
        !String(lastName).trim() ||
        !dateOfBirth ||
        !sex
    ) {
        throw new AppError(
            'All required patient fields must be provided.',
            400
        );
    }

    const normalizedPatientCode = String(patientCode)
        .trim()
        .toUpperCase();

    const existingPatient = await Patient.findOne({
        patientCode: normalizedPatientCode
    });

    if (existingPatient) {
        throw new AppError(
            'Patient code is already registered.',
            409
        );
    }

    const newPatient = new Patient({
        patientCode: normalizedPatientCode,
        firstName,
        middleName,
        lastName,
        suffix,
        dateOfBirth,
        sex,
        contactNumber
    });

    try {
        return await newPatient.save();

    } catch (error) {

        if (
            error.code === 11000 &&
            error.keyPattern?.patientCode
        ) {
            throw new AppError(
                'Patient code is already registered.',
                409
            );
        }

        throw error;
    }
}

// =========================================
// 2. GET PATIENT BY PATIENT CODE
// =========================================

async function getPatientByCode(patientCode) {

    if (
        typeof patientCode !== 'string' ||
        !patientCode.trim()
    ) {
        throw new AppError(
            'A valid patient code is required.',
            400
        );
    }

    const normalizedPatientCode = patientCode
        .trim()
        .toUpperCase();

    return await Patient.findOne({
        patientCode: normalizedPatientCode
    });
}

// =========================================
// 3. GET PATIENT BY MONGODB ID
// =========================================

async function getPatientById(patientId) {

    if (
        typeof patientId !== 'string' ||
        !/^[0-9a-fA-F]{24}$/.test(patientId)
    ) {
        throw new AppError(
            'A valid patient ID is required.',
            400
        );
    }

    return await Patient.findById(patientId);
}

// =========================================
// 4. SEARCH PATIENTS
// =========================================

async function searchPatients(searchTerm, options = {}) {

    if (
        typeof searchTerm !== 'string' ||
        !searchTerm.trim()
    ) {
        throw new AppError(
            'A search term is required.',
            400
        );
    }

    if (
        !options ||
        typeof options !== 'object' ||
        Array.isArray(options)
    ) {
        throw new AppError(
            'Invalid search options.',
            400
        );
    }

    const page = Number(options.page ?? 1);
    const limit = Number(options.limit ?? 10);

    if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100
    ) {
        throw new AppError(
            'Invalid pagination settings.',
            400
        );
    }

    // Escape special regular-expression characters.
    const escapedSearchTerm = searchTerm
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const searchRegex = new RegExp(
        escapedSearchTerm,
        'i'
    );

    const filter = {
        $or: [
            { patientCode: searchRegex },
            { firstName: searchRegex },
            { middleName: searchRegex },
            { lastName: searchRegex },
            { contactNumber: searchRegex }
        ]
    };

    const skip = (page - 1) * limit;

    const [patients, total] = await Promise.all([
        Patient.find(filter)
            .sort({ lastName: 1, firstName: 1 })
            .skip(skip)
            .limit(limit),

        Patient.countDocuments(filter)
    ]);

    return {
        patients,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
}

// =========================================
// 5. EXPORT SERVICE FUNCTIONS
// =========================================

module.exports = {
    createPatient,
    getPatientByCode,
    getPatientById,
    searchPatients
};