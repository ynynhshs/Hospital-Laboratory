
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
        LAB_ADMIN_USERNAME,
        LAB_ADMIN_EMAIL,
        LAB_ADMIN_PASSWORD,
        LAB_ADMIN_FIRST_NAME,
        LAB_ADMIN_LAST_NAME
    } = process.env;

    // Check required environment variables.
    if (
        !LAB_ADMIN_USERNAME ||
        !LAB_ADMIN_EMAIL ||
        !LAB_ADMIN_PASSWORD ||
        !LAB_ADMIN_FIRST_NAME ||
        !LAB_ADMIN_LAST_NAME
    ) {
        throw new Error(
            'Missing administrator test account information. Set all LAB_ADMIN environment variables.'
        );
    }

    try {
        await connectDB();

        // Create the development administrator account.
        const user = await createUser({
            username: LAB_ADMIN_USERNAME,
            email: LAB_ADMIN_EMAIL,
            password: LAB_ADMIN_PASSWORD,
            firstName: LAB_ADMIN_FIRST_NAME,
            lastName: LAB_ADMIN_LAST_NAME,
            role: 'lab_admin'
        });

        // Activate the development administrator account.
        user.accountStatus = 'active';
        await user.save();

        console.log('==========================================');
        console.log(' Development Administrator Account Created');
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
        'Administrator account creation failed:',
        error.message
    );

    process.exitCode = 1;
});
