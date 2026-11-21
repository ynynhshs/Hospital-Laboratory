// Read-only inspection of the shared MediLink database.
// This script NEVER writes, updates, or deletes any document.
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../src/config/database');
const User = require('../src/modules/core/user.model');
const Patient = require('../src/modules/core/patient.model');
const AuditLog = require('../src/modules/core/auditlog.model');

const TARGET_USERNAMES = [
    'labtechnician_test',
    'labreceptionist_test',
    'labadmin_dev',
    'labclinician_dev'
];

async function main() {
    if (process.env.NODE_ENV !== 'development') {
        throw new Error('This script can only run in development mode.');
    }

    await connectDB();
    const db = mongoose.connection.db;

    const collectionNames = (await db.listCollections().toArray())
        .map((c) => c.name)
        .sort();

    console.log('==========================================');
    console.log(' SHARED DATABASE INSPECTION (READ ONLY)');
    console.log('==========================================');
    console.log(`Database: ${db.databaseName}`);
    console.log(`Collections: ${collectionNames.join(', ')}`);

    for (const name of ['users', 'patients', 'auditlogs']) {
        console.log(`${name} count: ${await db.collection(name).countDocuments()}`);
    }

    const forbidden = collectionNames.filter((name) =>
        /^(lab_users|lab_patients|lab_auditlogs|laboratory_auditlogs|lab_audit_logs)$/.test(name)
    );
    console.log(`Forbidden duplicate collections: ${forbidden.length ? forbidden.join(', ') : 'none'}`);

    console.log('---- Target account existence ----');
    for (const username of TARGET_USERNAMES) {
        const user = await User.findOne({ username }).lean();
        if (user) {
            console.log(
                `${username}: EXISTS | employeeId=${user.employeeId} | role=${user.role} | status=${user.status} | createdAt=${user.createdAt}`
            );
        } else {
            console.log(`${username}: ABSENT`);
        }
    }

    console.log('---- Sample shared patient (no sensitive fields) ----');
    const samplePatient = await Patient.findOne({})
        .select('patientId firstName lastName createdAt')
        .lean();
    console.log(samplePatient ? JSON.stringify(samplePatient) : 'No patients found');

    console.log('---- Recent audit activity for the four accounts ----');
    const recentAudit = await AuditLog.find({
        username: { $in: TARGET_USERNAMES }
    })
        .select('username role action module createdAt')
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();
    recentAudit.forEach((entry) => {
        console.log(
            `${entry.createdAt.toISOString()} | ${entry.username} | ${entry.role} | ${entry.action} | ${entry.module}`
        );
    });

    console.log('---- Sample shared audit log ----');
    const sampleAudit = await AuditLog.findOne({})
        .select('username role action module createdAt')
        .lean();
    console.log(sampleAudit ? JSON.stringify(sampleAudit) : 'No audit logs found');

    console.log('---- Shared patient field names (schema discovery) ----');
    const patientDocs = await Patient.find({}).limit(3).lean();
    patientDocs.forEach((doc, index) => {
        console.log(`patient[${index}] fields: ${Object.keys(doc).sort().join(', ')}`);
    });

    console.log('---- Existing employee IDs and roles (no hashes) ----');
    const existingUsers = await User.find({})
        .select('username employeeId role status')
        .sort({ employeeId: 1 })
        .lean();
    existingUsers.forEach((u) => {
        console.log(
            `${u.username} | ${u.employeeId || '(none)'} | ${u.role} | ${u.status}`
        );
    });

    console.log('---- Target emails already in use? ----');
    const TARGET_EMAILS = [
        'labtechnician_test@example.com',
        'labreceptionist_test@example.com',
        'labadmin_dev@example.com',
        'labclinician_dev@example.com'
    ];
    for (const email of TARGET_EMAILS) {
        const found = await User.findOne({ email: email.toLowerCase() }).select('username').lean();
        console.log(`${email}: ${found ? `USED by ${found.username}` : 'FREE'}`);
    }

    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error('Inspection failed:', error.message);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    process.exitCode = 1;
});
