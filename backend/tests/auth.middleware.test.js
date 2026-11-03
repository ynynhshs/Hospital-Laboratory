
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const LabUser = require('../src/modules/users/lab-user.model');

const {
    requireAuth,
    authorizeRoles
} = require('../src/middleware/auth.middleware');

const { hashPassword } = require('../src/shared/utils/password');

let mongoServer;

async function createTestUser(
    accountStatus = 'active',
    role = 'lab_technologist'
) {
    const passwordHash = await hashPassword('MiddlewareTest@123');

    return LabUser.create({
        username: 'middlewareuser',
        email: 'middleware@example.com',
        passwordHash,
        firstName: 'Morgan',
        lastName: 'Reyes',
        role,
        accountStatus
    });
}

function createMockResponse() {
    return {
        statusCode: null,
        body: null,

        status(code) {
            this.statusCode = code;
            return this;
        },

        json(data) {
            this.body = data;
            return this;
        }
    };
}

before(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(mongoServer.getUri(), {
        dbName: 'medilink_lab_middleware_test'
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

// =========================================
// AUTHENTICATION MIDDLEWARE TESTS
// =========================================

test('rejects a request without an authenticated session', async () => {
    const req = {};
    const res = createMockResponse();

    let nextCalled = false;

    await requireAuth(req, res, () => {
        nextCalled = true;
    });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(
        res.body.message,
        'Authentication required. Please log in.'
    );
    assert.strictEqual(nextCalled, false);
});

test('rejects a session containing an unknown user ID', async () => {
    const req = {
        session: {
            userId: new mongoose.Types.ObjectId().toString()
        }
    };

    const res = createMockResponse();

    let nextCalled = false;

    await requireAuth(req, res, () => {
        nextCalled = true;
    });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(
        res.body.message,
        'Your session is no longer valid. Please log in again.'
    );
    assert.strictEqual(nextCalled, false);
});

test('rejects an authenticated session belonging to an inactive account', async () => {
    const user = await createTestUser('inactive');

    const req = {
        session: {
            userId: user._id.toString()
        }
    };

    const res = createMockResponse();

    let nextCalled = false;

    await requireAuth(req, res, () => {
        nextCalled = true;
    });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(nextCalled, false);
});

test('allows an active user with a valid session', async () => {
    const user = await createTestUser();

    const req = {
        session: {
            userId: user._id.toString()
        }
    };

    const res = createMockResponse();

    let nextCalled = false;

    await requireAuth(req, res, () => {
        nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);

    assert.deepStrictEqual(req.user, {
        id: user._id.toString(),
        username: 'middlewareuser',
        email: 'middleware@example.com',
        firstName: 'Morgan',
        lastName: 'Reyes',
        role: 'lab_technologist',
        accountStatus: 'active'
    });

    assert.strictEqual(req.user.passwordHash, undefined);
});

// =========================================
// ROLE-BASED AUTHORIZATION TESTS
// =========================================

test('rejects role authorization when no authenticated user is attached', () => {
    const req = {};
    const res = createMockResponse();

    let nextCalled = false;

    authorizeRoles('lab_admin')(req, res, () => {
        nextCalled = true;
    });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(
        res.body.message,
        'Authentication required. Please log in.'
    );
    assert.strictEqual(nextCalled, false);
});

test('allows a user whose role is authorized', () => {
    const req = {
        user: {
            id: 'test-user-id',
            role: 'lab_technologist'
        }
    };

    const res = createMockResponse();

    let nextCalled = false;

    authorizeRoles(
        'lab_admin',
        'lab_technologist'
    )(req, res, () => {
        nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(res.statusCode, null);
});

test('rejects a user whose role is not authorized', () => {
    const req = {
        user: {
            id: 'test-user-id',
            role: 'lab_technologist'
        }
    };

    const res = createMockResponse();

    let nextCalled = false;

    authorizeRoles('lab_admin')(req, res, () => {
        nextCalled = true;
    });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(
        res.body.message,
        'You do not have permission to access this resource.'
    );
    assert.strictEqual(nextCalled, false);
});
