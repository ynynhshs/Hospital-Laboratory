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

// Preserves the test information when the
// laboratory catalog is updated in the future.

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
        // Reference to the existing laboratory_tests document.
        test: {
            type: Schema.Types.ObjectId,
            ref: 'TestCatalog',
            required: true
        },

        // Historical information about the selected test.
        testSnapshot: {
            type: testSnapshotSchema,
            required: true
        },

        // Individual processing status of this test.
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

        // Reference to the user responsible for the activity.
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User', // <-- FIXED: Changed from LabUser to User
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
        // Unique laboratory request number.
        requestNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true
        },

        // Reference to the existing Patient document.
        patient: {
            type: Schema.Types.ObjectId,
            ref: 'Patient',
            required: true
        },

        // User who requested the laboratory examination.
        requestedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User', // <-- FIXED: Changed from LabUser to User
            required: true
        },

        // User who created the request in the system.
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User', // <-- FIXED: Changed from LabUser to User
            required: true
        },

        // User who last updated the request.
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User', // <-- FIXED: Changed from LabUser to User
            default: null
        },

        // Priority of the laboratory request.
        priority: {
            type: String,
            enum: REQUEST_PRIORITIES,
            default: 'routine',
            required: true
        },

        // Additional clinical information.
        clinicalNotes: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: ''
        },

        // Overall laboratory request status.
        status: {
            type: String,
            enum: REQUEST_STATUSES,
            default: 'draft',
            required: true
        },

        // Laboratory tests included in this request.
        tests: {
            type: [requestedTestSchema],
            default: []
        },

        // Request-specific activity history.
        activities: {
            type: [requestActivitySchema],
            default: []
        },

        // Important request workflow timestamps.
        submittedAt: {
            type: Date,
            default: null
        },

        acceptedAt: {
            type: Date,
            default: null
        },

        startedAt: {
            type: Date,
            default: null
        },

        completedAt: {
            type: Date,
            default: null
        },

        cancelledAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,
        collection: 'laboratory_requests'
    }
);

// ==========================================
// 6. DATABASE INDEXES
// ==========================================

// Improve searching by patient and request date.
laboratoryRequestSchema.index({
    patient: 1,
    createdAt: -1
});

// Improve filtering by request status.
laboratoryRequestSchema.index({
    status: 1,
    createdAt: -1
});

// Improve searching by requesting user.
laboratoryRequestSchema.index({
    requestedBy: 1,
    createdAt: -1
});

// ==========================================
// 7. CREATE MONGOOSE MODEL
// ==========================================

const LaboratoryRequest =
    mongoose.models.LaboratoryRequest ||
    mongoose.model(
        'LaboratoryRequest',
        laboratoryRequestSchema,
        'laboratory_requests'
    );

// ==========================================
// 8. EXPORT MODEL AND CONSTANTS
// ==========================================

module.exports = LaboratoryRequest;

module.exports.REQUEST_STATUSES = REQUEST_STATUSES;
module.exports.REQUEST_PRIORITIES = REQUEST_PRIORITIES;
module.exports.TEST_CATEGORIES = TEST_CATEGORIES;
module.exports.TEST_ITEM_STATUSES = TEST_ITEM_STATUSES;
module.exports.REQUEST_ACTIVITY_ACTIONS = REQUEST_ACTIVITY_ACTIONS;