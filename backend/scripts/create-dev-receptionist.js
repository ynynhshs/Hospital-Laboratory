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
        LAB_RECEPTIONIST_USERNAME,
        LAB_RECEPTIONIST_EMAIL,
        LAB_RECEPTIONIST_PASSWORD,
        LAB_RECEPTIONIST_FIRST_NAME,
        LAB_RECEPTIONIST_LAST_NAME
    } = process.env;

    // Check required environment variables.
    if (
        !LAB_RECEPTIONIST_USERNAME ||
        !LAB_RECEPTIONIST_EMAIL ||
        !LAB_RECEPTIONIST_PASSWORD ||
        !LAB_RECEPTIONIST_FIRST_NAME ||
        !LAB_RECEPTIONIST_LAST_NAME
    ) {
        throw new Error(
            'Missing receptionist test account information. Set all LAB_RECEPTIONIST environment variables.'
        );
    }

    try {
        await connectDB();

        // Create the receptionist test account.
        const user = await createUser({
            username: LAB_RECEPTIONIST_USERNAME,
            email: LAB_RECEPTIONIST_EMAIL,
            password: LAB_RECEPTIONIST_PASSWORD,
            firstName: LAB_RECEPTIONIST_FIRST_NAME,
            lastName: LAB_RECEPTIONIST_LAST_NAME,
            role: 'lab_receptionist'
        });

        // Activate this development-only test account.
        user.accountStatus = 'active';
        await user.save();

        console.log('==========================================');
        console.log(' Development Receptionist Account Created');
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
        'Receptionist test account creation failed:',
        error.message
    );
    process.exitCode = 1;
});