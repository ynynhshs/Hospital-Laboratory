
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Patient = require('../src/modules/patients/patient.model');
const LabUser = require('../src/modules/users/lab-user.model');
const TestCatalog = require('../src/modules/test-catalog/test-catalog.model');
const LaboratoryRequest = require('../src/modules/lab-requests/laboratory-request.model');

const {
    createDraftRequest: createDraftRequestService,
    generateRequestNumber,
    searchLaboratoryRequests,
    getLaboratoryRequestById
} = require('../src/modules/lab-requests/laboratory-request.service');

let mongoServer;
let patient;
let activeTest;
let inactiveTest;
let authenticatedUser;
let receptionistUser;
let clinicianUser;

// ==========================================
// REQUEST CREATION TEST HELPER
// ==========================================

// Supply a valid default requesting clinician
// for administrator and receptionist test cases.

function createDraftRequest(requestData, user = authenticatedUser) {

    if (
        !requestData ||
        typeof requestData !== 'object' ||
        Array.isArray(requestData)
    ) {
        return createDraftRequestService(requestData, user);
    }

    const normalizedData = {
        ...requestData
    };

    if (
        user &&
        ['lab_admin', 'lab_receptionist'].includes(user.role) &&
        !Object.prototype.hasOwnProperty.call(
            normalizedData,
            'requestingClinicianId'
        )
    ) {
        normalizedData.requestingClinicianId =
            clinicianUser._id.toString();
    }

    return createDraftRequestService(
        normalizedData,
        user
    );
}

// ==========================================
// TEST UTILITIES
// ==========================================

async function expectAppError(operation, expectedStatusCode) {
    await assert.rejects(
        operation,
        (error) => {
            assert.equal(error.statusCode, expectedStatusCode);
            assert.equal(error.isOperational, true);
            return true;
        }
    );
}

// ==========================================
// TEST DATABASE SETUP
// ==========================================

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(mongoServer.getUri(), {
        dbName: 'medilink_laboratory_request_test'
    });

    await Promise.all([
    Patient.init(),
    TestCatalog.init(),
    LabUser.init(),
    LaboratoryRequest.init()
]);
});

// Prepare fresh test records before each test.
beforeEach(async () => {

    await Promise.all([
    LaboratoryRequest.deleteMany({}),
    Patient.deleteMany({}),
    TestCatalog.deleteMany({}),
    LabUser.deleteMany({})
]);

    receptionistUser = await LabUser.create({
    username: 'receptionist_test',
    email: 'receptionist_test@example.com',
    passwordHash: 'test-password-hash',
    firstName: 'Maria',
    lastName: 'Receptionist',
    role: 'lab_receptionist',
    accountStatus: 'active'
});

clinicianUser = await LabUser.create({
    username: 'clinician_test',
    email: 'clinician_test@example.com',
    passwordHash: 'test-password-hash',
    firstName: 'Juan',
    lastName: 'Clinician',
    role: 'requesting_clinician',
    accountStatus: 'active'
});

authenticatedUser = {
    id: receptionistUser._id.toString(),
    role: receptionistUser.role
};

    patient = await Patient.create({
        patientCode: 'PAT-000001',
        firstName: 'Juan',
        middleName: 'Santos',
        lastName: 'Dela Cruz',
        dateOfBirth: new Date('1995-06-15'),
        sex: 'male',
        contactNumber: '09171234567'
    });

    activeTest = await TestCatalog.create({
        testCode: 'HEM-CBC-001',
        testName: 'Complete Blood Count',
        category: 'Hematology',
        specimenType: 'Whole Blood',
        testingMethod: 'Automated Hematology Analyzer',
        turnaroundTime: '1 day',
        status: 'active'
    });

    inactiveTest = await TestCatalog.create({
        testCode: 'HEM-OLD-001',
        testName: 'Inactive Hematology Test',
        category: 'Hematology',
        specimenType: 'Whole Blood',
        testingMethod: 'Manual Method',
        turnaroundTime: '2 days',
        status: 'inactive'
    });
});

// ==========================================
// RETRIEVAL TEST HELPER
// ==========================================

async function createRetrievalRequest({
    requestedClinician = clinicianUser,
    priority = 'routine',
    status = 'draft',
    testIds = [activeTest._id.toString()]
} = {}) {

    const request = await createDraftRequest(
        {
            patientId: patient._id.toString(),
            testIds,
            priority,
            requestingClinicianId: requestedClinician._id.toString()
        },
        authenticatedUser
    );

    // Change status when a retrieval test requires
    // a request in a different workflow status.
    if (status !== 'draft') {
        request.status = status;
        await request.save();
    }

    return request;
}



