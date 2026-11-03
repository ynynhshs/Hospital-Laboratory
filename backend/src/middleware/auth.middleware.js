
const LabUser = require('../modules/users/lab-user.model');

// =========================================
// 1. AUTHENTICATION MIDDLEWARE
// =========================================

// Verify that the request has a valid authenticated session.
async function requireAuth(req, res, next) {
    try {
        // Check whether the session contains an authenticated user ID.
        if (!req.session || !req.session.userId) {

    // Redirect protected frontend pages to the login page.
    if (req.authRedirect) {
        return res.redirect(req.authRedirect);
    }

    // Keep the existing JSON response for API requests.
    return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
    });
}

        // Retrieve the user from MongoDB using the session user ID.
        const user = await LabUser.findById(req.session.userId)
            .select(
                '_id username email firstName lastName role accountStatus'
            );

        // Reject missing or inactive accounts.
        if (!user || user.accountStatus !== 'active') {

    // Redirect protected frontend pages to the login page.
    if (req.authRedirect) {
        return res.redirect(req.authRedirect);
    }

    // Keep the existing JSON response for API requests.
    return res.status(401).json({
        success: false,
        message: 'Your session is no longer valid. Please log in again.'
    });
}

        // Attach safe user information to the request.
        req.user = {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            accountStatus: user.accountStatus
        };

        // Continue to the next middleware or route handler.
        return next();

    } catch (error) {
        return next(error);
    }
}

// =========================================
// 2. ROLE-BASED AUTHORIZATION MIDDLEWARE
// =========================================

// Restrict access to users with specified roles.
function authorizeRoles(...allowedRoles) {
    return function (req, res, next) {

        // A user must be authenticated first.
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please log in.'
            });
        }

        // Check whether the user's role is permitted.
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to access this resource.'
            });
        }

        return next();
    };
}

// =========================================
// 3. EXPORT MIDDLEWARE FUNCTIONS
// =========================================

module.exports = {
    requireAuth,
    authorizeRoles
};
