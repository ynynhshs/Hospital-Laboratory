
const test = require('node:test');
const assert = require('node:assert/strict');

const Patient = require('../src/modules/patients/patient.model');

// =========================================
// TEST DATA
// =========================================

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

// =========================================
// 1. VALID PATIENT DATA
// =========================================

test('accepts valid patient data', async () => {
    const patient = new Patient(validPatientData);

    await assert.doesNotReject(patient.validate());
});

// =========================================
// 2. REQUIRED FIELDS
// =========================================

test('rejects a patient with missing required fields', async () => {
    const patient = new Patient({});

    await assert.rejects(
        patient.validate(),
        (error) => {
            assert.equal(error.name, 'ValidationError');
            assert.ok(error.errors.patientCode);
            assert.ok(error.errors.firstName);
            assert.ok(error.errors.lastName);
            assert.ok(error.errors.dateOfBirth);
            assert.ok(error.errors.sex);
            return true;
        }
    );
});

// =========================================
// 3. PATIENT CODE NORMALIZATION
// =========================================

test('converts patient code to uppercase and removes surrounding spaces', async () => {
    const patient = new Patient({
        ...validPatientData,
        patientCode: '  pat-000001  '
    });

    await patient.validate();

    assert.equal(patient.patientCode, 'PAT-000001');
});

// =========================================
// 4. PATIENT NAME NORMALIZATION
// =========================================

test('removes surrounding spaces from patient names', async () => {
    const patient = new Patient({
        ...validPatientData,
        firstName: '  Juan  ',
        lastName: '  Dela Cruz  '
    });

    await patient.validate();

    assert.equal(patient.firstName, 'Juan');
    assert.equal(patient.lastName, 'Dela Cruz');
});

// =========================================
// 5. INVALID PATIENT SEX
// =========================================

test('rejects an unsupported patient sex', async () => {
    const patient = new Patient({
        ...validPatientData,
        sex: 'invalid'
    });

    await assert.rejects(
        patient.validate(),
        (error) => {
            assert.equal(error.name, 'ValidationError');
            assert.ok(error.errors.sex);
            return true;
        }
    );
});

// =========================================
// 6. PATIENT SEX NORMALIZATION
// =========================================

test('converts patient sex to lowercase and removes surrounding spaces', async () => {
    const patient = new Patient({
        ...validPatientData,
        sex: '  MALE  '
    });

    await patient.validate();

    assert.equal(patient.sex, 'male');
});

// =========================================
// 7. FUTURE DATE OF BIRTH
// =========================================

test('rejects a date of birth in the future', async () => {
    const futureDate = new Date(
        Date.now() + 24 * 60 * 60 * 1000
    );

    const patient = new Patient({
        ...validPatientData,
        dateOfBirth: futureDate
    });

    await assert.rejects(
        patient.validate(),
        (error) => {
            assert.equal(error.name, 'ValidationError');
            assert.ok(error.errors.dateOfBirth);
            return true;
        }
    );
});

// =========================================
// 8. OPTIONAL PATIENT INFORMATION
// =========================================

test('allows optional middle name, suffix, and contact number', async () => {
    const patient = new Patient({
        patientCode: 'PAT-000002',
        firstName: 'Maria',
        lastName: 'Santos',
        dateOfBirth: new Date('2000-01-15'),
        sex: 'female'
    });

    await assert.doesNotReject(patient.validate());

    assert.equal(patient.middleName, undefined);
    assert.equal(patient.suffix, undefined);
    assert.equal(patient.contactNumber, undefined);
});

// =========================================
// 9. FULL PATIENT NAME VIRTUAL
// =========================================

test('generates the full patient name using all available name fields', () => {
    const patient = new Patient(validPatientData);

    assert.equal(
        patient.fullName,
        'Juan Santos Dela Cruz Jr.'
    );
});

// =========================================
// 10. FULL NAME WITHOUT OPTIONAL FIELDS
// =========================================

test('generates the full patient name without optional name fields', () => {
    const patient = new Patient({
        patientCode: 'PAT-000003',
        firstName: 'Maria',
        lastName: 'Santos',
        dateOfBirth: new Date('2000-01-15'),
        sex: 'female'
    });

    assert.equal(patient.fullName, 'Maria Santos');
});

// =========================================
// 11. FULL NAME JSON OUTPUT
// =========================================

test('includes the full patient name virtual when converting to JSON', () => {
    const patient = new Patient(validPatientData);

    const patientObject = patient.toJSON();

    assert.equal(
        patientObject.fullName,
        'Juan Santos Dela Cruz Jr.'
    );
});

// =========================================
// 12. PATIENT TIMESTAMPS
// =========================================

test('defines automatic patient timestamps', () => {
    const patient = new Patient(validPatientData);

    assert.strictEqual(
        Patient.schema.options.timestamps,
        true
    );

    assert.strictEqual(patient.createdAt, undefined);
    assert.strictEqual(patient.updatedAt, undefined);
});

// =========================================
// 13. UNIQUE PATIENT CODE
// =========================================

test('defines patient code as a unique field', () => {
    const patientCodePath = Patient.schema.path('patientCode');

    assert.equal(patientCodePath.options.unique, true);
});

// =========================================
// 14. PATIENT COLLECTION
// =========================================

test('uses the patients MongoDB collection', () => {
    assert.equal(Patient.collection.name, 'patients');
});
