
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const LaboratoryRequest = require('../src/modules/lab-requests/laboratory-request.model');

// ==========================================
// TEST DATA
// ==========================================

function createValidRequestData() {
    const userId = new mongoose.Types.ObjectId();

    return {
        requestNumber: 'LAB-2026-000001',

        patient: new mongoose.Types.ObjectId(),

        requestedBy: userId,

        createdBy: userId,

        priority: 'routine',

        clinicalNotes: 'Patient requires routine laboratory examination.',

        status: 'draft',

        tests: [
            {
                test: new mongoose.Types.ObjectId(),

                testSnapshot: {
                    testCode: 'HEM-CBC-001',
                    testName: 'Complete Blood Count',
                    category: 'Hematology',
                    specimenType: 'Whole Blood',
                    testingMethod: 'Automated Hematology Analyzer',
                    turnaroundTime: '1 day'
                },

                status: 'pending'
            }
        ],

        activities: [
            {
                action: 'created',
                message: 'Laboratory request created.',
                performedBy: userId
            }
        ]
    };
}

// ==========================================
// 1. VALID LABORATORY REQUEST
// ==========================================

test('accepts valid laboratory request data', async () => {
    const request = new LaboratoryRequest(
        createValidRequestData()
    );

    await assert.doesNotReject(request.validate());
});

// ==========================================
// 2. REQUIRED REQUEST INFORMATION
// ==========================================

test('rejects a request with missing required fields', async () => {
    const request = new LaboratoryRequest({});

    await assert.rejects(
        request.validate(),
        (error) => {
            assert.equal(error.name, 'ValidationError');

            assert.ok(error.errors.requestNumber);
            assert.ok(error.errors.patient);
            assert.ok(error.errors.requestedBy);
            assert.ok(error.errors.createdBy);

            return true;
        }
    );
});

// ==========================================
// 3. REQUEST NUMBER NORMALIZATION
// ==========================================

test('converts request number to uppercase and removes surrounding spaces', async () => {
    const request = new LaboratoryRequest({
        ...createValidRequestData(),
        requestNumber: '  lab-2026-000001  '
    });

    await request.validate();

    assert.equal(
        request.requestNumber,
        'LAB-2026-000001'
    );
});

// ==========================================
// 4. REQUEST STATUS VALIDATION
// ==========================================

test('rejects an unsupported request status', async () => {
    const request = new LaboratoryRequest({
        ...createValidRequestData(),
        status: 'invalid_status'
    });

    await assert.rejects(
        request.validate(),
        (error) => {
            assert.equal(error.name, 'ValidationError');
            assert.ok(error.errors.status);
            return true;
        }
    );
});

// ==========================================
// 5. REQUEST PRIORITY VALIDATION
// ==========================================

test('rejects an unsupported request priority', async () => {
    const request = new LaboratoryRequest({
        ...createValidRequestData(),
        priority: 'normal'
    });

    await assert.rejects(
        request.validate(),
        (error) => {
            assert.equal(error.name, 'ValidationError');
            assert.ok(error.errors.priority);
            return true;
        }
    );
});

// ==========================================
// 6. DEFAULT REQUEST VALUES
// ==========================================

test('sets default request status and priority', async () => {
    const requestData = createValidRequestData();

    // Remove these fields before creating the document.
    delete requestData.status;
    delete requestData.priority;

    const request = new LaboratoryRequest(requestData);

    await request.validate();

    assert.equal(request.status, 'draft');
    assert.equal(request.priority, 'routine');
});
// ==========================================
// 7. EMPTY TEST LIST
// ==========================================

test('allows an empty test list when creating a draft request', async () => {
    const requestData = createValidRequestData();

    requestData.tests = [];

    const request = new LaboratoryRequest(requestData);

    await assert.doesNotReject(request.validate());

    assert.equal(request.tests.length, 0);
});

// ==========================================
// 8. TEST SNAPSHOT CATEGORY VALIDATION
// ==========================================

test('rejects an unsupported laboratory test category', async () => {
    const requestData = createValidRequestData();

    requestData.tests[0].testSnapshot.category = 'Invalid Category';

    const request = new LaboratoryRequest(requestData);

    await assert.rejects(
        request.validate(),
        (error) => {
            assert.equal(error.name, 'ValidationError');

            assert.ok(
                error.errors['tests.0.testSnapshot.category']
            );

            return true;
        }
    );
});

// ==========================================
// 9. REQUIRED TEST SNAPSHOT INFORMATION
// ==========================================

test('rejects a requested test with missing snapshot information', async () => {
    const requestData = createValidRequestData();

    requestData.tests[0].testSnapshot.testName = '';

    const request = new LaboratoryRequest(requestData);

    await assert.rejects(
        request.validate(),
        (error) => {
            assert.equal(error.name, 'ValidationError');

            assert.ok(
                error.errors['tests.0.testSnapshot.testName']
            );

            return true;
        }
    );
});

// ==========================================
// 10. TEST ITEM STATUS VALIDATION
// ==========================================

test('rejects an unsupported individual test status', async () => {
    const requestData = createValidRequestData();

    requestData.tests[0].status = 'invalid_status';

    const request = new LaboratoryRequest(requestData);

    await assert.rejects(
        request.validate(),
        (error) => {
            assert.equal(error.name, 'ValidationError');

            assert.ok(
                error.errors['tests.0.status']
            );

            return true;
        }
    );
});

