
require('dotenv').config();

const mongoose = require('mongoose');

const connectDB = require('../src/config/database');
const { createUser } = require('../src/modules/users/lab-user.service');

async function main() {

    // Prevent accidental execution outside development.
    if (process.env.NODE_ENV !== 'development') {
        throw new Error(
            'This script can only run in development mode.'
        );
    }

    const {
        LAB_CLINICIAN_USERNAME,
        LAB_CLINICIAN_EMAIL,
        LAB_CLINICIAN_PASSWORD,
        LAB_CLINICIAN_FIRST_NAME,
        LAB_CLINICIAN_LAST_NAME
    } = process.env;

    // Check required environment variables.
    if (
        !LAB_CLINICIAN_USERNAME ||
        !LAB_CLINICIAN_EMAIL ||
        !LAB_CLINICIAN_PASSWORD ||
        !LAB_CLINICIAN_FIRST_NAME ||
        !LAB_CLINICIAN_LAST_NAME
    ) {
        throw new Error(
            'Missing clinician test account information. Set all LAB_CLINICIAN environment variables.'
        );
    }

    try {
        // Connect to the existing development database.
        await connectDB();

        // Create the clinician using the existing account service.
        const user = await createUser({
            username: LAB_CLINICIAN_USERNAME,
            email: LAB_CLINICIAN_EMAIL,
            password: LAB_CLINICIAN_PASSWORD,
            firstName: LAB_CLINICIAN_FIRST_NAME,
            lastName: LAB_CLINICIAN_LAST_NAME,
            role: 'requesting_clinician'
        });

        // Activate this development-only clinician account.
        user.accountStatus = 'active';
        await user.save();

        console.log('==========================================');
        console.log(' Development Clinician Account Created');
        console.log('==========================================');
        console.log(`Username: ${user.username}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Account Status: ${user.accountStatus}`);
        console.log('Password: Securely hashed using Argon2id');
        console.log('==========================================');

    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
}

main().catch((error) => {
    console.error(
        'Clinician test account creation failed:',
        error.message
    );

    process.exitCode = 1;
});
