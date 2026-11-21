const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Patient = require('../src/modules/core/patient.model');
const {
    createPatient,
    getPatientByCode,
    getPatientById,
    searchPatients,
    updatePatient
} = require('../src/modules/patients/patient.service');

let mongoServer;

const validPatientData = {
    firstName: 'Juan',
    middleName: 'Santos',
    lastName: 'Dela Cruz',
    birthDate: new Date('1995-06-15'),
    sex: 'Male',
    contactNo: '09171234567'
};

before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'medilink_patient_test' });
    await Patient.init();
});

beforeEach(async () => {
    await Patient.deleteMany({});
});

after(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
});

test('creates a patient with an auto-generated patientId', async () => {
    const patient = await createPatient(validPatientData);
    assert.ok(patient._id);
    assert.match(patient.patientId, /^PAT-\d{3,}$/);
    assert.equal(patient.firstName, 'Juan');
});

test('rejects patient data missing required fields', async () => {
    await assert.rejects(createPatient({ firstName: '', lastName: '' }), (error) => {
        assert.equal(error.name, 'ValidationError');
        return true;
    });
});

test('searches existing shared patients by first or last name', async () => {
    await createPatient(validPatientData);
    assert.equal((await searchPatients('Juan')).patients.length, 1);
    assert.equal((await searchPatients('Dela')).patients.length, 1);
});

test('searches older shared records with patientCode and contactNumber', async () => {
    await Patient.collection.insertOne({
        patientCode: 'PAT-LEGACY-01',
        firstName: 'John',
        lastName: 'Doe',
        contactNumber: '09170000001',
        sex: 'male',
        createdAt: new Date()
    });
    assert.equal((await searchPatients('PAT-LEGACY-01')).patients.length, 1);
    assert.equal((await searchPatients('09170000001')).patients.length, 1);
});

test('gets a patient by patientId or legacy patientCode', async () => {
    const created = await createPatient(validPatientData);
    assert.ok(await getPatientByCode(created.patientId));
    await Patient.collection.insertOne({
        patientCode: 'PAT-LEGACY-02',
        firstName: 'Legacy',
        lastName: 'Record',
        createdAt: new Date()
    });
    assert.ok(await getPatientByCode('PAT-LEGACY-02'));
});

test('gets a patient by MongoDB _id and validates the ID', async () => {
    const created = await createPatient(validPatientData);
    assert.ok(await getPatientById(created._id.toString()));
    await assert.rejects(getPatientById('invalid-id'), /A valid patient ID is required/);
});

test('updates a patient without changing patientId', async () => {
    const created = await createPatient(validPatientData);
    const updated = await updatePatient(created._id.toString(), {
        patientId: 'PAT-HACK',
        clinicalNotes: 'ignored',
        address: 'New address'
    });
    assert.equal(updated.patientId, created.patientId);
    assert.equal(updated.address, 'New address');
});

test('lists patients with pagination when no search term is supplied', async () => {
    await createPatient(validPatientData);
    const result = await searchPatients('', { page: 1, limit: 1 });
    assert.equal(result.patients.length, 1);
    assert.equal(result.pagination.total, 1);
});
