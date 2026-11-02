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
        LAB_TEST_USERNAME,
        LAB_TEST_EMAIL,
        LAB_TEST_PASSWORD,
        LAB_TEST_FIRST_NAME,
        LAB_TEST_LAST_NAME
    } = process.env;

    // Check required environment variables.
    if (
        !LAB_TEST_USERNAME ||
        !LAB_TEST_EMAIL ||
        !LAB_TEST_PASSWORD ||
        !LAB_TEST_FIRST_NAME ||
        !LAB_TEST_LAST_NAME
    ) {
        throw new Error(
            'Missing test account information. Set all LAB_TEST environment variables.'
        );
    }

    try {
        await connectDB();

        // Create the test account using the existing account service.
        const user = await createUser({
            username: LAB_TEST_USERNAME,
            email: LAB_TEST_EMAIL,
            password: LAB_TEST_PASSWORD,
            firstName: LAB_TEST_FIRST_NAME,
            lastName: LAB_TEST_LAST_NAME,
            role: 'lab_technologist'
        });

        // Activate this development-only test account.
        user.accountStatus = 'active';
        await user.save();

        console.log('==========================================');
        console.log(' Development Test Account Created');
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
    console.error('Test account creation failed:', error.message);
    process.exitCode = 1;
});