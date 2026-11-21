const { test } = require('node:test');
const assert = require('node:assert/strict');

const Patient = require('../src/modules/core/patient.model');

const validPatientData = {
    patientId: 'PAT-000001',
    firstName: 'Juan',
    middleName: 'Santos',
    lastName: 'Dela Cruz',
    birthDate: new Date('1995-06-15'),
    sex: 'Male',
    contactNo: '09171234567'
};

test('uses the shared patients collection', () => {
    assert.equal(Patient.collection.name, 'patients');
});

test('accepts valid shared patient data', async () => {
    await assert.doesNotReject(new Patient(validPatientData).validate());
});

test('rejects a patient with missing required fields', async () => {
    const patient = new Patient({});
    await assert.rejects(patient.validate(), (error) => {
        assert.equal(error.name, 'ValidationError');
        for (const field of ['patientId', 'firstName', 'lastName', 'birthDate', 'sex']) {
            assert.ok(error.errors[field], `missing error for ${field}`);
        }
        return true;
    });
});

test('rejects an unsupported sex value', async () => {
    const patient = new Patient({ ...validPatientData, sex: 'invalid' });
    await assert.rejects(patient.validate(), (error) => {
        assert.ok(error.errors.sex);
        return true;
    });
});

test('allows optional patient information', async () => {
    const patient = new Patient({
        patientId: 'PAT-000002',
        firstName: 'Maria',
        lastName: 'Santos',
        birthDate: new Date('2000-01-15'),
        sex: 'Female'
    });
    await assert.doesNotReject(patient.validate());
    assert.equal(patient.middleName, undefined);
});

test('defines unique patientId and automatic timestamps', () => {
    assert.equal(Patient.schema.path('patientId').options.unique, true);
    assert.equal(Patient.schema.options.timestamps, true);
});
