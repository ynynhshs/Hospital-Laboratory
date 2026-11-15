
const express = require('express');
const { rateLimit } = require('express-rate-limit');

const {
    login,
    changePassword,
    logout,
    getCurrentUser
} = require('./auth.controller');

const {
    requireAuth
} = require('../../middleware/auth.middleware');

const router = express.Router();

// Limit failed login attempts by IP address.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
        success: false,
        message: 'Too many login attempts. Please try again later.'
    }
});

const passwordChangeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many password change attempts. Please try again later.'
    }
});

// Authentication endpoints.
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.put('/password', passwordChangeLimiter, requireAuth, changePassword);

// Return the currently authenticated user.
router.get('/me', requireAuth, getCurrentUser);

module.exports = router;
