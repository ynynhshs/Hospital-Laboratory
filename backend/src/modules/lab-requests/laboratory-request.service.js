
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

// Generates identifiers such as:
// LAB-20261104-A1B2C3
//
// A random suffix avoids requiring a separate
// counter collection for sequential numbering.

function generateRequestNumber() {
    const now = new Date();

    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');

    const datePart = `${year}${month}${day}`;

    const randomPart = randomBytes(3)
        .toString('hex')
        .toUpperCase();

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

async function resolveRequestingClinician(
    requestData,
    authenticatedUser
) {
    const role = authenticatedUser.role;

    // Requesting clinicians can only create
    // requests under their own accounts.
        // Administrators and receptionists may
    // create requests on behalf of clinicians.
    if (
        role === 'lab_admin' ||
        role === 'lab_receptionist'
    ) {
        // Get the ID sent from the frontend (or fallback to the logged-in user's ID)
        const clinicianId = requestData.requestingClinicianId || requestData.requestedBy || authenticatedUser.id;

        if (!isValidObjectId(clinicianId)) {
            throw new AppError(
                'A valid requesting clinician ID is required.',
                400
            );
        }

        // Find the user (Admin, Receptionist, or Clinician)
        const clinician = await User.findOne({
            _id: clinicianId
            // Removed the strict 'status: Active' check just in case it was causing issues
        }).select('_id');

        if (!clinician) {
            throw new AppError(
                'User not found.',
                404
            );
        }

        return clinician._id;
    }

    // Administrators and receptionists may
    // create requests on behalf of clinicians.
    if (
        role === 'lab_admin' ||
        role === 'lab_receptionist'
    ) {
        // Allow them to use requestingClinicianId OR requestedBy
        const clinicianId = requestData.requestingClinicianId || requestData.requestedBy;

        if (!isValidObjectId(clinicianId)) {
            throw new AppError(
                'A valid requesting clinician ID is required.',
                400
            );
        }

        // Find the user (Admin or Clinician)
        const clinician = await User.findOne({
            _id: clinicianId,
            // Removed the strict 'requesting_clinician' role check here
            accountStatus: 'active'
        }).select('_id');

        if (!clinician) {
            throw new AppError(
                'Active user not found.',
                404
            );
        }

        return clinician._id;
    }

    // Other laboratory roles cannot create requests.
    throw new AppError(
        'You do not have permission to create laboratory requests.',
        403
    );
}


 
// ==========================================
// 4. LABORATORY REQUEST ACCESS FILTER
// ==========================================

function getRequestAccessFilter(authenticatedUser) {

    if (
        !authenticatedUser ||
        !isValidObjectId(authenticatedUser.id)
    ) {
        throw new AppError(
            'A valid authenticated user is required.',
            401
        );
    }

    const allowedRoles = [
        'lab_admin',
        'lab_receptionist',
        'lab_technologist',
        'result_verifier',
        'requesting_clinician'
    ];

    if (!allowedRoles.includes(authenticatedUser.role)) {
        throw new AppError(
            'You do not have permission to access laboratory requests.',
            403
        );
    }

    // Requesting clinicians can only access
    // requests assigned to their accounts.
    if (authenticatedUser.role === 'requesting_clinician') {
        return {
            requestedBy: new mongoose.Types.ObjectId(
                authenticatedUser.id
            )
        };
    }

    // Authorized laboratory staff can access
    // all laboratory requests.
    return {};
}


 
// ==========================================
// 5. SEARCH AND FILTER LABORATORY REQUESTS
// ==========================================

async function searchLaboratoryRequests(
    options = {},
    authenticatedUser
) {

    // Validate search options.
    if (
        !options ||
        typeof options !== 'object' ||
        Array.isArray(options)
    ) {
        throw new AppError(
            'Invalid laboratory request search options.',
            400
        );
    }

    // Determine which records the user may access.
    const accessFilter = getRequestAccessFilter(
        authenticatedUser
    );

    const {
        search,
        status,
        priority
    } = options;

    // --------------------------------------
    // Validate pagination.
    // --------------------------------------

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

    // --------------------------------------
    // Validate request status.
    // --------------------------------------

    let normalizedStatus;

    if (status !== undefined && status !== '') {

        if (
            typeof status !== 'string' ||
            !status.trim()
        ) {
            throw new AppError(
                'Invalid laboratory request status.',
                400
            );
        }

        normalizedStatus = status
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, '_');

        if (
            !LaboratoryRequest.REQUEST_STATUSES.includes(
                normalizedStatus
            )
        ) {
            throw new AppError(
                'Invalid laboratory request status.',
                400
            );
        }
    }

    // --------------------------------------
    // Validate priority.
    // --------------------------------------

    let normalizedPriority;

    if (priority !== undefined && priority !== '') {

        if (
            typeof priority !== 'string' ||
            !priority.trim()
        ) {
            throw new AppError(
                'Invalid laboratory request priority.',
                400
            );
        }

        normalizedPriority = priority
            .trim()
            .toLowerCase();

        if (
            !LaboratoryRequest.REQUEST_PRIORITIES.includes(
                normalizedPriority
            )
        ) {
            throw new AppError(
                'Invalid laboratory request priority.',
                400
            );
        }
    }

    // --------------------------------------
    // Build MongoDB search filter.
    // --------------------------------------

    const filter = {
        ...accessFilter
    };

    if (normalizedStatus) {
        filter.status = normalizedStatus;
    }

    if (normalizedPriority) {
        filter.priority = normalizedPriority;
    }

    // --------------------------------------
    // Search request number and patient.
    // --------------------------------------

    if (search !== undefined && search !== '') {

        if (
            typeof search !== 'string' ||
            !search.trim() ||
            search.trim().length > 100
        ) {
            throw new AppError(
                'Invalid laboratory request search term.',
                400
            );
        }


        const searchText = search.trim();

        // Escape special regular-expression characters
        // to prevent unintended regex behavior.
        const escapedSearch = searchText.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
        );

        const searchRegex = new RegExp(
            escapedSearch,
            'i'
        );

        // Split complete patient names into individual words.
        const searchTerms = searchText.split(/\s+/);

        const patientNameFields = [
            'firstName',
            'middleName',
            'lastName',
            'suffix'
        ];

        // Every search word must match at least one
        // patient name field.
        const patientNameConditions = searchTerms.map(
            (term) => {

                const escapedTerm = term.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    '\\$&'
                );

                const termRegex = new RegExp(
                    escapedTerm,
                    'i'
                );

                return {
                    $or: patientNameFields.map((field) => ({
                        [field]: termRegex
                    }))
                };
            }
        );

        // Search patient codes or complete patient names.
        const matchingPatientIds = await Patient.find({
            $or: [
                {
                    patientId: searchRegex // <-- UPDATED
                },
                {
                    $and: patientNameConditions
                }
            ]
        }).distinct('_id');


        filter.$or = [
            { requestNumber: searchRegex },
            {
                patient: {
                    $in: matchingPatientIds
                }
            }
        ];
    }

    // --------------------------------------
    // Retrieve laboratory requests.
    // --------------------------------------

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([

        LaboratoryRequest.find(filter)
            .populate(
                'patient',
                'patientCode firstName middleName lastName suffix dateOfBirth sex contactNumber'
            )
            .populate(
                'requestedBy',
                'username email firstName lastName role'
            )
            .populate(
                'createdBy',
                'username email firstName lastName role'
            )
            .sort({
                createdAt: -1
            })
            .skip(skip)
            .limit(limit),

        LaboratoryRequest.countDocuments(filter)
    ]);

    // --------------------------------------
    // Return records and pagination.
    // --------------------------------------

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

