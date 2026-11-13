require('dotenv').config();
const mongoose = require('mongoose');

// Import all the models
const Patient = require('../src/modules/core/patient.model');
const LaboratoryRequest = require('../src/modules/lab-requests/laboratory-request.model');
const Specimen = require('../src/modules/specimens/specimen.model');
const Result = require('../src/modules/results/result.model');

async function clearData() {
    try {
        const dbName = process.env.MONGODB_DB_NAME || 'medilink_lab_dev';
        await mongoose.connect(process.env.MONGODB_URI, { dbName: dbName });
        console.log(`Connected to database: ${dbName}...`);

        console.log('Deleting all patients...');
        await Patient.deleteMany({});

        console.log('Deleting all laboratory requests...');
        await LaboratoryRequest.deleteMany({});

        console.log('Deleting all specimens...');
        await Specimen.deleteMany({});

        console.log('Deleting all results...');
        await Result.deleteMany({});

        console.log('✅ All transactional data (Patients, Requests, Specimens, Results) has been successfully deleted!');
        console.log('Note: Users and Test Catalog have been kept.');
        
        process.exit(0);

    } catch (error) {
        console.error('Error clearing data:', error);
        process.exit(1);
    }
}

clearData();