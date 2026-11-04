
const DEVELOPMENT_DATABASE_NAME = 'medilink_lab_dev';
const PRODUCTION_DATABASE_NAME = 'medilink_lab_prod';

// Return the database name for the current environment.
function getDatabaseName() {
    const environment = process.env.NODE_ENV || 'development';

    const configuredName = (
        process.env.MONGODB_DB_NAME || ''
    ).trim();

    // Production must explicitly use the production database.
    if (environment === 'production') {
        if (configuredName !== PRODUCTION_DATABASE_NAME) {
            throw new Error(
                'MONGODB_DB_NAME must be set to medilink_lab_prod in production.'
            );
        }

        return PRODUCTION_DATABASE_NAME;
    }

    // Prevent accidental production database usage locally.
    if (configuredName === PRODUCTION_DATABASE_NAME) {
        throw new Error(
            'The production database cannot be used outside production.'
        );
    }

    // Development defaults to the existing development database.
    return configuredName || DEVELOPMENT_DATABASE_NAME;
}

module.exports = getDatabaseName;
