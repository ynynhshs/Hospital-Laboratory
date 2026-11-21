const {
    authenticateUser,
    changePassword: updatePassword
} = require('./auth.service');
const { logActivity } = require('../audit-logs/audit-log.service');
const User = require('../core/user.model');

const SESSION_COOKIE_NAME = 'medilink.sid';

const INVALID_CREDENTIALS_MESSAGE =
    'Invalid username/email or password.';

// Convert a session callback operation into a Promise.
function runSessionOperation(operation) {
    return new Promise((resolve, reject) => {
        operation((error) => {
            if (error) {
                return reject(error);
            }
            resolve();
        });
    });
}

// Handle user login.
async function login(req, res, next) {
    try {
        const { identifier, password } = req.body || {};

        // Verify the user's credentials.
        const user = await authenticateUser(identifier, password);

        // ----------------------------------------------------
        // ADDED: Log the successful login to the database
        // ----------------------------------------------------
        await logActivity(
            user.username, 
            user.role, 
            'LOGIN', 
            'Authentication', 
            'User logged in successfully', 
            req.ip
        );

        // Regenerate the session ID after successful authentication.
        await runSessionOperation((callback) => {
            req.session.regenerate(callback);
        });

        // Store only the authenticated user's ID in the session.
        req.session.userId = user.id;
        req.session.passwordVersion = user.passwordVersion;

        // Save the new session before responding.
        await runSessionOperation((callback) => {
            req.session.save(callback);
        });

        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            data: {
                user
            }
        });

    } catch (error) {
        if (error.message === INVALID_CREDENTIALS_MESSAGE) {
            
            // ----------------------------------------------------
            // ADDED: Log the failed login attempt
            // ----------------------------------------------------
            await logActivity(
                req.body.identifier || 'Unknown', 
                'Unknown', 
                'LOGIN_FAILED', 
                'Authentication', 
                'Invalid credentials provided', 
                req.ip
            );

            return res.status(401).json({
                success: false,
                message: INVALID_CREDENTIALS_MESSAGE
            });
        }

        return next(error);
    }
}

async function changePassword(req, res, next) {
    try {
        const { currentPassword, newPassword } = req.body || {};
        const user = await updatePassword(
            req.user._id.toString(),
            currentPassword,
            newPassword
        );

        await logActivity(
            user.username,
            user.role,
            'PASSWORD_CHANGED',
            'Authentication',
            'User changed their password',
            req.ip
        );

        return res.status(200).json({
            success: true,
            message: 'Password updated. Please sign in again.',
            data: null
        });
    } catch (error) {
        return next(error);
    }
}

// Handle user logout.
async function logout(req, res, next) {
    // Record logout in the shared audit collection when the session identifies
    // a real account. Anonymous requests keep the existing 200 response.
    if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId)
                .select('username role')
                .lean();
            if (user) {
                await logActivity(
                    user.username,
                    user.role,
                    'LOGOUT',
                    'Authentication',
                    'User logged out',
                    req.ip
                );
            }
        } catch (error) {
            console.error('Failed to record logout:', error.message);
        }
    }

    if (!req.session) {
        res.clearCookie(SESSION_COOKIE_NAME, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        return res.status(200).json({
            success: true,
            message: 'Logout successful.'
        });
    }

    req.session.destroy((error) => {
        if (error) {
            return next(error);
        }

        res.clearCookie(SESSION_COOKIE_NAME, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        return res.status(200).json({
            success: true,
            message: 'Logout successful.'
        });
    });
}

// Return the currently authenticated user's information.
function getCurrentUser(req, res) {
    return res.status(200).json({
        success: true,
        message: 'Authenticated user retrieved successfully.',
        data: {
            user: req.user
        }
    });
}

module.exports = {
    login,
    changePassword,
    logout,
    getCurrentUser
};