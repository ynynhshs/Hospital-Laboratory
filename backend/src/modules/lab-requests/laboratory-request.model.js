const mongoose = require('mongoose');

const { Schema } = mongoose;

// ==========================================
// MEDILINK LABORATORY
// LABORATORY REQUEST MODEL
// ==========================================

// ==========================================
// 1. ALLOWED REQUEST VALUES
// ==========================================

const REQUEST_STATUSES = [
    'draft',
    'submitted',
    'accepted',
    'in_progress',
    'partially_completed',
    'completed',
    'cancelled'
];

const REQUEST_PRIORITIES = [
    'routine',
    'urgent',
    'stat'
];

const TEST_CATEGORIES = [
    'Hematology',
    'Clinical Chemistry',
    'Microbiology',
    'Immunology',
    'Urinalysis',
    'Other'
];

const TEST_ITEM_STATUSES = [
    'pending',
    'in_progress',
    'completed',
    'cancelled'
];

const REQUEST_ACTIVITY_ACTIONS = [
    'created',
    'updated',
    'submitted',
    'accepted',
    'processing_started',
    'test_status_updated',
    'partially_completed',
    'completed',
    'cancelled'
];

// ==========================================
// 2. LABORATORY TEST SNAPSHOT SCHEMA
// ==========================================

const testSnapshotSchema = new Schema(
    {
        testCode: {
            type: String,
            required: true,
            trim: true
        },

        testName: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            required: true,
            enum: TEST_CATEGORIES
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
        
        // ADDED THESE TWO FIELDS
        unit: {
            type: String,
            trim: true
        },

        referenceRange: {
            type: String,
            trim: true
        }
    },
    {
        _id: false
    }
);

// ==========================================
// 3. REQUESTED TEST SUBDOCUMENT
// ==========================================

const requestedTestSchema = new Schema(
    {
        test: {
            type: Schema.Types.ObjectId,
            ref: 'TestCatalog',
            required: true
        },

        testSnapshot: {
            type: testSnapshotSchema,
            required: true
        },

        status: {
            type: String,
            enum: TEST_ITEM_STATUSES,
            default: 'pending',
            required: true
        }
    }
);

// ==========================================
// 4. REQUEST ACTIVITY SUBDOCUMENT
// ==========================================

const requestActivitySchema = new Schema(
    {
        action: {
            type: String,
            enum: REQUEST_ACTIVITY_ACTIONS,
            required: true
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },

        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        performedAt: {
            type: Date,
            default: Date.now,
            required: true
        }
    }
);

// ==========================================
// 5. LABORATORY REQUEST MAIN SCHEMA
// ==========================================

const laboratoryRequestSchema = new Schema(
    {
        requestNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true
        },

        patient: {
            type: Schema.Types.ObjectId,
            ref: 'Patient',
            required: true
        },

        requestedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },

        priority: {
            type: String,
            enum: REQUEST_PRIORITIES,
            default: 'routine',
            required: true
        },

        clinicalNotes: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: ''
        },

        status: {
            type: String,
            enum: REQUEST_STATUSES,
            default: 'draft',
            required: true
        },

        tests: {
            type: [requestedTestSchema],
            default: []
        },

        activities: {
            type: [requestActivitySchema],
            default: []
        },

        submittedAt: { type: Date, default: null },
        acceptedAt: { type: Date, default: null },
        startedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null }
    },
    {
        timestamps: true,
        collection: 'laboratory_requests'
    }
);

// ==========================================
// 6. DATABASE INDEXES
// ==========================================

laboratoryRequestSchema.index({ patient: 1, createdAt: -1 });
laboratoryRequestSchema.index({ status: 1, createdAt: -1 });
laboratoryRequestSchema.index({ requestedBy: 1, createdAt: -1 });

// ==========================================
// 7. CREATE MONGOOSE MODEL
// ==========================================

const LaboratoryRequest =
    mongoose.models.LaboratoryRequest ||
    mongoose.model('LaboratoryRequest', laboratoryRequestSchema, 'laboratory_requests');

module.exports = LaboratoryRequest;
module.exports.REQUEST_STATUSES = REQUEST_STATUSES;
module.exports.REQUEST_PRIORITIES = REQUEST_PRIORITIES;
module.exports.TEST_CATEGORIES = TEST_CATEGORIES;
module.exports.TEST_ITEM_STATUSES = TEST_ITEM_STATUSES;
module.exports.REQUEST_ACTIVITY_ACTIONS = REQUEST_ACTIVITY_ACTIONS;