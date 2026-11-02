const argon2 = require('argon2');

// Hash a plain-text password using Argon2id.
async function hashPassword(password) {
    if (typeof password !== 'string' || password.length === 0) {
        throw new Error('Password must be a non-empty string.');
    }

    return argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1
    });
}

// Verify a plain-text password against its stored Argon2 hash.
async function verifyPassword(password, passwordHash) {
    if (typeof password !== 'string' || typeof passwordHash !== 'string') {
        return false;
    }

    if (password.length === 0 || passwordHash.length === 0) {
        return false;
    }

    try {
        return await argon2.verify(passwordHash, password);
    } catch {
        return false;
    }
}

module.exports = {
    hashPassword,
    verifyPassword
};