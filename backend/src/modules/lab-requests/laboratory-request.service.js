const mongoose = require('mongoose');
const { randomBytes } = require('node:crypto');

const LaboratoryRequest = require('./laboratory-request.model');
const Patient = require('../core/patient.model');
const TestCatalog = require('../test-catalog/test-catalog.model');
const User = require('../core/user.model');

const AppError = require('../../shared/utils/app-error');

// ==========================================
// MEDILINK LABORATORY
// LABORATORY REQUEST SERVICE
// ==========================================

// ==========================================
// 1. REQUEST NUMBER GENERATION
// ==========================================

function generateRequestNumber() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const datePart = `${year}${month}${day}`;
    const randomPart = randomBytes(3).toString('hex').toUpperCase();
    return `LAB-${datePart}-${randomPart}`;
}

// ==========================================
// 2. OBJECT ID VALIDATION
// ==========================================

function isValidObjectId(value) {
    return (
        typeof value === 'string' &&
        /^[0-9a-fA-F]{24}$/.test(value)
    );
}

// ==========================================
// 3. RESOLVE REQUESTING CLINICIAN
// ==========================================

async function resolveRequestingClinician(requestData, authenticatedUser) {
    const role = authenticatedUser.role;

    if (role === 'lab_admin' || role === 'lab_receptionist') {
        const clinicianId = requestData.requestingClinicianId || requestData.requestedBy || authenticatedUser.id;

        if (!isValidObjectId(clinicianId)) {
            throw new AppError('A valid requesting clinician ID is required.', 400);
        }

        const clinician = await User.findOne({
            _id: clinicianId
        }).select('_id');

        if (!clinician) {
            throw new AppError('User not found.', 404);
        }

        return clinician._id;
    }

    if (role === 'requesting_clinician') {
        if (requestData.requestingClinicianId && requestData.requestingClinicianId !== authenticatedUser.id) {
            throw new AppError('Requesting clinicians can only create requests under their own accounts.', 403);
        }

        const clinician = await User.findOne({
            _id: authenticatedUser.id,
            role: 'requesting_clinician',
            status: 'Active'
        }).select('_id');

        if (!clinician) {
            throw new AppError('Active requesting clinician account not found.', 403);
        }

        return clinician._id;
    }

    throw new AppError('You do not have permission to create laboratory requests.', 403);
}

// ==========================================
// 4. LABORATORY REQUEST ACCESS FILTER
// ==========================================

function getRequestAccessFilter(authenticatedUser) {
    if (!authenticatedUser || !isValidObjectId(authenticatedUser.id)) {
        throw new AppError('A valid authenticated user is required.', 401);
    }

    const allowedRoles = [
        'lab_admin',
        'lab_receptionist',
        'lab_technologist',
        'result_verifier',
        'requesting_clinician'
    ];

    if (!allowedRoles.includes(authenticatedUser.role)) {
        throw new AppError('You do not have permission to access laboratory requests.', 403);
    }

    if (authenticatedUser.role === 'requesting_clinician') {
        return {
            requestedBy: new mongoose.Types.ObjectId(authenticatedUser.id)
        };
    }

    return {};
}

// ==========================================
// 5. SEARCH AND FILTER LABORATORY REQUESTS
// ==========================================

