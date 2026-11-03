
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Patient = require('../src/modules/patients/patient.model');
const {
    createPatient,
    getPatientByCode,
    getPatientById,
    searchPatients
} = require('../src/modules/patients/patient.service');

let mongoServer;

const validPatientData = {
    patientCode: 'PAT-000001',
    firstName: 'Juan',
    middleName: 'Santos',
    lastName: 'Dela Cruz',
    suffix: 'Jr.',
    dateOfBirth: new Date('1995-06-15'),
    sex: 'male',
    contactNumber: '09171234567'
};

// Start a temporary MongoDB database before the tests.
before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(mongoServer.getUri(), {
        dbName: 'medilink_patient_test'
    });

    await Patient.init();
});

// Clear test patients before each test.
beforeEach(async () => {
    await Patient.deleteMany({});
});

// Disconnect and stop the temporary database after testing.
after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

// =========================================
// 1. CREATE PATIENT
// =========================================

test('creates a patient record successfully', async () => {
    const patient = await createPatient(validPatientData);

    assert.ok(patient._id);
    assert.strictEqual(patient.patientCode, 'PAT-000001');
    assert.strictEqual(patient.firstName, 'Juan');
    assert.strictEqual(patient.lastName, 'Dela Cruz');
    assert.strictEqual(patient.sex, 'male');

    const savedPatient = await Patient.findById(patient._id);

    assert.ok(savedPatient);
    assert.strictEqual(savedPatient.patientCode, 'PAT-000001');
});

// =========================================
// 2. NORMALIZE PATIENT CODE
// =========================================

test('normalizes patient code before saving', async () => {
    const patient = await createPatient({
        ...validPatientData,
        patientCode: '  pat-000001  '
    });

    assert.strictEqual(patient.patientCode, 'PAT-000001');
});

// =========================================
// 3. REQUIRE PATIENT INFORMATION
// =========================================

test('rejects patient creation when patient information is missing', async () => {
    await assert.rejects(
        createPatient(null),
        /Patient information is required/
    );

    await assert.rejects(
        createPatient(undefined),
        /Patient information is required/
    );
});

// =========================================
// 4. REQUIRED PATIENT FIELDS
// =========================================

test('rejects patient creation when required fields are missing', async () => {
    const incompleteData = {
        ...validPatientData,
        firstName: '',
        lastName: ''
    };

    await assert.rejects(
        createPatient(incompleteData),
        /All required patient fields must be provided/
    );
});

// =========================================
// 5. INVALID PATIENT DATA
// =========================================

test('rejects patient creation with an unsupported sex value', async () => {
    const invalidPatientData = {
        ...validPatientData,
        sex: 'invalid'
    };

    await assert.rejects(
        createPatient(invalidPatientData),
        (error) => {
            assert.strictEqual(error.name, 'ValidationError');
            assert.ok(error.errors.sex);
            return true;
        }
    );
});

// =========================================
// 6. DUPLICATE PATIENT CODE
// =========================================

test('rejects an already registered patient code', async () => {
    await createPatient(validPatientData);

    const duplicatePatientData = {
        ...validPatientData,
        firstName: 'Maria'
    };

    await assert.rejects(
        createPatient(duplicatePatientData),
        /Patient code is already registered/
    );

    assert.strictEqual(await Patient.countDocuments({}), 1);
});

// =========================================
// 7. OPTIONAL PATIENT INFORMATION
// =========================================

test('allows patient creation without optional information', async () => {
    const patient = await createPatient({
        patientCode: 'PAT-000002',
        firstName: 'Maria',
        lastName: 'Santos',
        dateOfBirth: new Date('2000-01-15'),
        sex: 'female'
    });

    assert.ok(patient._id);
    assert.strictEqual(patient.middleName, undefined);
    assert.strictEqual(patient.suffix, undefined);
    assert.strictEqual(patient.contactNumber, undefined);
});

// =========================================
// 8. FULL PATIENT NAME
// =========================================

test('returns the complete patient name', async () => {
    const patient = await createPatient(validPatientData);

    const patientJson = patient.toJSON();

    assert.strictEqual(
        patientJson.fullName,
        'Juan Santos Dela Cruz Jr.'
    );
});

// =========================================
// 9. VERIFY DATABASE DUPLICATE PROTECTION
// =========================================

