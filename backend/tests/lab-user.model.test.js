const { test } = require('node:test');
const assert = require('node:assert/strict');

const User = require('../src/modules/core/user.model');

const validUserData = {
    employeeId: 'EMP-TEST-01',
    username: 'labstaff01',
    email: 'labstaff01@example.com',
    passwordHash: '$argon2id$exampleHashForSchemaTesting',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    role: 'lab_technologist'
};

test('uses the shared users collection', () => {
    assert.equal(User.collection.name, 'users');
});

test('accepts valid shared user data', async () => {
    await assert.doesNotReject(new User(validUserData).validate());
});

test('rejects a user with missing required fields', async () => {
    const user = new User({});
    await assert.rejects(user.validate(), (error) => {
        assert.equal(error.name, 'ValidationError');
        for (const field of ['employeeId', 'username', 'email', 'passwordHash', 'firstName', 'lastName', 'role']) {
            assert.ok(error.errors[field], `missing error for ${field}`);
        }
        return true;
    });
});

test('defaults account status to Active', () => {
    const user = new User(validUserData);
    assert.equal(user.status, 'Active');
    assert.equal(user.passwordVersion, 0);
});

test('rejects an unsupported account status', async () => {
    const user = new User({ ...validUserData, status: 'suspended' });
    await assert.rejects(user.validate(), (error) => {
        assert.ok(error.errors.status);
        return true;
    });
});

test('excludes the password hash from normal query selection', () => {
    assert.equal(User.schema.path('passwordHash').options.select, false);
});

test('removes the password hash from JSON output', () => {
    const userObject = new User(validUserData).toJSON();
    assert.equal(userObject.passwordHash, undefined);
    assert.equal(userObject.username, validUserData.username);
});

test('defines automatic timestamps', () => {
    assert.strictEqual(User.schema.options.timestamps, true);
});

test('accepts laboratory roles from the shared role set', async () => {
    for (const role of [
        'lab_admin',
        'lab_receptionist',
        'lab_technologist',
        'result_verifier',
        'requesting_clinician'
    ]) {
        await assert.doesNotReject(new User({ ...validUserData, role }).validate());
    }
});
