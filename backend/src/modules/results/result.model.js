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
            ref: 'User',
            required: true
        },
        verifiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        verifiedAt: {
            type: Date
        },
        // ADDED: To store the reason for returning
        verificationRemarks: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            // ADDED: 'returned_for_correction' to the list
            enum: ['draft', 'pending_verification', 'verified', 'released', 'returned_for_correction'],
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