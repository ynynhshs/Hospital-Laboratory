const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const LabUser = require('../src/modules/users/lab-user.model');
const { createUser } = require('../src/modules/users/lab-user.service');
const { verifyPassword } = require('../src/shared/utils/password');

let mongoServer;

const validUserData = {
    username: 'labtech01',
    email: 'labtech@example.com',
    password: 'StrongPassword@123',
    firstName: 'Alex',
    lastName: 'Rivera',
    role: 'lab_technologist'
};

// Start a temporary MongoDB database before the tests.
before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(mongoServer.getUri(), {
        dbName: 'medilink_lab_test'
    });

    await LabUser.init();
});

// Clear test users before each test.
beforeEach(async () => {
    await LabUser.deleteMany({});
});

// Disconnect and stop the temporary database after testing.
after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test('creates a laboratory user account successfully', async () => {
    const user = await createUser(validUserData);

    assert.ok(user._id);
    assert.strictEqual(user.username, 'labtech01');
    assert.strictEqual(user.email, 'labtech@example.com');
    assert.strictEqual(user.role, 'lab_technologist');
    assert.strictEqual(user.accountStatus, 'inactive');
});

test('stores the password as an Argon2id hash', async () => {
    const user = await createUser(validUserData);

    assert.notStrictEqual(user.passwordHash, validUserData.password);
    assert.ok(user.passwordHash.startsWith('$argon2id$'));

    const passwordIsValid = await verifyPassword(
        validUserData.password,
        user.passwordHash
    );

    assert.strictEqual(passwordIsValid, true);
});

test('rejects account creation when required fields are missing', async () => {
    const incompleteData = {
        ...validUserData,
        email: ''
    };

    await assert.rejects(
        createUser(incompleteData),
        /All user fields are required/
    );
});

test('rejects an unsupported laboratory role', async () => {
    const invalidRoleData = {
        ...validUserData,
        role: 'unauthorized_role'
    };

    await assert.rejects(
        createUser(invalidRoleData),
        /Invalid laboratory user role/
    );
});

test('rejects an already registered username', async () => {
    await createUser(validUserData);

    const duplicateUsernameData = {
        ...validUserData,
        email: 'another@example.com'
    };

    await assert.rejects(
        createUser(duplicateUsernameData),
        /Username or email address is already registered/
    );
});

test('rejects an already registered email address', async () => {
    await createUser(validUserData);

    const duplicateEmailData = {
        ...validUserData,
        username: 'anotheruser'
    };

    await assert.rejects(
        createUser(duplicateEmailData),
        /Username or email address is already registered/
    );
});

test('does not expose the password hash in JSON output', async () => {
    const user = await createUser(validUserData);

    const userJson = user.toJSON();

    assert.strictEqual(userJson.passwordHash, undefined);
    assert.strictEqual(userJson.username, 'labtech01');
});