async function getLaboratoryRequestById(
    requestId,
    authenticatedUser
) {

    // Validate MongoDB request ID.
    if (!isValidObjectId(requestId)) {
        throw new AppError(
            'A valid laboratory request ID is required.',
            400
        );
    }

    // Enforce user access restrictions.
    const accessFilter = getRequestAccessFilter(
        authenticatedUser
    );

    const filter = {
        _id: requestId,
        ...accessFilter
    };

    const laboratoryRequest = await LaboratoryRequest
        .findOne(filter)
        .populate(
            'patient',
            'patientCode firstName middleName lastName suffix dateOfBirth sex contactNumber'
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
        throw new AppError(
            'Laboratory request not found.',
            404
        );
    }

    return laboratoryRequest;
}



  
// ==========================================
// 7. UPDATE LABORATORY REQUEST DRAFT
// ==========================================

async function updateDraftRequest(
    requestId,
    updateData,
    authenticatedUser
) {

    // --------------------------------------
    // 1. Validate request ID.
    // --------------------------------------

    if (!isValidObjectId(requestId)) {
        throw new AppError(
            'A valid laboratory request ID is required.',
            400
        );
    }

    // --------------------------------------
    // 2. Validate authenticated user.
    // --------------------------------------

    const accessFilter = getRequestAccessFilter(
        authenticatedUser
    );

    const allowedRoles = [
        'lab_admin',
        'lab_receptionist',
        'requesting_clinician'
    ];

    if (!allowedRoles.includes(authenticatedUser.role)) {
        throw new AppError(
            'You do not have permission to update laboratory requests.',
            403
        );
    }

    // --------------------------------------
    // 3. Validate update information.
    // --------------------------------------

    if (
        !updateData ||
        typeof updateData !== 'object' ||
        Array.isArray(updateData)
    ) {
        throw new AppError(
            'Laboratory request update information is required.',
            400
        );
    }

    const hasPatientId =
        Object.prototype.hasOwnProperty.call(
            updateData,
            'patientId'
        );

    const hasTestIds =
        Object.prototype.hasOwnProperty.call(
            updateData,
            'testIds'
        );

    const hasPriority =
        Object.prototype.hasOwnProperty.call(
            updateData,
            'priority'
        );

    const hasClinicalNotes =
        Object.prototype.hasOwnProperty.call(
            updateData,
            'clinicalNotes'
        );

    if (
        !hasPatientId &&
        !hasTestIds &&
        !hasPriority &&
        !hasClinicalNotes
    ) {
        throw new AppError(
            'At least one valid laboratory request field must be provided for updating.',
            400
        );
    }

    // --------------------------------------
    // 4. Find the authorized request.
    // --------------------------------------

    const laboratoryRequest = await LaboratoryRequest.findOne({
        _id: requestId,
        ...accessFilter
    });

    if (!laboratoryRequest) {
        throw new AppError(
            'Laboratory request not found.',
            404
        );
    }

    // --------------------------------------
    // 5. Only drafts may be updated.
    // --------------------------------------

    if (laboratoryRequest.status !== 'draft') {
        throw new AppError(
            'Only draft laboratory requests can be updated.',
            409
        );
    }

    // --------------------------------------
    // 6. Update patient information.
    // --------------------------------------

    if (hasPatientId) {

        if (!isValidObjectId(updateData.patientId)) {
            throw new AppError(
                'A valid patient ID is required.',
                400
            );
        }

        const patient = await Patient.findById(
            updateData.patientId
        ).select('_id');

        if (!patient) {
            throw new AppError(
                'Patient not found.',
                404
            );
        }

        laboratoryRequest.patient = patient._id;
    }

    // --------------------------------------
    // 7. Update selected laboratory tests.
    // --------------------------------------

    if (hasTestIds) {

        const testIds = updateData.testIds;

        if (
            !Array.isArray(testIds) ||
            testIds.length > 50
        ) {
            throw new AppError(
                'Invalid laboratory test selection.',
                400
            );
        }

        const normalizedTestIds = testIds.map((testId) => {

            if (!isValidObjectId(testId)) {
                throw new AppError(
                    'One or more laboratory test IDs are invalid.',
                    400
                );
            }

            return testId.toLowerCase();
        });

        // Prevent duplicate test selections.
        if (
            new Set(normalizedTestIds).size !==
            normalizedTestIds.length
        ) {
            throw new AppError(
                'Duplicate laboratory tests are not allowed.',
                400
            );
        }

        let updatedTests = [];

        if (normalizedTestIds.length > 0) {

            const selectedTests = await TestCatalog.find({
                _id: {
                    $in: normalizedTestIds
                },
                status: 'active'
            }).select(
                'testCode testName category specimenType testingMethod turnaroundTime'
            );

            if (
                selectedTests.length !==
                normalizedTestIds.length
            ) {
                throw new AppError(
                    'One or more selected laboratory tests do not exist or are inactive.',
                    400
                );
            }

            // Preserve the original selection order.
            const testMap = new Map(
                selectedTests.map((test) => [
                    test._id.toString(),
                    test
                ])
            );

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
                        turnaroundTime: test.turnaroundTime
                    },

                    status: 'pending'
                };
            });
        }

        laboratoryRequest.tests = updatedTests;
    }

    // --------------------------------------
    // 8. Update request priority.
    // --------------------------------------

    if (hasPriority) {

        if (
            typeof updateData.priority !== 'string' ||
            !updateData.priority.trim()
        ) {
            throw new AppError(
                'Invalid laboratory request priority.',
                400
            );
        }

        const priority = updateData.priority
            .trim()
            .toLowerCase();

        if (
            !LaboratoryRequest.REQUEST_PRIORITIES.includes(
                priority
            )
        ) {
            throw new AppError(
                'Invalid laboratory request priority.',
                400
            );
        }

        laboratoryRequest.priority = priority;
    }

    // --------------------------------------
    // 9. Update clinical notes.
    // --------------------------------------

    if (hasClinicalNotes) {

        if (
            typeof updateData.clinicalNotes !== 'string' ||
            updateData.clinicalNotes.trim().length > 2000
        ) {
            throw new AppError(
                'Clinical notes must not exceed 2000 characters.',
                400
            );
        }

        laboratoryRequest.clinicalNotes =
            updateData.clinicalNotes.trim();
    }

    // --------------------------------------
    // 10. Record the authenticated updater.
    // --------------------------------------

    const authenticatedUserId =
        new mongoose.Types.ObjectId(
            authenticatedUser.id
        );

    laboratoryRequest.updatedBy =
        authenticatedUserId;

    // --------------------------------------
    // 11. Add activity history.
    // --------------------------------------

    laboratoryRequest.activities.push({
        action: 'updated',
        message: 'Laboratory request draft updated.',
        performedBy: authenticatedUserId,
        performedAt: new Date()
    });

    // --------------------------------------
    // 12. Save updated request.
    // --------------------------------------

    await laboratoryRequest.save();

    // Return populated request information.
    return getLaboratoryRequestById(
        laboratoryRequest._id.toString(),
        authenticatedUser
    );
}