// Disconnect and stop the temporary database.
after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

// ==========================================
// 1. REQUEST NUMBER GENERATION
// ==========================================

test('generates a valid laboratory request number', () => {
    const requestNumber = generateRequestNumber();

    assert.match(
        requestNumber,
        /^LAB-\d{8}-[A-F0-9]{6}$/
    );
});

// ==========================================
// 2. CREATE LABORATORY REQUEST DRAFT
// ==========================================

test('creates a laboratory request draft successfully', async () => {

    const request = await createDraftRequest(
        {
            patientId: patient._id.toString(),
            testIds: [activeTest._id.toString()],
            priority: 'routine',
            clinicalNotes: 'Patient requires laboratory examination.'
        },
        authenticatedUser
    );

    assert.ok(request._id);

    assert.match(
        request.requestNumber,
        /^LAB-\d{8}-[A-F0-9]{6}$/
    );

    assert.equal(
        request.patient.toString(),
        patient._id.toString()
    );

    assert.equal(
    request.requestedBy.toString(),
    clinicianUser._id.toString()
);

    assert.equal(
        request.createdBy.toString(),
        authenticatedUser.id
    );

    assert.equal(request.status, 'draft');
    assert.equal(request.priority, 'routine');

    assert.equal(request.tests.length, 1);

    assert.equal(
        request.tests[0].test.toString(),
        activeTest._id.toString()
    );

    assert.equal(
        request.tests[0].testSnapshot.testCode,
        'HEM-CBC-001'
    );

    assert.equal(
        request.tests[0].testSnapshot.testName,
        'Complete Blood Count'
    );

    assert.equal(request.tests[0].status, 'pending');

    assert.equal(request.activities.length, 1);

    assert.equal(
        request.activities[0].action,
        'created'
    );

    const savedRequest = await LaboratoryRequest.findById(
        request._id
    );

    assert.ok(savedRequest);
});

// ==========================================
// 3. CREATE DRAFT WITHOUT SELECTED TESTS
// ==========================================

test('allows creation of a draft without selected laboratory tests', async () => {

    const request = await createDraftRequest(
        {
            patientId: patient._id.toString(),
            testIds: []
        },
        authenticatedUser
    );

    assert.ok(request._id);
    assert.equal(request.status, 'draft');
    assert.equal(request.tests.length, 0);
});

// ==========================================
// 4. REQUIRE REQUEST INFORMATION
// ==========================================

test('rejects request creation when request information is missing', async () => {

    await expectAppError(
        createDraftRequest(null, authenticatedUser),
        400
    );

    await expectAppError(
        createDraftRequest(undefined, authenticatedUser),
        400
    );

    await expectAppError(
        createDraftRequest([], authenticatedUser),
        400
    );
});

// ==========================================
// 5. VALIDATE AUTHENTICATED USER
// ==========================================

test('rejects request creation without a valid authenticated user', async () => {

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString()
            },
            null
        ),
        401
    );

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString()
            },
            { id: 'invalid-id' }
        ),
        401
    );
});

// ==========================================
// 6. VALIDATE PATIENT ID
// ==========================================

test('rejects an invalid patient ID', async () => {

    await expectAppError(
        createDraftRequest(
            {
                patientId: 'invalid-id'
            },
            authenticatedUser
        ),
        400
    );
});

// ==========================================
// 7. VERIFY PATIENT EXISTS
// ==========================================

test('rejects a request when the patient does not exist', async () => {

    const unknownPatientId = new mongoose.Types.ObjectId().toString();

    await expectAppError(
        createDraftRequest(
            {
                patientId: unknownPatientId
            },
            authenticatedUser
        ),
        404
    );

    assert.equal(
        await LaboratoryRequest.countDocuments({}),
        0
    );
});

// ==========================================
// 8. VALIDATE SELECTED TEST IDS
// ==========================================

test('rejects an invalid laboratory test ID', async () => {

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString(),
                testIds: ['invalid-id']
            },
            authenticatedUser
        ),
        400
    );
});

// ==========================================
// 9. PREVENT DUPLICATE TEST SELECTIONS
// ==========================================

