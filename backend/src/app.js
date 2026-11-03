
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

// Import MongoDB-backed session middleware.
const sessionMiddleware = require('./config/session');
const authRoutes = require('./modules/auth/auth.routes');
const patientRoutes = require('./modules/patients/patient.routes');

const app = express();

// Hide the Express technology header.
app.disable('x-powered-by');

// Apply security-related HTTP headers.
app.use(helmet());

// Allow the API to receive JSON request bodies.
app.use(express.json({ limit: '1mb' }));

// Allow URL-encoded form submissions.
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Limit repeated API requests.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please try again later.'
    }
});

app.use('/api/', apiLimiter);

// Register MongoDB-backed session middleware.
// This must run before routes that use authentication.
app.use(sessionMiddleware);

// Register authentication API routes.
app.use('/api/v1/auth', authRoutes);


// Register patient API routes.
app.use('/api/v1/patients', patientRoutes);


// Initial API health-check endpoint.
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'MediLink Laboratory API is running.',
        data: {
            status: 'ok',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        }
    });
});

// Handle requests to endpoints that do not exist.
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found.'
    });
});

// Centralized error handling.
app.use((err, req, res, next) => {
    console.error(err);

    const statusCode = err.status || err.statusCode || 500;

    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error.'
        : err.message || 'Unexpected server error.';

    res.status(statusCode).json({
        success: false,
        message
    });
});

module.exports = app;