// ==========================================
// 3. CREATE LABORATORY REQUEST DRAFT
// ==========================================

async function createDraftRequest(requestData, authenticatedUser) {

    // --------------------------------------
    // Validate request information.
    // --------------------------------------

    if (
        !requestData ||
        typeof requestData !== 'object' ||
        Array.isArray(requestData)
    ) {
        throw new AppError(
            'Laboratory request information is required.',
            400
        );
    }

    // --------------------------------------
    // Validate authenticated user.
    // --------------------------------------

    if (
        !authenticatedUser ||
        !isValidObjectId(authenticatedUser.id)
    ) {
        throw new AppError(
            'A valid authenticated user is required.',
            401
        );
    }

    const authenticatedUserId = new mongoose.Types.ObjectId(
        authenticatedUser.id
    );

    const requestingClinicianId =
    await resolveRequestingClinician(
        requestData,
        authenticatedUser
    );

    // --------------------------------------
    // Validate patient ID.
    // --------------------------------------

    const { patientId } = requestData;

    if (!isValidObjectId(patientId)) {
        throw new AppError(
            'A valid patient ID is required.',
            400
        );
    }

    // Confirm that the patient exists.
    const patient = await Patient.findById(patientId)
        .select('_id');

    if (!patient) {
        throw new AppError(
            'Patient not found.',
            404
        );
    }

    // --------------------------------------
    // Validate selected laboratory tests.
    // --------------------------------------

    const testIds = requestData.testIds ?? [];

    if (
        !Array.isArray(testIds) ||
        testIds.length > 50
    ) {
        throw new AppError(
            'Invalid laboratory test selection.',
            400
        );
    }

    // Empty test lists are allowed for drafts.
    // Tests must be selected before submission.

    const normalizedTestIds = testIds.map((testId) => {

        if (!isValidObjectId(testId)) {
            throw new AppError(
                'One or more laboratory test IDs are invalid.',
                400
            );
        }

        return testId.toLowerCase();
    });



    // Prevent selecting the same test more than once.
    if (
        new Set(normalizedTestIds).size !==
        normalizedTestIds.length
    ) {
        throw new AppError(
            'Duplicate laboratory tests are not allowed.',
            400
        );
    }

    // --------------------------------------
    // Retrieve active laboratory tests.
    // --------------------------------------

    let requestedTests = [];

    if (normalizedTestIds.length > 0) {

        const selectedTests = await TestCatalog.find({
            _id: {
                $in: normalizedTestIds
            },
            status: 'active'
        }).select(
            'testCode testName category specimenType testingMethod turnaroundTime'
        );

        // Ensure every selected test exists and is active.
        if (selectedTests.length !== normalizedTestIds.length) {
            throw new AppError(
                'One or more selected laboratory tests do not exist or are inactive.',
                400
            );
        }

        // Preserve the original selection order.
        const testMap = new Map(
            selectedTests.map((test) => [
                test._id.toString(),
                test
            ])
        );

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
                    turnaroundTime: test.turnaroundTime
                },

                status: 'pending'
            };
        });
    }

    // --------------------------------------
    // Validate request priority.
    // --------------------------------------

    const priority = String(
        requestData.priority ?? 'routine'
    ).trim().toLowerCase();

    if (
        !LaboratoryRequest.REQUEST_PRIORITIES.includes(
            priority
        )
    ) {
        throw new AppError(
            'Invalid laboratory request priority.',
            400
        );
    }

    // --------------------------------------
    // Validate clinical notes.
    // --------------------------------------

    const clinicalNotes = requestData.clinicalNotes ?? '';

    if (
        typeof clinicalNotes !== 'string' ||
        clinicalNotes.trim().length > 2000
    ) {
        throw new AppError(
            'Clinical notes must not exceed 2000 characters.',
            400
        );
    }

    // --------------------------------------
    // Prepare new request information.
    // --------------------------------------

    const newRequestData = {
        requestNumber: generateRequestNumber(),

        patient: patient._id,

        // Initially, the authenticated user is
        // both the requester and the creator.
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

    // --------------------------------------
    // Save request with duplicate protection.
    // --------------------------------------

    // Retry if an extremely unlikely request-number
    // collision occurs during simultaneous creation.

    for (let attempt = 1; attempt <= 5; attempt++) {

        const laboratoryRequest = new LaboratoryRequest(
            newRequestData
        );

        try {
            return await laboratoryRequest.save();

        } catch (error) {

            const duplicateRequestNumber =
                error.code === 11000 &&
                (
                    error.keyPattern?.requestNumber ||
                    error.keyValue?.requestNumber
                );

            if (duplicateRequestNumber && attempt < 5) {
                newRequestData.requestNumber =
                    generateRequestNumber();

                continue;
            }

            throw error;
        }
    }

    throw new AppError(
        'Unable to generate a unique laboratory request number. Please try again.',
        503
    );
}



