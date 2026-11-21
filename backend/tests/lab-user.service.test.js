const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../src/modules/core/user.model');
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

before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'medilink_lab_test' });
    await User.init();
});

beforeEach(async () => {
    await User.deleteMany({});
});

after(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
});

test('creates an active user in the shared users collection', async () => {
    const user = await createUser(validUserData);
    assert.ok(user._id);
    assert.match(user.employeeId, /^LAB-[0-9A-F]+$/);
    assert.equal(user.username, 'labtech01');
    assert.equal(user.email, 'labtech@example.com');
    assert.equal(user.role, 'lab_technologist');
    assert.equal(user.status, 'Active');
    assert.equal(user.passwordVersion, 0);
    assert.equal(User.collection.name, 'users');
});

test('stores the password as an Argon2id hash', async () => {
    const user = await createUser(validUserData);
    assert.notEqual(user.passwordHash, validUserData.password);
    assert.ok(user.passwordHash.startsWith('$argon2id$'));
    assert.equal(await verifyPassword(validUserData.password, user.passwordHash), true);
});

test('rejects account creation when required fields are missing', async () => {
    await assert.rejects(createUser({ ...validUserData, email: '' }), /All user fields are required/);
});

test('rejects an unsupported laboratory role', async () => {
    await assert.rejects(
        createUser({ ...validUserData, role: 'unauthorized_role' }),
        /Invalid laboratory user role/
    );
});

test('rejects a duplicate username', async () => {
    await createUser(validUserData);
    await assert.rejects(
        createUser({ ...validUserData, email: 'another@example.com' }),
        /Username or email address is already registered/
    );
});

test('rejects a duplicate email address', async () => {
    await createUser(validUserData);
    await assert.rejects(
        createUser({ ...validUserData, username: 'anotheruser' }),
        /Username or email address is already registered/
    );
});

test('does not expose the password hash in JSON output', async () => {
    const user = await createUser(validUserData);
    assert.equal(user.toJSON().passwordHash, undefined);
});
