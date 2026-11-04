
const SHARED_DATABASE_NAME = 'medilink_lab_dev';

// Return the shared database name used by all MediLink subsystems.
function getDatabaseName() {
    const environment = process.env.NODE_ENV || 'development';

    const configuredName = (
        process.env.MONGODB_DB_NAME || ''
    ).trim();

    // Reject any database name that differs from the shared MediLink database.
    if (
        configuredName &&
        configuredName !== SHARED_DATABASE_NAME
    ) {
        throw new Error(
            `MONGODB_DB_NAME must be ${SHARED_DATABASE_NAME} to use the shared MediLink database.`
        );
    }

    // Production must explicitly configure the shared database.
    if (
        environment === 'production' &&
        configuredName !== SHARED_DATABASE_NAME
    ) {
        throw new Error(
            `MONGODB_DB_NAME must be explicitly set to ${SHARED_DATABASE_NAME} in production.`
        );
    }

    return SHARED_DATABASE_NAME;
}

module.exports = getDatabaseName;