test('rejects duplicate laboratory test selections', async () => {

    const testId = activeTest._id.toString();

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString(),
                testIds: [testId, testId]
            },
            authenticatedUser
        ),
        400
    );

    assert.equal(
        await LaboratoryRequest.countDocuments({}),
        0
    );
});

// ==========================================
// 10. VALIDATE TEST SELECTION FORMAT
// ==========================================

test('rejects a laboratory test selection that is not an array', async () => {

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString(),
                testIds: 'not-an-array'
            },
            authenticatedUser
        ),
        400
    );
});

// ==========================================
// 11. REJECT INACTIVE LABORATORY TESTS
// ==========================================

test('rejects an inactive laboratory test', async () => {

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString(),
                testIds: [inactiveTest._id.toString()]
            },
            authenticatedUser
        ),
        400
    );

    assert.equal(
        await LaboratoryRequest.countDocuments({}),
        0
    );
});

// ==========================================
// 12. REJECT NONEXISTENT LABORATORY TESTS
// ==========================================

test('rejects a laboratory test that does not exist', async () => {

    const unknownTestId = new mongoose.Types.ObjectId().toString();

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString(),
                testIds: [unknownTestId]
            },
            authenticatedUser
        ),
        400
    );
});

// ==========================================
// 13. VALIDATE REQUEST PRIORITY
// ==========================================

test('rejects an unsupported laboratory request priority', async () => {

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString(),
                priority: 'normal'
            },
            authenticatedUser
        ),
        400
    );
});

// ==========================================
// 14. VALIDATE CLINICAL NOTES
// ==========================================

test('rejects clinical notes exceeding 2000 characters', async () => {

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString(),
                clinicalNotes: 'A'.repeat(2001)
            },
            authenticatedUser
        ),
        400
    );

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString(),
                clinicalNotes: 12345
            },
            authenticatedUser
        ),
        400
    );
});

// ==========================================
// 15. PROTECT SERVER-CONTROLLED INFORMATION
// ==========================================

test('does not trust client-supplied request ownership, status, or request number', async () => {

    const anotherUserId = new mongoose.Types.ObjectId().toString();

    const request = await createDraftRequest(
        {
            patientId: patient._id.toString(),
            testIds: [activeTest._id.toString()],
            priority: 'urgent',
            status: 'completed',
            requestNumber: 'CLIENT-SUPPLIED-001',
            requestedBy: anotherUserId,
            createdBy: anotherUserId
        },
        authenticatedUser
    );

    assert.equal(request.status, 'draft');

    assert.notEqual(
        request.requestNumber,
        'CLIENT-SUPPLIED-001'
    );

    assert.equal(
    request.requestedBy.toString(),
    clinicianUser._id.toString()
);

    assert.equal(
        request.createdBy.toString(),
        authenticatedUser.id
    );
});

// ==========================================
// 16. PRESERVE TEST SELECTION ORDER
// ==========================================

test('preserves the original order of selected laboratory tests', async () => {

    const secondTest = await TestCatalog.create({
        testCode: 'CHEM-GLU-001',
        testName: 'Glucose',
        category: 'Clinical Chemistry',
        specimenType: 'Serum',
        testingMethod: 'Enzymatic Method',
        turnaroundTime: '1 day',
        status: 'active'
    });

    const request = await createDraftRequest(
        {
            patientId: patient._id.toString(),
            testIds: [
                secondTest._id.toString(),
                activeTest._id.toString()
            ]
        },
        authenticatedUser
    );

    assert.equal(request.tests.length, 2);

    assert.equal(
        request.tests[0].testSnapshot.testCode,
        'CHEM-GLU-001'
    );

    assert.equal(
        request.tests[1].testSnapshot.testCode,
        'HEM-CBC-001'
    );
});

// ==========================================
// 17. PRESERVE HISTORICAL TEST SNAPSHOTS
// ==========================================

test('preserves the selected test information after catalog updates', async () => {

    const request = await createDraftRequest(
        {
            patientId: patient._id.toString(),
            testIds: [activeTest._id.toString()]
        },
        authenticatedUser
    );

    await TestCatalog.findByIdAndUpdate(
        activeTest._id,
        {
            testName: 'Updated Complete Blood Count'
        }
    );

    const savedRequest = await LaboratoryRequest.findById(
        request._id
    );

    assert.equal(
        savedRequest.tests[0].testSnapshot.testName,
        'Complete Blood Count'
    );

    const updatedCatalogTest = await TestCatalog.findById(
        activeTest._id
    );

    assert.equal(
        updatedCatalogTest.testName,
        'Updated Complete Blood Count'
    );
});

