const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../src/modules/core/user.model');
const { requireAuth, authorizeRoles } = require('../src/middleware/auth.middleware');
const { hashPassword } = require('../src/shared/utils/password');

let mongoServer;
let userCounter = 0;

async function createTestUser(status = 'Active', role = 'lab_technologist') {
    userCounter += 1;
    return User.create({
        employeeId: `EMP-MW-${String(userCounter).padStart(4, '0')}`,
        username: 'middlewareuser',
        email: 'middleware@example.com',
        passwordHash: await hashPassword('MiddlewareTest@123'),
        passwordVersion: 0,
        firstName: 'Morgan',
        lastName: 'Reyes',
        role,
        status
    });
}

function createMockResponse() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; }
    };
}

before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'medilink_lab_middleware_test' });
    await User.init();
});

beforeEach(async () => {
    await User.deleteMany({});
});

after(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
});

test('rejects a request without an authenticated session', async () => {
    const res = createMockResponse();
    let nextCalled = false;
    await requireAuth({}, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test('rejects a session containing an unknown user ID', async () => {
    const req = { session: { userId: new mongoose.Types.ObjectId().toString() } };
    const res = createMockResponse();
    let nextCalled = false;
    await requireAuth(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test('rejects an inactive account', async () => {
    const user = await createTestUser('Inactive');
    const req = { session: { userId: user._id.toString(), passwordVersion: 0 } };
    const res = createMockResponse();
    let nextCalled = false;
    await requireAuth(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});

test('rejects a stale password version', async () => {
    const user = await createTestUser();
    const req = { session: { userId: user._id.toString(), passwordVersion: 5 } };
    const res = createMockResponse();
    let nextCalled = false;
    await requireAuth(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test('allows an active user and attaches a safe profile', async () => {
    const user = await createTestUser();
    const req = { session: { userId: user._id.toString(), passwordVersion: 0 } };
    const res = createMockResponse();
    let nextCalled = false;
    await requireAuth(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user.id, user._id.toString());
    assert.equal(req.user.username, 'middlewareuser');
    assert.equal(req.user.role, 'lab_technologist');
    assert.equal(req.user.status, 'Active');
    assert.equal(req.user.passwordHash, undefined);
});

test('rejects role authorization without an authenticated user', () => {
    const res = createMockResponse();
    let nextCalled = false;
    authorizeRoles('lab_admin')({}, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test('allows an authorized role', () => {
    const res = createMockResponse();
    let nextCalled = false;
    authorizeRoles('lab_admin', 'lab_technologist')(
        { user: { id: 'test-user-id', role: 'lab_technologist' } },
        res,
        () => { nextCalled = true; }
    );
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, null);
});

test('rejects an unauthorized role', () => {
    const res = createMockResponse();
    let nextCalled = false;
    authorizeRoles('lab_admin')(
        { user: { id: 'test-user-id', role: 'lab_technologist' } },
        res,
        () => { nextCalled = true; }
    );
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});