test('enforces the unique patient code index in MongoDB', async () => {
    await createPatient(validPatientData);

    const duplicatePatient = new Patient({
        ...validPatientData,
        firstName: 'Another'
    });

    await assert.rejects(
        duplicatePatient.save(),
        (error) => {
            assert.strictEqual(error.code, 11000);
            return true;
        }
    );

    assert.strictEqual(await Patient.countDocuments({}), 1);
});


 
// =========================================
// 10. GET PATIENT BY PATIENT CODE
// =========================================

test('retrieves a patient using patient code', async () => {
    await createPatient(validPatientData);

    const patient = await getPatientByCode('PAT-000001');

    assert.ok(patient);
    assert.strictEqual(patient.patientCode, 'PAT-000001');
    assert.strictEqual(patient.firstName, 'Juan');
});

test('retrieves patient code regardless of letter case or spaces', async () => {
    await createPatient(validPatientData);

    const patient = await getPatientByCode('  pat-000001  ');

    assert.ok(patient);
    assert.strictEqual(patient.patientCode, 'PAT-000001');
});

test('returns null when patient code does not exist', async () => {
    const patient = await getPatientByCode('PAT-999999');

    assert.strictEqual(patient, null);
});

test('rejects an empty patient code search', async () => {
    await assert.rejects(
        getPatientByCode('   '),
        /A valid patient code is required/
    );
});

// =========================================
// 11. GET PATIENT BY MONGODB ID
// =========================================

test('retrieves a patient using MongoDB ID', async () => {
    const createdPatient = await createPatient(validPatientData);

    const patient = await getPatientById(
        createdPatient._id.toString()
    );

    assert.ok(patient);
    assert.strictEqual(
        patient.patientCode,
        'PAT-000001'
    );
});

test('returns null when MongoDB patient ID does not exist', async () => {
    const unknownId = new mongoose.Types.ObjectId().toString();

    const patient = await getPatientById(unknownId);

    assert.strictEqual(patient, null);
});

test('rejects an invalid MongoDB patient ID', async () => {
    await assert.rejects(
        getPatientById('invalid-id'),
        /A valid patient ID is required/
    );
});

// =========================================
// 12. SEARCH PATIENTS
// =========================================

test('searches patients using their first name', async () => {
    await createPatient(validPatientData);

    const result = await searchPatients('Juan');

    assert.strictEqual(result.patients.length, 1);
    assert.strictEqual(
        result.patients[0].firstName,
        'Juan'
    );
});

test('searches patients using their last name', async () => {
    await createPatient(validPatientData);

    const result = await searchPatients('Dela Cruz');

    assert.strictEqual(result.patients.length, 1);
    assert.strictEqual(
        result.patients[0].lastName,
        'Dela Cruz'
    );
});

test('searches patients using patient code', async () => {
    await createPatient(validPatientData);

    const result = await searchPatients('PAT-000001');

    assert.strictEqual(result.patients.length, 1);
    assert.strictEqual(
        result.patients[0].patientCode,
        'PAT-000001'
    );
});

test('searches patients using contact number', async () => {
    await createPatient(validPatientData);

    const result = await searchPatients('09171234567');

    assert.strictEqual(result.patients.length, 1);
    assert.strictEqual(
        result.patients[0].contactNumber,
        '09171234567'
    );
});

test('returns an empty result when no patient matches', async () => {
    const result = await searchPatients('UnknownPatient');

    assert.strictEqual(result.patients.length, 0);
    assert.strictEqual(result.pagination.total, 0);
    assert.strictEqual(result.pagination.totalPages, 0);
});

test('returns patient search pagination information', async () => {
    await createPatient(validPatientData);

    await createPatient({
        ...validPatientData,
        patientCode: 'PAT-000002',
        firstName: 'Maria',
        lastName: 'Santos'
    });

    const result = await searchPatients('PAT', {
        page: 1,
        limit: 1
    });

    assert.strictEqual(result.patients.length, 1);
    assert.strictEqual(result.pagination.total, 2);
    assert.strictEqual(result.pagination.page, 1);
    assert.strictEqual(result.pagination.limit, 1);
    assert.strictEqual(result.pagination.totalPages, 2);
});

test('rejects an empty patient search term', async () => {
    await assert.rejects(
        searchPatients('   '),
        /A search term is required/
    );
});

test('rejects invalid patient search pagination settings', async () => {
    await assert.rejects(
        searchPatients('Juan', { page: 0 }),
        /Invalid pagination settings/
    );

    await assert.rejects(
        searchPatients('Juan', { limit: 101 }),
        /Invalid pagination settings/
    );
});