// ==========================================
// 18. LIMIT SELECTED LABORATORY TESTS
// ==========================================

test('rejects more than 50 selected laboratory tests', async () => {

    const testIds = Array.from(
        { length: 51 },
        () => new mongoose.Types.ObjectId().toString()
    );

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString(),
                testIds
            },
            authenticatedUser
        ),
        400
    );
});


 
// ==========================================
// 19. RECEPTIONIST REQUEST CREATION
// ==========================================

test('allows a receptionist to create a request for an active clinician', async () => {

    const request = await createDraftRequest(
        {
            patientId: patient._id.toString()
        },
        authenticatedUser
    );

    assert.equal(
        request.createdBy.toString(),
        receptionistUser._id.toString()
    );

    assert.equal(
        request.requestedBy.toString(),
        clinicianUser._id.toString()
    );
});

// ==========================================
// 20. ADMINISTRATOR REQUEST CREATION
// ==========================================

test('allows an administrator to create a request for an active clinician', async () => {

    const admin = await LabUser.create({
        username: 'admin_test',
        email: 'admin_test@example.com',
        passwordHash: 'test-password-hash',
        firstName: 'Admin',
        lastName: 'User',
        role: 'lab_admin',
        accountStatus: 'active'
    });

    const adminAuth = {
        id: admin._id.toString(),
        role: 'lab_admin'
    };

    const request = await createDraftRequest(
        {
            patientId: patient._id.toString()
        },
        adminAuth
    );

    assert.equal(
        request.createdBy.toString(),
        admin._id.toString()
    );

    assert.equal(
        request.requestedBy.toString(),
        clinicianUser._id.toString()
    );
});

// ==========================================
// 21. CLINICIAN SELF REQUEST
// ==========================================

test('allows a requesting clinician to create their own request', async () => {

    const clinicianAuth = {
        id: clinicianUser._id.toString(),
        role: 'requesting_clinician'
    };

    const request = await createDraftRequest(
        {
            patientId: patient._id.toString()
        },
        clinicianAuth
    );

    assert.equal(
        request.createdBy.toString(),
        clinicianUser._id.toString()
    );

    assert.equal(
        request.requestedBy.toString(),
        clinicianUser._id.toString()
    );
});

// ==========================================
// 22. PREVENT CLINICIAN IMPERSONATION
// ==========================================

test('prevents a requesting clinician from creating a request for another clinician', async () => {

    const anotherClinician = await LabUser.create({
        username: 'another_clinician',
        email: 'another_clinician@example.com',
        passwordHash: 'test-password-hash',
        firstName: 'Another',
        lastName: 'Clinician',
        role: 'requesting_clinician',
        accountStatus: 'active'
    });

    const clinicianAuth = {
        id: clinicianUser._id.toString(),
        role: 'requesting_clinician'
    };

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString(),
                requestingClinicianId: anotherClinician._id.toString()
            },
            clinicianAuth
        ),
        403
    );
});

// ==========================================
// 23. REQUIRE REQUESTING CLINICIAN
// ==========================================

test('requires a requesting clinician ID for receptionist-created requests', async () => {

    await expectAppError(
        createDraftRequestService(
            {
                patientId: patient._id.toString()
            },
            authenticatedUser
        ),
        400
    );
});

// ==========================================
// 24. REJECT INACTIVE REQUESTING CLINICIAN
// ==========================================

test('rejects an inactive requesting clinician', async () => {

    const inactiveClinician = await LabUser.create({
        username: 'inactive_clinician',
        email: 'inactive_clinician@example.com',
        passwordHash: 'test-password-hash',
        firstName: 'Inactive',
        lastName: 'Clinician',
        role: 'requesting_clinician',
        accountStatus: 'inactive'
    });

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString(),
                requestingClinicianId: inactiveClinician._id.toString()
            },
            authenticatedUser
        ),
        404
    );
});

// ==========================================
// 25. REJECT NONEXISTENT REQUESTING CLINICIAN
// ==========================================

test('rejects a nonexistent requesting clinician', async () => {

    const unknownClinicianId =
        new mongoose.Types.ObjectId().toString();

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString(),
                requestingClinicianId: unknownClinicianId
            },
            authenticatedUser
        ),
        404
    );
});

