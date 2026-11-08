const mongoose = require('mongoose');
const { Schema } = mongoose;

const specimenSchema = new Schema(
    {
        specimenCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true
        },
        requestId: {
            type: Schema.Types.ObjectId,
            ref: 'LaboratoryRequest',
            required: true
        },
        specimenType: {
            type: String,
            required: true,
            trim: true
        },
        status: {
            type: String,
            enum: ['pending', 'collected', 'received', 'accepted', 'rejected'],
            default: 'pending'
        },
        collectedBy: {
            type: Schema.Types.ObjectId,
            ref: 'LabUser'
        },
        collectedAt: {
            type: Date
        },
        receivedAt: {
            type: Date
        },
        notes: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true,
        collection: 'laboratory_specimens'
    }
);

const Specimen = mongoose.models.Specimen || mongoose.model('Specimen', specimenSchema, 'laboratory_specimens');
module.exports = Specimen;