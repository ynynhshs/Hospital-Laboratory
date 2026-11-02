const LabUser = require('./lab-user.model');
const { hashPassword } = require('../../shared/utils/password');

const ALLOWED_ROLES = [
    'lab_admin',
    'lab_receptionist',
    'lab_technologist',
    'result_verifier',
    'requesting_clinician'
];

async function createUser(userData) {
    const {
        username,
        email,
        password,
        firstName,
        lastName,
        role
    } = userData;

    // Validate required input fields.
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

    // Validate the requested laboratory role.
    if (!ALLOWED_ROLES.includes(role)) {
        throw new Error('Invalid laboratory user role.');
    }

    // Prevent duplicate usernames and email addresses.
    const existingUser = await LabUser.findOne({
        $or: [
            { username: username.trim().toLowerCase() },
            { email: email.trim().toLowerCase() }
        ]
    });

    if (existingUser) {
        throw new Error('Username or email address is already registered.');
    }

    // Hash the password before saving.
    const passwordHash = await hashPassword(password);

    // Create the account as inactive by default.
    const newUser = new LabUser({
    username,
    email,
    passwordHash,
    firstName,
    lastName,
    role,
    accountStatus: 'inactive'
});

    return await newUser.save();
}

module.exports = {
    createUser
};