// ==========================================
// 26. RESTRICT OTHER LABORATORY ROLES
// ==========================================

test('prevents laboratory technologists from creating requests', async () => {

    const technologistAuth = {
        id: authenticatedUser.id,
        role: 'lab_technologist'
    };

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString()
            },
            technologistAuth
        ),
        403
    );
});

test('prevents result verifiers from creating requests', async () => {

    const verifierAuth = {
        id: authenticatedUser.id,
        role: 'result_verifier'
    };

    await expectAppError(
        createDraftRequest(
            {
                patientId: patient._id.toString()
            },
            verifierAuth
        ),
        403
    );
});


// ==========================================
// 27. SEARCH LABORATORY REQUESTS
// ==========================================

test('searches laboratory requests by request number', async () => {

    const request = await createRetrievalRequest();

    const result = await searchLaboratoryRequests(
        {
            search: request.requestNumber
        },
        authenticatedUser
    );

    assert.equal(result.requests.length, 1);
    assert.equal(
        result.requests[0].requestNumber,
        request.requestNumber
    );
    assert.equal(result.pagination.total, 1);
});

test('searches laboratory requests by patient code', async () => {

    await createRetrievalRequest();

    const result = await searchLaboratoryRequests(
        {
            search: 'PAT-000001'
        },
        authenticatedUser
    );

    assert.equal(result.requests.length, 1);
    assert.equal(
        result.requests[0].patient.patientCode,
        'PAT-000001'
    );
});

test('searches laboratory requests by a partial patient name', async () => {

    await createRetrievalRequest();

    const result = await searchLaboratoryRequests(
        {
            search: 'Dela Cruz'
        },
        authenticatedUser
    );

    assert.equal(result.requests.length, 1);
    assert.equal(
        result.requests[0].patient.lastName,
        'Dela Cruz'
    );
});

test('searches laboratory requests using the complete patient name', async () => {

    await createRetrievalRequest();

    const result = await searchLaboratoryRequests(
        {
            search: 'Juan Santos Dela Cruz'
        },
        authenticatedUser
    );

    assert.equal(result.requests.length, 1);
    assert.equal(
        result.requests[0].patient.firstName,
        'Juan'
    );
});

// ==========================================
// 28. FILTER LABORATORY REQUESTS
// ==========================================

test('filters laboratory requests by status', async () => {

    await createRetrievalRequest({
        status: 'draft'
    });

    await createRetrievalRequest({
        status: 'submitted',
        priority: 'urgent'
    });

    const result = await searchLaboratoryRequests(
        {
            status: 'submitted'
        },
        authenticatedUser
    );

    assert.equal(result.pagination.total, 1);
    assert.equal(result.requests.length, 1);
    assert.equal(result.requests[0].status, 'submitted');
});

test('filters laboratory requests by priority', async () => {

    await createRetrievalRequest({
        priority: 'routine'
    });

    await createRetrievalRequest({
        priority: 'urgent'
    });

    await createRetrievalRequest({
        priority: 'stat'
    });

    const result = await searchLaboratoryRequests(
        {
            priority: 'urgent'
        },
        authenticatedUser
    );

    assert.equal(result.pagination.total, 1);
    assert.equal(result.requests[0].priority, 'urgent');
});

test('combines search, status, and priority filters', async () => {

    const matchingRequest = await createRetrievalRequest({
        priority: 'urgent',
        status: 'submitted'
    });

    await createRetrievalRequest({
        priority: 'routine',
        status: 'submitted'
    });

    await createRetrievalRequest({
        priority: 'urgent',
        status: 'draft'
    });

    const result = await searchLaboratoryRequests(
        {
            search: matchingRequest.requestNumber,
            status: 'submitted',
            priority: 'urgent'
        },
        authenticatedUser
    );

    assert.equal(result.pagination.total, 1);
    assert.equal(
        result.requests[0].requestNumber,
        matchingRequest.requestNumber
    );
});

// ==========================================
// 29. REQUEST PAGINATION
// ==========================================

