const User = require('../modules/core/user.model');

// Middleware to ensure the user is authenticated
async function requireAuth(req, res, next) {
    try {
        // Check if session exists and has a userId
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Please log in.'
            });
        }

        // Find the user using the new unified User model
        const user = await User.findById(req.session.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User account no longer exists.'
            });
        }

        // Check if account is active
        if (user.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'Your account is not active.'
            });
        }

        // Attach user to the request object
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during authentication.'
        });
    }
}

// Middleware to check if user has a specific role
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden. You do not have permission to perform this action.'
            });
        }

        next();
    };
}

module.exports = {
    requireAuth,
    authorizeRoles
};