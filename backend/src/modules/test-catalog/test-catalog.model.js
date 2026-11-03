
const mongoose = require('mongoose');

const { Schema } = mongoose;

// ==========================================
// MEDILINK LABORATORY
// LABORATORY TEST CATALOG MODEL
// ==========================================

const testCatalogSchema = new Schema(
    {
        // Unique laboratory test identifier.
        testCode: {
            type: String,
            required: [true, 'Test code is required.'],
            unique: true,
            trim: true,
            uppercase: true,
            maxlength: 30
        },

        // Name of the laboratory test.
        testName: {
            type: String,
            required: [true, 'Test name is required.'],
            trim: true,
            maxlength: 120
        },

        // Laboratory test category.
        category: {
            type: String,
            required: [true, 'Test category is required.'],
            enum: {
                values: [
                    'Hematology',
                    'Clinical Chemistry',
                    'Microbiology',
                    'Immunology',
                    'Urinalysis',
                    'Other'
                ],
                message: 'Invalid laboratory test category.'
            },
            trim: true
        },

        // Type of specimen required.
        specimenType: {
            type: String,
            required: [true, 'Specimen type is required.'],
            trim: true,
            maxlength: 80
        },

        // Laboratory testing method.
        testingMethod: {
            type: String,
            required: [true, 'Testing method is required.'],
            trim: true,
            maxlength: 100
        },

        // Expected turnaround time.
        turnaroundTime: {
            type: String,
            required: [true, 'Turnaround time is required.'],
            trim: true,
            maxlength: 50
        },

        // Laboratory test availability.
        status: {
            type: String,
            enum: {
                values: ['active', 'inactive'],
                message: 'Invalid laboratory test status.'
            },
            default: 'active',
            lowercase: true,
            trim: true
        }
    },
    {
        timestamps: true,
        collection: 'laboratory_tests',
        versionKey: false
    }
);

// ==========================================
// DATABASE INDEXES
// ==========================================

testCatalogSchema.index({
    category: 1,
    status: 1
});

// ==========================================
// CREATE OR REUSE MODEL
// ==========================================

const TestCatalog =
    mongoose.models.TestCatalog ||
    mongoose.model(
        'TestCatalog',
        testCatalogSchema,
        'laboratory_tests'
    );

module.exports = TestCatalog;
