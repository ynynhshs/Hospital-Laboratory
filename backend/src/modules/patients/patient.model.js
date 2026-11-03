
const mongoose = require('mongoose');

const { Schema } = mongoose;

// =========================================
// 1. PATIENT SCHEMA
// =========================================

const patientSchema = new Schema(
    {
        // Unique identifier assigned to each patient.
        patientCode: {
            type: String,
            required: [true, 'Patient code is required.'],
            unique: true,
            trim: true,
            uppercase: true,
            maxlength: 30
        },

        // Patient's first name.
        firstName: {
            type: String,
            required: [true, 'First name is required.'],
            trim: true,
            maxlength: 60
        },

        // Patient's middle name.
        middleName: {
            type: String,
            trim: true,
            default: undefined,
            maxlength: 60
        },

        // Patient's last name.
        lastName: {
            type: String,
            required: [true, 'Last name is required.'],
            trim: true,
            maxlength: 60
        },

        // Optional name suffix.
        suffix: {
            type: String,
            trim: true,
            default: undefined,
            maxlength: 15
        },

        // Patient's date of birth.
        dateOfBirth: {
            type: Date,
            required: [true, 'Date of birth is required.'],
            validate: {
                validator: function (value) {
                    return value <= new Date();
                },
                message: 'Date of birth cannot be in the future.'
            }
        },

        // Patient's recorded sex.
        sex: {
            type: String,
            required: [true, 'Patient sex is required.'],
            enum: {
                values: [
                    'male',
                    'female',
                    'other',
                    'unknown'
                ],
                message: 'Invalid patient sex.'
            },
            lowercase: true,
            trim: true
        },

        // Patient's contact number.
        contactNumber: {
            type: String,
            trim: true,
            default: undefined,
            maxlength: 25
        }
    },
    {
        // Automatically manages createdAt and updatedAt.
        timestamps: true,

        // Use the planned MongoDB collection name.
        collection: 'patients',

        // Do not expose the Mongoose version key.
        versionKey: false,

        // Include the fullName virtual in JSON responses.
        toJSON: {
            virtuals: true
        },

        toObject: {
            virtuals: true
        }
    }
);

// =========================================
// 2. VIRTUAL PATIENT FULL NAME
// =========================================

patientSchema.virtual('fullName').get(function () {
    return [
        this.firstName,
        this.middleName,
        this.lastName,
        this.suffix
    ]
        .filter(Boolean)
        .join(' ');
});

// =========================================
// 3. DATABASE INDEXES
// =========================================

// Supports patient searches using name and birth date.
patientSchema.index({
    lastName: 1,
    firstName: 1,
    dateOfBirth: 1
});

// =========================================
// 4. CREATE OR REUSE THE MODEL
// =========================================

const Patient =
    mongoose.models.Patient ||
    mongoose.model('Patient', patientSchema, 'patients');

// Export the model.
module.exports = Patient;
