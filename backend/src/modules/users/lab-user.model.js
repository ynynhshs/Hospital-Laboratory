
const mongoose = require('mongoose');

const { Schema } = mongoose;

// =========================================
// 1. LABORATORY USER SCHEMA
// =========================================

const labUserSchema = new Schema(
    {
        // Unique account username.
        username: {
            type: String,
            required: [true, 'Username is required.'],
            unique: true,
            trim: true,
            lowercase: true,
            minlength: 3,
            maxlength: 40,
            match: [
                /^[a-z0-9._-]+$/,
                'Username may only contain letters, numbers, periods, underscores, and hyphens.'
            ]
        },

        // Unique email used for authentication.
        email: {
            type: String,
            required: [true, 'Email address is required.'],
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: 254,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                'Please provide a valid email address.'
            ]
        },

        // Stores only the Argon2id password hash.
        // Plain-text passwords must never be stored.
        passwordHash: {
            type: String,
            required: [true, 'Password hash is required.'],
            select: false
        },

        // User's first name.
        firstName: {
            type: String,
            required: [true, 'First name is required.'],
            trim: true,
            maxlength: 60
        },

        // User's last name.
        lastName: {
            type: String,
            required: [true, 'Last name is required.'],
            trim: true,
            maxlength: 60
        },

        // Defines the user's laboratory responsibilities.
        role: {
            type: String,
            required: [true, 'User role is required.'],
            enum: {
                values: [
                    'lab_admin',
                    'lab_receptionist',
                    'lab_technologist',
                    'result_verifier',
                    'requesting_clinician'
                ],
                message: 'Invalid laboratory user role.'
            }
        },

        // Controls whether the account may authenticate.
        // New accounts are inactive until explicitly activated.
        accountStatus: {
            type: String,
            enum: {
                values: ['active', 'inactive'],
                message: 'Invalid account status.'
            },
            default: 'inactive',
            required: true
        },

        // Records the user's most recent successful login.
        lastLoginAt: {
            type: Date,
            default: null
        },

        // Reserved for future MediLink user identity mapping.
        externalUserId: {
            type: String,
            trim: true,
            default: undefined,
            maxlength: 100
        }
    },
    {
        // Automatically manages createdAt and updatedAt.
        timestamps: true,

        // Use the planned collection name.
        collection: 'lab_users',

        // Do not expose the Mongoose version key.
        versionKey: false,

        // Extra protection when documents are converted to JSON.
        toJSON: {
            transform: (document, returnedObject) => {
                delete returnedObject.passwordHash;
                return returnedObject;
            }
        }
    }
);

// =========================================
// 2. DATABASE INDEXES
// =========================================

// Unique index for future external identity mapping.
labUserSchema.index(
    { externalUserId: 1 },
    {
        unique: true,
        sparse: true
    }
);

// =========================================
// 3. CREATE OR REUSE THE MODEL
// =========================================

const LabUser =
    mongoose.models.LabUser ||
    mongoose.model('LabUser', labUserSchema, 'lab_users');

// Export the model.
module.exports = LabUser;
