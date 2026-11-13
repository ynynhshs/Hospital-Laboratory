const mongoose = require('mongoose');
const { Schema } = mongoose;

const resultSchema = new Schema(
    {
        requestId: {
            type: Schema.Types.ObjectId,
            ref: 'LaboratoryRequest',
            required: true
        },
        testId: {
            type: Schema.Types.ObjectId,
            required: true
        },
        testName: {
            type: String,
            required: true
        },
        patientId: {
            type: Schema.Types.ObjectId,
            ref: 'Patient',
            required: true
        },
        // Add the specimen reference so we can populate it!
        specimenId: {
            type: Schema.Types.ObjectId,
            ref: 'Specimen'
        },
        resultValue: {
            type: String,
            required: true,
            trim: true
        },
        unit: {
            type: String,
            trim: true
        },
        referenceRange: {
            type: String,
            trim: true
        },
        remarks: {
            type: String,
            trim: true
        },
        enteredBy: {
            type: Schema.Types.ObjectId,
            ref: 'User', // <-- FIXED: Changed from LabUser to User
            required: true
        },
        // Add the verification fields!
        verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User' // <-- FIXED: Changed from LabUser to User
        },
        verifiedAt: {
            type: Date
        },
        status: {
            type: String,
            enum: ['draft', 'pending_verification', 'verified', 'released'],
            default: 'pending_verification'
        }
    },
    {
        timestamps: true,
        collection: 'laboratory_results'
    }
);

const Result = mongoose.models.Result || mongoose.model('Result', resultSchema, 'laboratory_results');
module.exports = Result;