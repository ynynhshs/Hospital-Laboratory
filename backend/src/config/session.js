
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const getDatabaseName = require('./database-name');

// =========================================
// 1. SESSION SECRET VALIDATION
// =========================================

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret || sessionSecret.trim().length < 32) {
    throw new Error(
        'SESSION_SECRET is missing or too short. Configure a strong secret in the environment.'
    );
}

// Get the database name for the current environment.
const databaseName = getDatabaseName();

// =========================================
// 2. REUSE THE EXISTING MONGOOSE CONNECTION
// =========================================

const clientPromise = mongoose.connection
    .asPromise()
    .then((connection) => connection.getClient());

// =========================================
// 3. MONGODB SESSION STORE
// =========================================

const sessionStore = MongoStore.create({
    clientPromise,
    dbName: databaseName,
    collectionName: 'lab_sessions',

    // Eight-hour session lifetime.
    ttl: 8 * 60 * 60,

    // Let MongoDB automatically remove expired sessions.
    autoRemove: 'native'
});

// =========================================
// 4. EXPRESS SESSION CONFIGURATION
// =========================================

const sessionMiddleware = session({
    name: 'medilink.sid',

    secret: sessionSecret,

    store: sessionStore,

    resave: false,
    saveUninitialized: false,
    rolling: true,

    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000
    }
});

// Export the configured session middleware.
module.exports = sessionMiddleware;