async function searchLaboratoryRequests(options = {}, authenticatedUser) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new AppError('Invalid laboratory request search options.', 400);
    }

    const accessFilter = getRequestAccessFilter(authenticatedUser);
    const { search, status, priority } = options;

    const page = Number(options.page ?? 1);
    const limit = Number(options.limit ?? 10);

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new AppError('Invalid pagination settings.', 400);
    }

    let normalizedStatus;
    if (status !== undefined && status !== '') {
        if (typeof status !== 'string' || !status.trim()) {
            throw new AppError('Invalid laboratory request status.', 400);
        }
        normalizedStatus = status.trim().toLowerCase().replace(/[\s-]+/g, '_');
        if (!LaboratoryRequest.REQUEST_STATUSES.includes(normalizedStatus)) {
            throw new AppError('Invalid laboratory request status.', 400);
        }
    }

    let normalizedPriority;
    if (priority !== undefined && priority !== '') {
        if (typeof priority !== 'string' || !priority.trim()) {
            throw new AppError('Invalid laboratory request priority.', 400);
        }
        normalizedPriority = priority.trim().toLowerCase();
        if (!LaboratoryRequest.REQUEST_PRIORITIES.includes(normalizedPriority)) {
            throw new AppError('Invalid laboratory request priority.', 400);
        }
    }

    const filter = { ...accessFilter };
    if (normalizedStatus) filter.status = normalizedStatus;
    if (normalizedPriority) filter.priority = normalizedPriority;

    if (search !== undefined && search !== '') {
        if (typeof search !== 'string' || !search.trim() || search.trim().length > 100) {
            throw new AppError('Invalid laboratory request search term.', 400);
        }

        const searchText = search.trim();
        const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedSearch, 'i');
        const searchTerms = searchText.split(/\s+/);
        const patientNameFields = ['firstName', 'middleName', 'lastName', 'suffix'];

        const patientNameConditions = searchTerms.map((term) => {
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const termRegex = new RegExp(escapedTerm, 'i');
            return {
                $or: patientNameFields.map((field) => ({ [field]: termRegex }))
            };
        });

        const matchingPatientIds = await Patient.find({
            $or: [
                { patientId: searchRegex },
                { $and: patientNameConditions }
            ]
        }).distinct('_id');

        filter.$or = [
            { requestNumber: searchRegex },
            { patient: { $in: matchingPatientIds } }
        ];
    }

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
        LaboratoryRequest.find(filter)
            .populate(
                'patient',
                'patientId firstName middleName lastName suffix birthDate sex contactNo'
            )
            .populate(
                'requestedBy',
                'username email firstName lastName role'
            )
            .populate(
                'createdBy',
                'username email firstName lastName role'
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        LaboratoryRequest.countDocuments(filter)
    ]);

    return {
        requests,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
}

// ==========================================
// 6. GET LABORATORY REQUEST BY ID
// ==========================================

async function getLaboratoryRequestById(requestId, authenticatedUser) {
    if (!isValidObjectId(requestId)) {
        throw new AppError('A valid laboratory request ID is required.', 400);
    }

    const accessFilter = getRequestAccessFilter(authenticatedUser);
    const filter = { _id: requestId, ...accessFilter };

    const laboratoryRequest = await LaboratoryRequest
        .findOne(filter)
        .populate(
            'patient',
            'patientId firstName middleName lastName suffix birthDate sex contactNo'
        )
        .populate(
            'requestedBy',
            'username email firstName lastName role'
        )
        .populate(
            'createdBy',
            'username email firstName lastName role'
        )
        .populate(
            'updatedBy',
            'username email firstName lastName role'
        )
        .populate({
            path: 'activities.performedBy',
            select: 'username firstName lastName role'
        });

    if (!laboratoryRequest) {
        throw new AppError('Laboratory request not found.', 404);
    }

    return laboratoryRequest;
}

// ==========================================
// 7. UPDATE LABORATORY REQUEST DRAFT
// ==========================================

