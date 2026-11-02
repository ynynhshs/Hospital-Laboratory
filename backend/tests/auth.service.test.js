const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const LabUser = require('../src/modules/users/lab-user.model');
const { authenticateUser } = require('../src/modules/auth/auth.service');
const { hashPassword } = require('../src/shared/utils/password');

let mongoServer;

const testPassword = 'LaboratoryLogin@123';

async function createTestUser(accountStatus = 'active') {
    const passwordHash = await hashPassword(testPassword);

    return LabUser.create({
        username: 'labtech01',
        email: 'labtech@example.com',
        passwordHash,
        firstName: 'Alex',
        lastName: 'Rivera',
        role: 'lab_technologist',
        accountStatus
    });
}

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(mongoServer.getUri(), {
        dbName: 'medilink_lab_test'
    });

    await LabUser.init();
});

beforeEach(async () => {
    await LabUser.deleteMany({});
});

after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test('authenticates an active user using their username', async () => {
    await createTestUser();

    const user = await authenticateUser('labtech01', testPassword);

    assert.strictEqual(user.username, 'labtech01');
    assert.strictEqual(user.email, 'labtech@example.com');
    assert.strictEqual(user.role, 'lab_technologist');
    assert.strictEqual(user.accountStatus, 'active');
});

test('authenticates an active user using their email', async () => {
    await createTestUser();

    const user = await authenticateUser(
        'labtech@example.com',
        testPassword
    );

    assert.strictEqual(user.email, 'labtech@example.com');
});

test('rejects an incorrect password', async () => {
    await createTestUser();

    await assert.rejects(
        authenticateUser('labtech01', 'WrongPassword@123'),
        /Invalid username\/email or password/
    );
});

test('rejects an unknown username', async () => {
    await assert.rejects(
        authenticateUser('unknownuser', testPassword),
        /Invalid username\/email or password/
    );
});

test('rejects an inactive account', async () => {
    await createTestUser('inactive');

    await assert.rejects(
        authenticateUser('labtech01', testPassword),
        /Invalid username\/email or password/
    );
});

test('updates last login time after successful authentication', async () => {
    await createTestUser();

    const user = await authenticateUser('labtech01', testPassword);

    assert.ok(user.lastLoginAt instanceof Date);

    const savedUser = await LabUser.findById(user.id);

    assert.ok(savedUser.lastLoginAt instanceof Date);
});

test('does not return the password hash', async () => {
    await createTestUser();

    const user = await authenticateUser('labtech01', testPassword);

    assert.strictEqual(user.passwordHash, undefined);
});

test('rejects empty or invalid login information', async () => {
    await assert.rejects(
        authenticateUser('', testPassword),
        /Invalid username\/email or password/
    );

    await assert.rejects(
        authenticateUser('labtech01', ''),
        /Invalid username\/email or password/
    );

    await assert.rejects(
        authenticateUser(null, testPassword),
        /Invalid username\/email or password/
    );
});