test('paginates laboratory request results correctly', async () => {

    await createRetrievalRequest();
    await createRetrievalRequest();
    await createRetrievalRequest();

    const firstPage = await searchLaboratoryRequests(
        {
            page: 1,
            limit: 2
        },
        authenticatedUser
    );

    const secondPage = await searchLaboratoryRequests(
        {
            page: 2,
            limit: 2
        },
        authenticatedUser
    );

    assert.equal(firstPage.requests.length, 2);
    assert.equal(secondPage.requests.length, 1);

    assert.equal(firstPage.pagination.total, 3);
    assert.equal(firstPage.pagination.page, 1);
    assert.equal(firstPage.pagination.limit, 2);
    assert.equal(firstPage.pagination.totalPages, 2);

    assert.equal(secondPage.pagination.page, 2);
    assert.equal(secondPage.pagination.totalPages, 2);

    const firstPageIds = firstPage.requests.map(
        (request) => request._id.toString()
    );

    const secondPageIds = secondPage.requests.map(
        (request) => request._id.toString()
    );

    assert.equal(
        firstPageIds.some((id) => secondPageIds.includes(id)),
        false
    );
});

// ==========================================
// 30. VALIDATE RETRIEVAL OPTIONS
// ==========================================

test('rejects invalid pagination settings', async () => {

    await expectAppError(
        searchLaboratoryRequests(
            { page: 0 },
            authenticatedUser
        ),
        400
    );

    await expectAppError(
        searchLaboratoryRequests(
            { page: 1.5 },
            authenticatedUser
        ),
        400
    );

    await expectAppError(
        searchLaboratoryRequests(
            { limit: 101 },
            authenticatedUser
        ),
        400
    );
});

test('rejects invalid request status and priority filters', async () => {

    await expectAppError(
        searchLaboratoryRequests(
            { status: 'unknown_status' },
            authenticatedUser
        ),
        400
    );

    await expectAppError(
        searchLaboratoryRequests(
            { priority: 'normal' },
            authenticatedUser
        ),
        400
    );
});

test('rejects invalid laboratory request search terms', async () => {

    await expectAppError(
        searchLaboratoryRequests(
            { search: 12345 },
            authenticatedUser
        ),
        400
    );

    await expectAppError(
        searchLaboratoryRequests(
            { search: '   ' },
            authenticatedUser
        ),
        400
    );

    await expectAppError(
        searchLaboratoryRequests(
            { search: 'A'.repeat(101) },
            authenticatedUser
        ),
        400
    );

    await expectAppError(
        searchLaboratoryRequests(
            { search: [] },
            authenticatedUser
        ),
        400
    );
});

test('rejects invalid laboratory request search options', async () => {

    await expectAppError(
        searchLaboratoryRequests(
            null,
            authenticatedUser
        ),
        400
    );

    await expectAppError(
        searchLaboratoryRequests(
            [],
            authenticatedUser
        ),
        400
    );
});



 
// ==========================================
// 31. REQUESTING CLINICIAN ACCESS RESTRICTIONS
// ==========================================

test('restricts requesting clinicians to their own laboratory requests', async () => {

    const anotherClinician = await LabUser.create({
        username: 'another_clinician_retrieval',
        email: 'another_clinician_retrieval@example.com',
        passwordHash: 'test-password-hash',
        firstName: 'Pedro',
        lastName: 'Santos',
        role: 'requesting_clinician',
        accountStatus: 'active'
    });

    const ownRequest = await createRetrievalRequest();

    await createRetrievalRequest({
        requestedClinician: anotherClinician
    });

    const clinicianAuth = {
        id: clinicianUser._id.toString(),
        role: 'requesting_clinician'
    };

    const result = await searchLaboratoryRequests(
        {},
        clinicianAuth
    );

    assert.equal(result.pagination.total, 1);
    assert.equal(result.requests.length, 1);

    assert.equal(
        result.requests[0]._id.toString(),
        ownRequest._id.toString()
    );

    assert.equal(
        result.requests[0].requestedBy._id.toString(),
        clinicianUser._id.toString()
    );
});

test('rejects a requesting clinician accessing another clinician request', async () => {

    const anotherClinician = await LabUser.create({
        username: 'another_clinician_access',
        email: 'another_clinician_access@example.com',
        passwordHash: 'test-password-hash',
        firstName: 'Pedro',
        lastName: 'Santos',
        role: 'requesting_clinician',
        accountStatus: 'active'
    });

    const anotherRequest = await createRetrievalRequest({
        requestedClinician: anotherClinician
    });

    const clinicianAuth = {
        id: clinicianUser._id.toString(),
        role: 'requesting_clinician'
    };

    await expectAppError(
        getLaboratoryRequestById(
            anotherRequest._id.toString(),
            clinicianAuth
        ),
        404
    );
});