async function updateDraftRequest(requestId, updateData, authenticatedUser) {
    if (!isValidObjectId(requestId)) {
        throw new AppError('A valid laboratory request ID is required.', 400);
    }

    const accessFilter = getRequestAccessFilter(authenticatedUser);
    const allowedRoles = ['lab_admin', 'lab_receptionist', 'requesting_clinician'];

    if (!allowedRoles.includes(authenticatedUser.role)) {
        throw new AppError('You do not have permission to update laboratory requests.', 403);
    }

    if (!updateData || typeof updateData !== 'object' || Array.isArray(updateData)) {
        throw new AppError('Laboratory request update information is required.', 400);
    }

    const hasPatientId = Object.prototype.hasOwnProperty.call(updateData, 'patientId');
    const hasTestIds = Object.prototype.hasOwnProperty.call(updateData, 'testIds');
    const hasPriority = Object.prototype.hasOwnProperty.call(updateData, 'priority');
    const hasClinicalNotes = Object.prototype.hasOwnProperty.call(updateData, 'clinicalNotes');

    if (!hasPatientId && !hasTestIds && !hasPriority && !hasClinicalNotes) {
        throw new AppError('At least one valid laboratory request field must be provided for updating.', 400);
    }

    const laboratoryRequest = await LaboratoryRequest.findOne({
        _id: requestId,
        ...accessFilter
    });

    if (!laboratoryRequest) {
        throw new AppError('Laboratory request not found.', 404);
    }

    if (laboratoryRequest.status !== 'draft') {
        throw new AppError('Only draft laboratory requests can be updated.', 409);
    }

    if (hasPatientId) {
        if (!isValidObjectId(updateData.patientId)) {
            throw new AppError('A valid patient ID is required.', 400);
        }
        const patient = await Patient.findById(updateData.patientId).select('_id');
        if (!patient) {
            throw new AppError('Patient not found.', 404);
        }
        laboratoryRequest.patient = patient._id;
    }

    if (hasTestIds) {
        const testIds = updateData.testIds;
        if (!Array.isArray(testIds) || testIds.length > 50) {
            throw new AppError('Invalid laboratory test selection.', 400);
        }

        const normalizedTestIds = testIds.map((testId) => {
            if (!isValidObjectId(testId)) {
                throw new AppError('One or more laboratory test IDs are invalid.', 400);
            }
            return testId.toLowerCase();
        });

        if (new Set(normalizedTestIds).size !== normalizedTestIds.length) {
            throw new AppError('Duplicate laboratory tests are not allowed.', 400);
        }

        let updatedTests = [];

        if (normalizedTestIds.length > 0) {
            const selectedTests = await TestCatalog.find({
                _id: { $in: normalizedTestIds },
                status: 'active'
            }).select('testCode testName category specimenType testingMethod turnaroundTime unit referenceRange');

            if (selectedTests.length !== normalizedTestIds.length) {
                throw new AppError('One or more selected laboratory tests do not exist or are inactive.', 400);
            }

            const testMap = new Map(selectedTests.map((test) => [test._id.toString(), test]));

            updatedTests = normalizedTestIds.map((testId) => {
                const test = testMap.get(testId);
                return {
                    test: test._id,
                    testSnapshot: {
                        testCode: test.testCode,
                        testName: test.testName,
                        category: test.category,
                        specimenType: test.specimenType,
                        testingMethod: test.testingMethod,
                        turnaroundTime: test.turnaroundTime,
                        unit: test.unit,
                        referenceRange: test.referenceRange
                    },
                    status: 'pending'
                };
            });
        }

        laboratoryRequest.tests = updatedTests;
    }

    if (hasPriority) {
        if (typeof updateData.priority !== 'string' || !updateData.priority.trim()) {
            throw new AppError('Invalid laboratory request priority.', 400);
        }
        const priority = updateData.priority.trim().toLowerCase();
        if (!LaboratoryRequest.REQUEST_PRIORITIES.includes(priority)) {
            throw new AppError('Invalid laboratory request priority.', 400);
        }
        laboratoryRequest.priority = priority;
    }

    if (hasClinicalNotes) {
        if (typeof updateData.clinicalNotes !== 'string' || updateData.clinicalNotes.trim().length > 2000) {
            throw new AppError('Clinical notes must not exceed 2000 characters.', 400);
        }
        laboratoryRequest.clinicalNotes = updateData.clinicalNotes.trim();
    }

    const authenticatedUserId = new mongoose.Types.ObjectId(authenticatedUser.id);
    laboratoryRequest.updatedBy = authenticatedUserId;

    laboratoryRequest.activities.push({
        action: 'updated',
        message: 'Laboratory request draft updated.',
        performedBy: authenticatedUserId,
        performedAt: new Date()
    });

    await laboratoryRequest.save();

    return getLaboratoryRequestById(laboratoryRequest._id.toString(), authenticatedUser);
}

// ==========================================
// 8. CREATE LABORATORY REQUEST DRAFT
// ==========================================

