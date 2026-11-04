
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

// Import MongoDB-backed session middleware.
const sessionMiddleware = require('./config/session');
const authRoutes = require('./modules/auth/auth.routes');
const patientRoutes = require('./modules/patients/patient.routes');
const testCatalogRoutes = require('./modules/test-catalog/test-catalog.routes');
const { requireAuth } = require('./middleware/auth.middleware');
const app = express();

// Trust Render's reverse proxy in production.
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}


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



// Register laboratory test catalog API routes.
app.use('/api/v1/test-catalog', testCatalogRoutes);

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

// Frontend directory.
const frontendPath = path.resolve(__dirname, '../../frontend');



// Protect all MediLink application pages.
app.use('/pages', (req, res, next) => {

    // Allow users to access the login page without authentication.
    if (req.path === '/login.html') {
        return next();
    }

    // Redirect unauthenticated users to the login page.
    req.authRedirect = '/pages/login.html';

    return requireAuth(req, res, next);
});

// Serve the MediLink frontend files.
app.use(express.static(frontendPath));

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

    const isProduction = process.env.NODE_ENV === 'production';

    let statusCode = err.statusCode || err.status || 500;
    let message;

    // Handle Mongoose validation errors.
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = isProduction
            ? 'Validation failed.'
            : err.message;
    }

    // Handle MongoDB duplicate-key errors.
    else if (err.code === 11000) {
        statusCode = 409;
        message = isProduction
            ? 'A record with this information already exists.'
            : err.message;
    }

    // Handle invalid MongoDB values.
    else if (err.name === 'CastError') {
        statusCode = 400;
        message = isProduction
            ? 'Invalid value provided.'
            : err.message;
    }

    // Handle expected application errors.
    else if (err.isOperational === true) {
        message = err.message;
    }

    // Handle unexpected server errors.
    else {
        statusCode = 500;
        message = isProduction
            ? 'Internal server error.'
            : err.message || 'Unexpected server error.';
    }

    res.status(statusCode).json({
        success: false,
        message
    });
});

module.exports = app;