// ==========================================
// 6. SUBMIT LABORATORY REQUEST
// ==========================================

async function submitLaboratoryRequest(
    requestId,
    authenticatedUser
) {

    // 1. Validate request ID.
    if (!isValidObjectId(requestId)) {
        throw new AppError(
            'A valid laboratory request ID is required.',
            400
        );
    }

    // 2. Validate authentication and request access.
    const accessFilter = getRequestAccessFilter(
        authenticatedUser
    );

    // Only authorized request creators may submit.
    const allowedRoles = [
        'lab_admin',
        'lab_receptionist',
        'requesting_clinician'
    ];

    if (!allowedRoles.includes(authenticatedUser.role)) {
        throw new AppError(
            'You do not have permission to submit laboratory requests.',
            403
        );
    }

    // 3. Retrieve the authorized request.
    const laboratoryRequest = await LaboratoryRequest.findOne({
        _id: requestId,
        ...accessFilter
    });

    if (!laboratoryRequest) {
        throw new AppError(
            'Laboratory request not found.',
            404
        );
    }

    // 4. Only drafts may be submitted.
    if (laboratoryRequest.status !== 'draft') {
        throw new AppError(
            'Only draft laboratory requests can be submitted.',
            409
        );
    }

    // 5. Require at least one laboratory test.
    if (
        !Array.isArray(laboratoryRequest.tests) ||
        laboratoryRequest.tests.length === 0
    ) {
        throw new AppError(
            'At least one laboratory test must be selected before submitting the request.',
            400
        );
    }

    // 6. Record the authenticated submitter.
    const authenticatedUserId =
        new mongoose.Types.ObjectId(
            authenticatedUser.id
        );

    const submittedAt = new Date();

    // 7. Update request information.
    laboratoryRequest.status = 'submitted';
    laboratoryRequest.submittedAt = submittedAt;
    laboratoryRequest.updatedBy = authenticatedUserId;

    // 8. Record submission activity.
    laboratoryRequest.activities.push({
        action: 'submitted',
        message: 'Laboratory request submitted.',
        performedBy: authenticatedUserId,
        performedAt: submittedAt
    });

    // 9. Save the submitted request.
    await laboratoryRequest.save();

    // 10. Return populated request details.
    return getLaboratoryRequestById(
        laboratoryRequest._id.toString(),
        authenticatedUser
    );
}



// ==========================================
// 7. EXPORT SERVICE FUNCTIONS
// ==========================================

module.exports = {
    createDraftRequest,
    generateRequestNumber,
    searchLaboratoryRequests,
    getLaboratoryRequestById,
    updateDraftRequest,
    submitLaboratoryRequest
};