async function createDraftRequest(requestData, authenticatedUser) {
    if (!requestData || typeof requestData !== 'object' || Array.isArray(requestData)) {
        throw new AppError('Laboratory request information is required.', 400);
    }

    if (!authenticatedUser || !isValidObjectId(authenticatedUser.id)) {
        throw new AppError('A valid authenticated user is required.', 401);
    }

    const authenticatedUserId = new mongoose.Types.ObjectId(authenticatedUser.id);
    const requestingClinicianId = await resolveRequestingClinician(requestData, authenticatedUser);

    const { patientId } = requestData;
    if (!isValidObjectId(patientId)) {
        throw new AppError('A valid patient ID is required.', 400);
    }

    const patient = await Patient.findById(patientId).select('_id');
    if (!patient) {
        throw new AppError('Patient not found.', 404);
    }

    const testIds = requestData.testIds ?? [];
    if (!Array.isArray(testIds) || testIds.length > 50) {
        throw new AppError('Invalid laboratory test selection.', 400);
    }

    const normalizedTestIds = testIds.map((testId) => {
        if (!isValidObjectId(testId)) {
            throw new AppError('One or more laboratory test IDs are invalid.', 400);
        }
        return testId.toLowerCase();
    });

    if (new Set(normalizedTestIds).size !== normalizedTestIds.length) {
        throw new AppError('Duplicate laboratory tests are not allowed.', 400);
    }

    let requestedTests = [];

    if (normalizedTestIds.length > 0) {
        const selectedTests = await TestCatalog.find({
            _id: { $in: normalizedTestIds },
            status: 'active'
        }).select('testCode testName category specimenType testingMethod turnaroundTime unit referenceRange');

        if (selectedTests.length !== normalizedTestIds.length) {
            throw new AppError('One or more selected laboratory tests do not exist or are inactive.', 400);
        }

        const testMap = new Map(selectedTests.map((test) => [test._id.toString(), test]));

        requestedTests = normalizedTestIds.map((testId) => {
            const test = testMap.get(testId);
            return {
                test: test._id,
                testSnapshot: {
                    testCode: test.testCode,
                    testName: test.testName,
                    category: test.category,
                    specimenType: test.specimenType,
                    testingMethod: test.testingMethod,
                    turnaroundTime: test.turnaroundTime,
                    unit: test.unit,
                    referenceRange: test.referenceRange
                },
                status: 'pending'
            };
        });
    }

    const priority = String(requestData.priority ?? 'routine').trim().toLowerCase();
    if (!LaboratoryRequest.REQUEST_PRIORITIES.includes(priority)) {
        throw new AppError('Invalid laboratory request priority.', 400);
    }

    const clinicalNotes = requestData.clinicalNotes ?? '';
    if (typeof clinicalNotes !== 'string' || clinicalNotes.trim().length > 2000) {
        throw new AppError('Clinical notes must not exceed 2000 characters.', 400);
    }

    const newRequestData = {
        requestNumber: generateRequestNumber(),
        patient: patient._id,
        requestedBy: requestingClinicianId,
        createdBy: authenticatedUserId,
        priority,
        clinicalNotes: clinicalNotes.trim(),
        status: 'draft',
        tests: requestedTests,
        activities: [
            {
                action: 'created',
                message: 'Laboratory request draft created.',
                performedBy: authenticatedUserId,
                performedAt: new Date()
            }
        ]
    };

    for (let attempt = 1; attempt <= 5; attempt++) {
        const laboratoryRequest = new LaboratoryRequest(newRequestData);
        try {
            return await laboratoryRequest.save();
        } catch (error) {
            const duplicateRequestNumber =
                error.code === 11000 &&
                (error.keyPattern?.requestNumber || error.keyValue?.requestNumber);

            if (duplicateRequestNumber && attempt < 5) {
                newRequestData.requestNumber = generateRequestNumber();
                continue;
            }
            throw error;
        }
    }

    throw new AppError('Unable to generate a unique laboratory request number. Please try again.', 503);
}

// ==========================================
// 9. SUBMIT LABORATORY REQUEST
// ==========================================

async function submitLaboratoryRequest(requestId, authenticatedUser) {
    if (!isValidObjectId(requestId)) {
        throw new AppError('A valid laboratory request ID is required.', 400);
    }

    const accessFilter = getRequestAccessFilter(authenticatedUser);
    const allowedRoles = ['lab_admin', 'lab_receptionist', 'requesting_clinician'];

    if (!allowedRoles.includes(authenticatedUser.role)) {
        throw new AppError('You do not have permission to submit laboratory requests.', 403);
    }

    const laboratoryRequest = await LaboratoryRequest.findOne({
        _id: requestId,
        ...accessFilter
    });

    if (!laboratoryRequest) {
        throw new AppError('Laboratory request not found.', 404);
    }

    if (laboratoryRequest.status !== 'draft') {
        throw new AppError('Only draft laboratory requests can be submitted.', 409);
    }

    if (!Array.isArray(laboratoryRequest.tests) || laboratoryRequest.tests.length === 0) {
        throw new AppError('At least one laboratory test must be selected before submitting the request.', 400);
    }

    const authenticatedUserId = new mongoose.Types.ObjectId(authenticatedUser.id);
    const submittedAt = new Date();

    laboratoryRequest.status = 'submitted';
    laboratoryRequest.submittedAt = submittedAt;
    laboratoryRequest.updatedBy = authenticatedUserId;

    laboratoryRequest.activities.push({
        action: 'submitted',
        message: 'Laboratory request submitted.',
        performedBy: authenticatedUserId,
        performedAt: submittedAt
    });

    await laboratoryRequest.save();

    return getLaboratoryRequestById(laboratoryRequest._id.toString(), authenticatedUser);
}

// ==========================================
// 10. EXPORT SERVICE FUNCTIONS
// ==========================================

module.exports = {
    createDraftRequest,
    generateRequestNumber,
    searchLaboratoryRequests,
    getLaboratoryRequestById,
    updateDraftRequest,
    submitLaboratoryRequest
};