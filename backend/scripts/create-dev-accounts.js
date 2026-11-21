// Create the four development laboratory accounts in the SHARED users collection.
// INSERT-ONLY: this script never updates or deletes any existing document.
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../src/config/database');
const User = require('../src/modules/core/user.model');
const { hashPassword } = require('../src/shared/utils/password');
const { logActivity } = require('../src/modules/audit-logs/audit-log.service');

const ACCOUNT_SPECS = [
    {
        envPrefix: 'LAB_TEST',
        username: 'labtechnician_test',
        role: 'lab_technologist',
        employeeId: 'LAB-TECH-0001'
    },
    {
        envPrefix: 'LAB_RECEPTIONIST',
        username: 'labreceptionist_test',
        role: 'lab_receptionist',
        employeeId: 'LAB-RECEP-0001'
    },
    {
        envPrefix: 'LAB_ADMIN',
        username: 'labadmin_dev',
        role: 'lab_admin',
        employeeId: 'LAB-ADMIN-0001'
    },
    {
        envPrefix: 'LAB_CLINICIAN',
        username: 'labclinician_dev',
        role: 'requesting_clinician',
        employeeId: 'LAB-CLIN-0001'
    }
];

function readAccountValues(spec) {
    const values = {
        username: process.env[`${spec.envPrefix}_USERNAME`],
        email: process.env[`${spec.envPrefix}_EMAIL`],
        password: process.env[`${spec.envPrefix}_PASSWORD`],
        firstName: process.env[`${spec.envPrefix}_FIRST_NAME`],
        lastName: process.env[`${spec.envPrefix}_LAST_NAME`]
    };

    for (const [key, value] of Object.entries(values)) {
        if (!value || !value.trim()) {
            throw new Error(`Missing ${spec.envPrefix}_${key} in .env`);
        }
    }

    // The exact requested usernames are the source of truth, not the .env values.
    values.username = spec.username;

    return values;
}

async function main() {
    if (process.env.NODE_ENV !== 'development') {
        throw new Error('This script can only run in development mode.');
    }

    await connectDB();

    console.log('==========================================');
    console.log(' SHARED USER ACCOUNT CREATION (INSERT ONLY)');
    console.log('==========================================');

    const created = [];

    for (const spec of ACCOUNT_SPECS) {
        const values = readAccountValues(spec);
        const username = values.username.toLowerCase();
        const email = values.email.trim().toLowerCase();

        // Step 2: verify the exact username does not already exist.
        const usernameMatch = await User.findOne({ username }).lean();
        if (usernameMatch) {
            console.log(`${username}: SKIPPED (username already exists, left unchanged)`);
            continue;
        }

        // Never create a duplicate email or employee ID belonging to someone else.
        const conflict = await User.findOne({
            $or: [{ email }, { employeeId: spec.employeeId }]
        }).lean();

        if (conflict) {
            throw new Error(
                `Cannot create ${username}: email or employee ID is already used by ${conflict.username || 'another account'}.`
            );
        }

        const passwordHash = await hashPassword(values.password);

        const user = await User.create({
            employeeId: spec.employeeId,
            firstName: values.firstName.trim(),
            lastName: values.lastName.trim(),
            username,
            email,
            passwordHash,
            passwordVersion: 0,
            role: spec.role,
            status: 'Active'
        });

        created.push(user);

        console.log(
            `${user.username}: CREATED | employeeId=${user.employeeId} | role=${user.role} | status=${user.status} | createdAt=${user.createdAt.toISOString()}`
        );
        // The password hash and password are never printed.
    }

    if (created.length > 0) {
        await logActivity(
            'system',
            'system',
            'CREATE_USER',
            'User Management',
            `Created development accounts: ${created.map((u) => u.username).join(', ')}`,
            '127.0.0.1'
        );
    }

    console.log(`Accounts created this run: ${created.length}`);
    console.log('Existing accounts were not modified.');

    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error('Account creation failed:', error.message);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    process.exitCode = 1;
});
