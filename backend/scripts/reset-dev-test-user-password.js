
require('dotenv').config();

const mongoose = require('mongoose');

const connectDB = require('../src/config/database');
const LabUser = require('../src/modules/users/lab-user.model');
const { hashPassword } = require('../src/shared/utils/password');

async function main() {
    if (process.env.NODE_ENV !== 'development') {
        throw new Error('This script can only run in development mode.');
    }

    const {
        LAB_TEST_USERNAME,
        LAB_TEST_PASSWORD
    } = process.env;

    if (!LAB_TEST_USERNAME || !LAB_TEST_PASSWORD) {
        throw new Error('Missing test username or password in .env.');
    }

    try {
        await connectDB();

        const user = await LabUser.findOne({
            username: LAB_TEST_USERNAME.trim().toLowerCase()
        });

        if (!user) {
            throw new Error('Development test account was not found.');
        }

        user.passwordHash = await hashPassword(LAB_TEST_PASSWORD);
        user.accountStatus = 'active';

        await user.save();

        console.log('==========================================');
        console.log(' Development Test Account Updated');
        console.log('==========================================');
        console.log(`Username: ${user.username}`);
        console.log(`Role: ${user.role}`);
        console.log(`Account Status: ${user.accountStatus}`);
        console.log('Password: Updated using Argon2id');
        console.log('==========================================');

    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
}

main().catch((error) => {
    console.error('Test account update failed:', error.message);
    process.exitCode = 1;
});
