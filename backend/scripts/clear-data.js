require('dotenv').config();
const mongoose = require('mongoose');

// Import all the models
const LaboratoryRequest = require('../src/modules/lab-requests/laboratory-request.model');
const Specimen = require('../src/modules/specimens/specimen.model');
const Result = require('../src/modules/results/result.model');

async function clearData() {
    try {
        // SAFETY GUARD: never clear shared patient, user, or audit records.
        // Even lab transactional records require an explicit confirmation flag.
        if (process.argv[2] !== '--confirm-lab-transactional-reset') {
            throw new Error(
                'Refusing to clear data. Pass --confirm-lab-transactional-reset explicitly. Patients, users and audit logs are never cleared by this script.'
            );
        }

        const dbName = process.env.MONGODB_DB_NAME || 'medilink_lab_dev';
        await mongoose.connect(process.env.MONGODB_URI, { dbName: dbName });
        console.log(`Connected to database: ${dbName}...`);

        console.log('Patients are shared records and are NEVER deleted by this script.');

        console.log('Deleting all laboratory requests...');
        await LaboratoryRequest.deleteMany({});

        console.log('Deleting all specimens...');
        await Specimen.deleteMany({});

        console.log('Deleting all results...');
        await Result.deleteMany({});

        console.log('✅ Laboratory transactional data (Requests, Specimens, Results) has been deleted.');
        console.log('Note: Patients, Users and Audit Logs were never touched.');
        
        process.exit(0);

    } catch (error) {
        console.error('Error clearing data:', error);
        process.exit(1);
    }
}

clearData();