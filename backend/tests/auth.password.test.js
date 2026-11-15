const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../src/modules/core/user.model');
const {
    authenticateUser,
    changePassword
} = require('../src/modules/auth/auth.service');
const { requireAuth } = require('../src/middleware/auth.middleware');
const {
    hashPassword,
    verifyPassword
} = require('../src/shared/utils/password');

let mongoServer;

const currentPassword = 'Current laboratory phrase 2026!';
const nextPassword = 'Unique access phrase with 2026! value';

async function createTestUser() {
    return User.create({
        employeeId: 'EMP-TEST-01',
        firstName: 'Alex',
        lastName: 'Rivera',
        username: 'labtech01',
        email: 'labtech@example.com',
        passwordHash: await hashPassword(currentPassword),
        role: 'lab_technologist',
        status: 'Active'
    });
}

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(mongoServer.getUri(), {
        dbName: 'medilink_password_test'
    });

    await User.init();
});

beforeEach(async () => {
    await User.deleteMany({});
});

after(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

test('changes the password hash and increments the session version', async () => {
    const user = await createTestUser();

    await changePassword(
        user._id.toString(),
        currentPassword,
        nextPassword
    );

    const savedUser = await User.findById(user._id).select('+passwordHash');

    assert.equal(savedUser.passwordVersion, 1);
    assert.equal(
        await verifyPassword(nextPassword, savedUser.passwordHash),
        true
    );
    assert.equal(
        await verifyPassword(currentPassword, savedUser.passwordHash),
        false
    );

    const authenticatedUser = await authenticateUser('labtech01', nextPassword);
    assert.equal(authenticatedUser.passwordVersion, 1);

    await assert.rejects(
        authenticateUser('labtech01', currentPassword),
        /Invalid username\/email or password/
    );

    const request = {
        session: {
            userId: user._id.toString(),
            passwordVersion: 0
        }
    };
    const response = {
        statusCode: 200,
        status(statusCode) {
            this.statusCode = statusCode;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
    let nextCalled = false;

    await requireAuth(request, response, () => {
        nextCalled = true;
    });

    assert.equal(response.statusCode, 401);
    assert.equal(nextCalled, false);
});

test('rejects a password change when the current password is incorrect', async () => {
    const user = await createTestUser();

    await assert.rejects(
        changePassword(user._id.toString(), 'incorrect current password', nextPassword),
        /current password is incorrect/
    );

    const savedUser = await User.findById(user._id).select('+passwordHash');
    assert.equal(
        await verifyPassword(currentPassword, savedUser.passwordHash),
        true
    );
});

test('rejects short and common new passwords', async () => {
    const user = await createTestUser();

    await assert.rejects(
        changePassword(user._id.toString(), currentPassword, 'short'),
        /at least 12 characters/
    );

    await assert.rejects(
        changePassword(user._id.toString(), currentPassword, 'Password1234'),
        /too common/
    );

    await assert.rejects(
        changePassword(user._id.toString(), currentPassword, 'Password123!'),
        /too common/
    );
});

test('rejects reusing the current password', async () => {
    const user = await createTestUser();

    await assert.rejects(
        changePassword(user._id.toString(), currentPassword, currentPassword),
        /differs from your current password/
    );
});
