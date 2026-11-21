const { randomBytes } = require('node:crypto');

const User = require('../core/user.model');
const { hashPassword } = require('../../shared/utils/password');

const ALLOWED_ROLES = [
    'lab_admin',
    'lab_receptionist',
    'lab_technologist',
    'result_verifier',
    'requesting_clinician'
];

function generateEmployeeId() {
    return `LAB-${randomBytes(4).toString('hex').toUpperCase()}`;
}

async function createUser(userData) {
    const {
        username,
        email,
        password,
        firstName,
        lastName,
        role
    } = userData || {};

    if (
        !username ||
        !email ||
        !password ||
        !firstName ||
        !lastName ||
        !role
    ) {
        throw new Error('All user fields are required.');
    }

    if (!ALLOWED_ROLES.includes(role)) {
        throw new Error('Invalid laboratory user role.');
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const normalizedEmail = String(email).trim().toLowerCase();

    // The shared users collection is the only user collection.
    const existingUser = await User.findOne({
        $or: [
            { username: normalizedUsername },
            { email: normalizedEmail }
        ]
    });

    if (existingUser) {
        throw new Error('Username or email address is already registered.');
    }

    let employeeId;
    do {
        employeeId = generateEmployeeId();
    } while (await User.exists({ employeeId }));

    const passwordHash = await hashPassword(password);

    return User.create({
        employeeId,
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
        passwordVersion: 0,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        role,
        status: 'Active'
    });
}

module.exports = {
    createUser,
    ALLOWED_ROLES
};