// ==========================================
// 11. DEFAULT TEST ITEM STATUS
// ==========================================

test('sets the default individual test status to pending', async () => {
    const requestData = createValidRequestData();

    requestData.tests[0].status = undefined;

    const request = new LaboratoryRequest(requestData);

    await request.validate();

    assert.equal(
        request.tests[0].status,
        'pending'
    );
});

// ==========================================
// 12. TEST CATALOG REFERENCE
// ==========================================

test('references the existing TestCatalog model', () => {
    const testPath = LaboratoryRequest.schema
        .path('tests')
        .schema.path('test');

    assert.equal(testPath.options.ref, 'TestCatalog');
});

// ==========================================
// 13. VALID REQUEST ACTIVITY
// ==========================================

test('accepts valid request activity information', async () => {
    const request = new LaboratoryRequest(
        createValidRequestData()
    );

    await assert.doesNotReject(request.validate());

    assert.equal(request.activities.length, 1);

    assert.equal(
        request.activities[0].action,
        'created'
    );
});

// ==========================================
// 14. ACTIVITY ACTION VALIDATION
// ==========================================

test('rejects an unsupported request activity action', async () => {
    const requestData = createValidRequestData();

    requestData.activities[0].action = 'invalid_action';

    const request = new LaboratoryRequest(requestData);

    await assert.rejects(
        request.validate(),
        (error) => {
            assert.equal(error.name, 'ValidationError');

            assert.ok(
                error.errors['activities.0.action']
            );

            return true;
        }
    );
});

// ==========================================
// 15. REQUIRED ACTIVITY INFORMATION
// ==========================================

test('rejects a request activity without a message', async () => {
    const requestData = createValidRequestData();

    requestData.activities[0].message = '';

    const request = new LaboratoryRequest(requestData);

    await assert.rejects(
        request.validate(),
        (error) => {
            assert.equal(error.name, 'ValidationError');

            assert.ok(
                error.errors['activities.0.message']
            );

            return true;
        }
    );
});

// ==========================================
// 16. ACTIVITY TIMESTAMP
// ==========================================

test('automatically assigns a timestamp to request activities', async () => {
    const request = new LaboratoryRequest(
        createValidRequestData()
    );

    await request.validate();

    assert.ok(
        request.activities[0].performedAt instanceof Date
    );
});

// ==========================================
// 17. REQUEST TIMESTAMPS
// ==========================================

test('defines automatic request timestamps', () => {
    const request = new LaboratoryRequest(
        createValidRequestData()
    );

    assert.strictEqual(
        LaboratoryRequest.schema.options.timestamps,
        true
    );

    assert.strictEqual(request.createdAt, undefined);
    assert.strictEqual(request.updatedAt, undefined);
});

// ==========================================
// 18. UNIQUE REQUEST NUMBER
// ==========================================

test('defines request number as a unique field', () => {
    const requestNumberPath = LaboratoryRequest.schema
        .path('requestNumber');

    assert.equal(
        requestNumberPath.options.unique,
        true
    );
});

// ==========================================
// 19. MONGODB REFERENCES
// ==========================================

test('references the existing Patient model', () => {
    const patientPath = LaboratoryRequest.schema
        .path('patient');

    assert.equal(patientPath.options.ref, 'Patient');
});

test('references the existing LabUser model for request ownership', () => {
    assert.equal(
        LaboratoryRequest.schema.path('requestedBy').options.ref,
        'LabUser'
    );

    assert.equal(
        LaboratoryRequest.schema.path('createdBy').options.ref,
        'LabUser'
    );

    assert.equal(
        LaboratoryRequest.schema.path('updatedBy').options.ref,
        'LabUser'
    );
});

// ==========================================
// 20. DEFAULT REQUEST INFORMATION
// ==========================================

test('sets default clinical notes and empty activity history', async () => {
    const requestData = createValidRequestData();

    delete requestData.clinicalNotes;
    delete requestData.activities;

    const request = new LaboratoryRequest(requestData);

    await request.validate();

    assert.equal(request.clinicalNotes, '');
    assert.equal(request.activities.length, 0);
});

// ==========================================
// 21. REQUEST WORKFLOW TIMESTAMPS
// ==========================================

test('initializes request workflow timestamps as null', () => {
    const request = new LaboratoryRequest(
        createValidRequestData()
    );

    assert.equal(request.submittedAt, null);
    assert.equal(request.acceptedAt, null);
    assert.equal(request.startedAt, null);
    assert.equal(request.completedAt, null);
    assert.equal(request.cancelledAt, null);
});

// ==========================================
// 22. UNIQUE REQUEST NUMBER INDEX
// ==========================================

test('defines a unique MongoDB index for request number', () => {
    const indexes = LaboratoryRequest.schema.indexes();

    const requestNumberIndex = indexes.find(
        ([fields, options]) =>
            fields.requestNumber === 1 &&
            options.unique === true
    );

    assert.ok(requestNumberIndex);
});

// ==========================================
// 23. LABORATORY REQUEST COLLECTION
// ==========================================

test('uses the laboratory_requests MongoDB collection', () => {
    assert.equal(
        LaboratoryRequest.collection.name,
        'laboratory_requests'
    );
});
