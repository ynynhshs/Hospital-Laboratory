const test = require('node:test');
const assert = require('node:assert/strict');

const argon2 = require('argon2');

const {
    hashPassword,
    verifyPassword
} = require('../src/shared/utils/password');

test('generates a valid Argon2id password hash', async () => {
    const password = 'SmartVetTest@123';

    const passwordHash = await hashPassword(password);

    assert.notStrictEqual(passwordHash, password);
    assert.ok(passwordHash.startsWith('$argon2id$'));
    assert.ok(await argon2.verify(passwordHash, password));
});

test('verifies the correct password', async () => {
    const password = 'LaboratoryTest@123';
    const passwordHash = await hashPassword(password);

    const result = await verifyPassword(password, passwordHash);

    assert.strictEqual(result, true);
});

test('rejects an incorrect password', async () => {
    const passwordHash = await hashPassword('CorrectPassword@123');

    const result = await verifyPassword('WrongPassword@123', passwordHash);

    assert.strictEqual(result, false);
});

test('rejects an empty password when hashing', async () => {
    await assert.rejects(
        hashPassword(''),
        /Password must be a non-empty string/
    );
});

test('rejects a non-string password when hashing', async () => {
    await assert.rejects(
        hashPassword(null),
        /Password must be a non-empty string/
    );
});

test('returns false for an empty password during verification', async () => {
    const passwordHash = await hashPassword('ValidPassword@123');

    const result = await verifyPassword('', passwordHash);

    assert.strictEqual(result, false);
});

test('returns false for a malformed password hash', async () => {
    const result = await verifyPassword(
        'ValidPassword@123',
        'this-is-not-a-valid-hash'
    );

    assert.strictEqual(result, false);
});