// ==========================================
// 32. LABORATORY STAFF ACCESS
// ==========================================

test('allows authorized laboratory staff roles to search all requests', async () => {

    await createRetrievalRequest();

    await createRetrievalRequest({
        priority: 'urgent'
    });

    const staffRoles = [
        'lab_admin',
        'lab_receptionist',
        'lab_technologist',
        'result_verifier'
    ];

    for (const role of staffRoles) {

        const staffUser = await LabUser.create({
            username: `${role}_retrieval_test`,
            email: `${role}_retrieval_test@example.com`,
            passwordHash: 'test-password-hash',
            firstName: 'Laboratory',
            lastName: 'Staff',
            role,
            accountStatus: 'active'
        });

        const staffAuth = {
            id: staffUser._id.toString(),
            role
        };

        const result = await searchLaboratoryRequests(
            {},
            staffAuth
        );

        assert.equal(
            result.pagination.total,
            2,
            `${role} should access both laboratory requests.`
        );
    }
});

// ==========================================
// 33. GET LABORATORY REQUEST BY ID
// ==========================================

test('retrieves an existing laboratory request by ID', async () => {

    const request = await createRetrievalRequest();

    const result = await getLaboratoryRequestById(
        request._id.toString(),
        authenticatedUser
    );

    assert.ok(result);

    assert.equal(
        result._id.toString(),
        request._id.toString()
    );

    assert.equal(
        result.requestNumber,
        request.requestNumber
    );

    assert.equal(result.status, 'draft');
});

test('rejects an invalid laboratory request ID', async () => {

    await expectAppError(
        getLaboratoryRequestById(
            'invalid-request-id',
            authenticatedUser
        ),
        400
    );
});

test('rejects a request ID that does not exist', async () => {

    const nonexistentRequestId =
        new mongoose.Types.ObjectId().toString();

    await expectAppError(
        getLaboratoryRequestById(
            nonexistentRequestId,
            authenticatedUser
        ),
        404
    );
});

// ==========================================
// 34. POPULATED LABORATORY REQUEST DETAILS
// ==========================================

test('populates patient, clinician, creator, updater, and activity details', async () => {

    const request = await createRetrievalRequest();

    // Set an updater so we can test its population.
    request.updatedBy = receptionistUser._id;
    await request.save();

    const result = await getLaboratoryRequestById(
        request._id.toString(),
        authenticatedUser
    );

    // Patient information.
    assert.ok(result.patient);

    assert.equal(
        result.patient.patientCode,
        'PAT-000001'
    );

    assert.equal(
        result.patient.firstName,
        'Juan'
    );

    // Requesting clinician information.
    assert.ok(result.requestedBy);

    assert.equal(
        result.requestedBy.username,
        'clinician_test'
    );

    assert.equal(
        result.requestedBy.role,
        'requesting_clinician'
    );

    // Request creator information.
    assert.ok(result.createdBy);

    assert.equal(
        result.createdBy.username,
        'receptionist_test'
    );

    assert.equal(
        result.createdBy.role,
        'lab_receptionist'
    );

    // Last updater information.
    assert.ok(result.updatedBy);

    assert.equal(
        result.updatedBy.username,
        'receptionist_test'
    );

    // Activity history information.
    assert.equal(result.activities.length, 1);

    assert.equal(
        result.activities[0].action,
        'created'
    );

    assert.ok(result.activities[0].performedBy);

    assert.equal(
        result.activities[0].performedBy.username,
        'receptionist_test'
    );

    assert.equal(
        result.activities[0].performedBy.role,
        'lab_receptionist'
    );
});

// ==========================================
// 35. VALIDATE RETRIEVAL AUTHORIZATION
// ==========================================

test('rejects laboratory request searches without authentication', async () => {

    await expectAppError(
        searchLaboratoryRequests({}, null),
        401
    );
});

test('rejects individual request retrieval without authentication', async () => {

    const request = await createRetrievalRequest();

    await expectAppError(
        getLaboratoryRequestById(
            request._id.toString(),
            null
        ),
        401
    );
});

test('rejects laboratory request searches from unsupported roles', async () => {

    await expectAppError(
        searchLaboratoryRequests(
            {},
            {
                id: receptionistUser._id.toString(),
                role: 'unsupported_role'
            }
        ),
        403
    );
});



