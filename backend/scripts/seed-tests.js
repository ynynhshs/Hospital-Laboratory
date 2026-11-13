require('dotenv').config();
const mongoose = require('mongoose');
const TestCatalog = require('../src/modules/test-catalog/test-catalog.model');

async function seedTests() {
    try {
        const dbName = process.env.MONGODB_DB_NAME || 'medilink_lab_dev';
        await mongoose.connect(process.env.MONGODB_URI, { dbName: dbName });
        console.log(`Connected to database: ${dbName}...`);

        const tests = [
            {
                testCode: 'HEM-CBC-001',
                testName: 'Complete Blood Count (CBC)',
                category: 'Hematology',
                specimenType: 'EDTA Whole Blood',
                testingMethod: 'Automated Analyzer',
                turnaroundTime: '1 Day',
                active: true
            },
            {
                testCode: 'CLN-GLU-001',
                testName: 'Glucose Test',
                category: 'Clinical Chemistry',
                specimenType: 'Blood Serum',
                testingMethod: 'Enzymatic Colorimetric',
                turnaroundTime: '2 Hours',
                active: true
            }
        ];

        for (const test of tests) {
            // Check by testCode (which matches your model's schema)
            const exists = await TestCatalog.findOne({ testCode: test.testCode });
            if (!exists) {
                await TestCatalog.create(test);
                console.log(`✅ Added test: ${test.testName}`);
            } else {
                console.log(`⏭️ Test already exists: ${test.testName}`);
            }
        }

        console.log('🎉 Test catalog seeding complete!');
        process.exit(0);

    } catch (error) {
        console.error('Error seeding tests:', error);
        process.exit(1);
    }
}

seedTests();