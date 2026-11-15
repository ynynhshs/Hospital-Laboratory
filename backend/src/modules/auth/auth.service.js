const User = require('../core/user.model');
const {
    hashPassword,
    verifyPassword
} = require('../../shared/utils/password');
const AppError = require('../../shared/utils/app-error');

const INVALID_CREDENTIALS_MESSAGE = 'Invalid username/email or password.';
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const COMMON_PASSWORDS = new Set([
    '123456',
    '12345678',
    '123456789',
    '1234567890',
    '111111',
    '123123',
    '123321',
    '000000',
    'qwerty',
    'qwerty123',
    'password',
    'password1',
    'password123',
    'password1234',
    'admin',
    'admin123',
    'letmein',
    'welcome',
    'welcome1',
    'iloveyou',
    'abc123',
    'monkey',
    'dragon',
    'football',
    'sunshine',
    'login',
    'master'
]);

function isCommonPassword(password) {
    const compactPassword = password.trim().toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    return Array.from(COMMON_PASSWORDS).some((commonPassword) =>
        compactPassword.includes(commonPassword)
    );
}

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
    const user = await User.findOne({
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

    // FIXED: Changed accountStatus to status, and 'active' to 'Active'
    if (!passwordIsValid || user.status !== 'Active') {
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
        status: user.status, // FIXED
        passwordVersion: user.passwordVersion || 0,
        lastLoginAt: user.lastLoginAt
    };
}

async function changePassword(userId, currentPassword, newPassword) {
    if (
        typeof currentPassword !== 'string' ||
        currentPassword.length === 0 ||
        typeof newPassword !== 'string' ||
        newPassword.length === 0
    ) {
        throw new AppError(
            'Enter your current password and a new password.',
            400
        );
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
        throw new AppError(
            `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
            400
        );
    }

    if (newPassword.length > MAX_PASSWORD_LENGTH) {
        throw new AppError(
            `Your new password must be no more than ${MAX_PASSWORD_LENGTH} characters.`,
            400
        );
    }

    if (newPassword === currentPassword) {
        throw new AppError(
            'Choose a new password that differs from your current password.',
            400
        );
    }

    if (isCommonPassword(newPassword)) {
        throw new AppError(
            'That password is too common. Choose a different one.',
            400
        );
    }

    const user = await User.findById(userId).select('+passwordHash');

    if (!user) {
        throw new AppError('Your account could not be found.', 404);
    }

    const currentPasswordIsValid = await verifyPassword(
        currentPassword,
        user.passwordHash
    );

    if (!currentPasswordIsValid) {
        throw new AppError('Your current password is incorrect.', 400);
    }

    user.passwordHash = await hashPassword(newPassword);
    user.passwordVersion = (user.passwordVersion || 0) + 1;
    await user.save();

    return {
        id: user._id.toString(),
        username: user.username,
        role: user.role
    };
}

module.exports = {
    authenticateUser,
    changePassword
};