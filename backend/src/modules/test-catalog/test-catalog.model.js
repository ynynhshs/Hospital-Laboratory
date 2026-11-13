const mongoose = require('mongoose');
const { Schema } = mongoose;

const testCatalogSchema = new Schema(
    {
        testCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true
        },
        testName: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            required: true,
            trim: true
        },
        specimenType: {
            type: String,
            required: true,
            trim: true
        },
        testingMethod: {
            type: String,
            required: true,
            trim: true
        },
        turnaroundTime: {
            type: String,
            required: true,
            trim: true
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active'
        }
    },
    {
        timestamps: true,
        collection: 'laboratory_tests'
    }
);

const TestCatalog = mongoose.models.TestCatalog || mongoose.model('TestCatalog', testCatalogSchema, 'laboratory_tests');
module.exports = TestCatalog;