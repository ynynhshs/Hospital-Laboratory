const LabUser = require('../users/lab-user.model');
const { verifyPassword } = require('../../shared/utils/password');

const INVALID_CREDENTIALS_MESSAGE = 'Invalid username/email or password.';

async function authenticateUser(identifier, password) {
    // Validate the supplied login information.
    if (
        typeof identifier !== 'string' ||
        identifier.trim().length === 0 ||
        typeof password !== 'string' ||
        password.length === 0
    ) {
        throw new Error(INVALID_CREDENTIALS_MESSAGE);
    }

    const normalizedIdentifier = identifier.trim().toLowerCase();

    // Find the account using either its username or email.
    // Password hash is explicitly selected because the model hides it by default.
    const user = await LabUser.findOne({
        $or: [
            { username: normalizedIdentifier },
            { email: normalizedIdentifier }
        ]
    }).select('+passwordHash');

    // Use the same message for unknown accounts and incorrect passwords.
    if (!user) {
        throw new Error(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordIsValid = await verifyPassword(
        password,
        user.passwordHash
    );

    if (!passwordIsValid || user.accountStatus !== 'active') {
        throw new Error(INVALID_CREDENTIALS_MESSAGE);
    }

    // Update the user's last successful login time.
    user.lastLoginAt = new Date();
    await user.save();

    // Return only safe account information, never the password hash.
    return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        accountStatus: user.accountStatus,
        lastLoginAt: user.lastLoginAt
    };
}

module.exports = {
    authenticateUser
};