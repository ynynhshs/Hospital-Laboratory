
const Patient = require('./patient.model');

// =========================================
// 1. CREATE PATIENT
// =========================================

async function createPatient(patientData) {

    if (
        !patientData ||
        typeof patientData !== 'object' ||
        Array.isArray(patientData)
    ) {
        throw new Error('Patient information is required.');
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
        throw new Error('All required patient fields must be provided.');
    }

    const normalizedPatientCode = String(patientCode)
        .trim()
        .toUpperCase();

    const existingPatient = await Patient.findOne({
        patientCode: normalizedPatientCode
    });

    if (existingPatient) {
        throw new Error('Patient code is already registered.');
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
            throw new Error('Patient code is already registered.');
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
        throw new Error('A valid patient code is required.');
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
        throw new Error('A valid patient ID is required.');
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
        throw new Error('A search term is required.');
    }

    if (
        !options ||
        typeof options !== 'object' ||
        Array.isArray(options)
    ) {
        throw new Error('Invalid search options.');
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
        throw new Error('Invalid pagination settings.');
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
