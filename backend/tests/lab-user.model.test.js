
const test = require('node:test');
const assert = require('node:assert/strict');

const LabUser = require('../src/modules/users/lab-user.model');

// =========================================
// TEST DATA
// =========================================

const validUserData = {
    username: 'labstaff01',
    email: 'labstaff01@example.com',
    passwordHash: '$argon2id$exampleHashForSchemaTesting',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    role: 'lab_technologist'
};

// =========================================
// 1. VALID USER DATA
// =========================================

test('accepts valid laboratory user data', async () => {
    const user = new LabUser(validUserData);

    await assert.doesNotReject(user.validate());
});

// =========================================
// 2. REQUIRED FIELDS
// =========================================

test('rejects a user with missing required fields', async () => {
    const user = new LabUser({});

    await assert.rejects(
        user.validate(),
        (error) => {
            assert.equal(error.name, 'ValidationError');
            assert.ok(error.errors.username);
            assert.ok(error.errors.email);
            assert.ok(error.errors.passwordHash);
            assert.ok(error.errors.firstName);
            assert.ok(error.errors.lastName);
            assert.ok(error.errors.role);
            return true;
        }
    );
});

// =========================================
// 3. INVALID USER ROLE
// =========================================

test('rejects an unsupported laboratory role', async () => {
    const user = new LabUser({
        ...validUserData,
        role: 'unauthorized_role'
    });

    await assert.rejects(
        user.validate(),
        (error) => {
            assert.equal(error.name, 'ValidationError');
            assert.ok(error.errors.role);
            return true;
        }
    );
});

// =========================================
// 4. USERNAME NORMALIZATION
// =========================================

test('converts username to lowercase and removes surrounding spaces', async () => {
    const user = new LabUser({
        ...validUserData,
        username: '  LABSTAFF01  '
    });

    await user.validate();

    assert.equal(user.username, 'labstaff01');
});

// =========================================
// 5. EMAIL NORMALIZATION
// =========================================

test('converts email to lowercase and removes surrounding spaces', async () => {
    const user = new LabUser({
        ...validUserData,
        email: '  LABSTAFF01@EXAMPLE.COM  '
    });

    await user.validate();

    assert.equal(user.email, 'labstaff01@example.com');
});

// =========================================
// 6. DEFAULT ACCOUNT STATUS
// =========================================

test('sets new user accounts to inactive by default', () => {
    const user = new LabUser(validUserData);

    assert.equal(user.accountStatus, 'inactive');
});

// =========================================
// 7. INVALID ACCOUNT STATUS
// =========================================

test('rejects an unsupported account status', async () => {
    const user = new LabUser({
        ...validUserData,
        accountStatus: 'suspended'
    });

    await assert.rejects(
        user.validate(),
        (error) => {
            assert.equal(error.name, 'ValidationError');
            assert.ok(error.errors.accountStatus);
            return true;
        }
    );
});

// =========================================
// 8. PASSWORD HASH PROTECTION
// =========================================

test('excludes password hash from ordinary query selection', () => {
    const passwordPath = LabUser.schema.path('passwordHash');

    assert.equal(passwordPath.options.select, false);
});

// =========================================
// 9. PASSWORD HASH JSON PROTECTION
// =========================================

test('removes password hash when converting a user to JSON', () => {
    const user = new LabUser(validUserData);

    const userObject = user.toJSON();

    assert.equal(userObject.passwordHash, undefined);
    assert.equal(userObject.username, validUserData.username);
});

// =========================================
// 10. ACCOUNT TIMESTAMPS
// =========================================

test('defines automatic account timestamps', () => {
    const user = new LabUser(validUserData);

    assert.strictEqual(LabUser.schema.options.timestamps, true);
    assert.strictEqual(user.createdAt, undefined);
    assert.strictEqual(user.updatedAt, undefined);
});


// =========================================
// 11. EXTERNAL USER REFERENCE
// =========================================

test('allows an optional external user identifier', async () => {
    const user = new LabUser({
        ...validUserData,
        externalUserId: 'MEDILINK-USER-001'
    });

    await assert.doesNotReject(user.validate());

    assert.equal(
        user.externalUserId,
        'MEDILINK-USER-001'
    );
});

// =========================================
// 12. USER COLLECTION
// =========================================

test('uses the lab_users MongoDB collection', () => {
    assert.equal(LabUser.collection.name, 'lab_users');
});
