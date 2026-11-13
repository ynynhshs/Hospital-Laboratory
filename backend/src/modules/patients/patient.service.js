const Patient = require('../core/patient.model');
const AppError = require('../../shared/utils/app-error');

// =========================================
// 1. CREATE PATIENT
// =========================================

// Helper function to generate the next Patient ID
async function generateNextPatientId() {
    // Find the most recent patient based on the patientId (e.g., PAT-999)
    const lastPatient = await Patient.findOne({ patientId: /^PAT-\d+$/ }).sort({ patientId: -1 });

    if (!lastPatient || !lastPatient.patientId) {
        return 'PAT-001'; // Start at 001 if no patients exist
    }

    // Extract the number from "PAT-001" -> 1
    const match = lastPatient.patientId.match(/PAT-(\d+)/);
    if (!match) {
        return 'PAT-001'; // Fallback
    }

    const nextNumber = parseInt(match[1], 10) + 1;
    // Pad with zeros to make it PAT-002, PAT-010, etc.
    return `PAT-${nextNumber.toString().padStart(3, '0')}`;
}

// CreatePatient function with auto-generated ID
async function createPatient(patientData) {
    // 1. Generate the new ID automatically
    const newPatientId = await generateNextPatientId();

    // 2. Attach the generated ID to the data
    const newPatient = new Patient({
        ...patientData,
        patientId: newPatientId
    });

    // 3. Save to database
    await newPatient.save();
    
    return newPatient;
}

// =========================================
// 2. GET PATIENT BY PATIENT ID
// =========================================

async function getPatientByCode(patientId) {
    if (
        typeof patientId !== 'string' ||
        !patientId.trim()
    ) {
        throw new AppError(
            'A valid patient ID is required.',
            400
        );
    }

    const normalizedPatientId = patientId
        .trim()
        .toUpperCase();

    // Updated to search the new 'patientId' field instead of 'patientCode'
    return await Patient.findOne({
        patientId: normalizedPatientId
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

async function searchPatients(searchTerm = '', options = {}) {
    // Removed the strict validation that required a search term
    if (typeof searchTerm !== 'string') {
        throw new AppError('Invalid search term.', 400);
    }

    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new AppError('Invalid search options.', 400);
    }

    const page = Number(options.page ?? 1);
    const limit = Number(options.limit ?? 10);

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new AppError('Invalid pagination settings.', 400);
    }

    const filter = {};

    // Only apply the search regex if a search term was provided
    if (searchTerm.trim()) {
        const escapedSearchTerm = searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedSearchTerm, 'i');

        filter.$or = [
            { patientId: searchRegex },
            { firstName: searchRegex },
            { middleName: searchRegex },
            { lastName: searchRegex },
            { contactNo: searchRegex }
        ];
    }

    const skip = (page - 1) * limit;

    const [patients, total] = await Promise.all([
        Patient.find(filter)
            .sort({ createdAt: -1 }) // Sorts by newest first
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
            totalPages: Math.ceil(total / limit) || 1
        }
    };
}

// =========================================
// 5. EXPORT SERVICE FUNCTIONS
// =========================================

// =========================================
// 6. UPDATE PATIENT
// =========================================

async function updatePatient(patientId, updateData) {
    if (typeof patientId !== 'string' || !patientId) {
        throw new AppError('A valid patient ID is required.', 400);
    }

    // Ensure patientId cannot be changed
    delete updateData.patientId;

    const updatedPatient = await Patient.findByIdAndUpdate(
        patientId,
        { $set: updateData },
        { new: true, runValidators: true }
    );

    if (!updatedPatient) {
        throw new AppError('Patient not found.', 404);
    }

    return updatedPatient;
}


module.exports = {
    createPatient,
    getPatientByCode,
    getPatientById,
    searchPatients,
    updatePatient 
};