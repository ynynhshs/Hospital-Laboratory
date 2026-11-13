
const {
    createDraftRequest,
    searchLaboratoryRequests,
    getLaboratoryRequestById,
    updateDraftRequest,
    submitLaboratoryRequest
} = require('./laboratory-request.service');

const LaboratoryRequest = require('./laboratory-request.model');
const { logActivity } = require('../audit-logs/audit-log.service');

// ==========================================
// MEDILINK LABORATORY
// LABORATORY REQUEST CONTROLLER
// ==========================================

// ==========================================
// 1. CREATE LABORATORY REQUEST DRAFT
// ==========================================

async function createDraftRequestController(req, res, next) {
    try {
        const laboratoryRequest = await createDraftRequest(
            req.body,
            req.user
        );

        await logActivity(req.user.username, req.user.role, 'CREATE_REQUEST', 'Laboratory Requests', `Created lab request ${laboratoryRequest.requestNumber}`, req.ip)

        return res.status(201).json({
            success: true,
            message: 'Laboratory request draft created successfully.',
            data: {
                laboratoryRequest
            }
        });

    } catch (error) {
        return next(error);
    }
}

// ==========================================
// 2. GET AND SEARCH LABORATORY REQUESTS
// ==========================================

async function getLaboratoryRequestsController(req, res, next) {
    try {
        const result = await searchLaboratoryRequests(
            req.query,
            req.user
        );

        return res.status(200).json({
            success: true,
            message: 'Laboratory requests retrieved successfully.',
            data: {
                requests: result.requests,
                pagination: result.pagination
            }
        });

    } catch (error) {
        return next(error);
    }
}

// ==========================================
// 3. GET LABORATORY REQUEST BY ID
// ==========================================

async function getLaboratoryRequestByIdController(req, res, next) {
    try {
        const laboratoryRequest = await getLaboratoryRequestById(
            req.params.requestId,
            req.user
        );

        return res.status(200).json({
            success: true,
            message: 'Laboratory request retrieved successfully.',
            data: {
                laboratoryRequest
            }
        });

    } catch (error) {
        return next(error);
    }
}

// ==========================================
// 4. UPDATE LABORATORY REQUEST DRAFT
// ==========================================

async function updateDraftRequestController(req, res, next) {
    try {
        const laboratoryRequest = await updateDraftRequest(
            req.params.requestId,
            req.body,
            req.user
        );

        return res.status(200).json({
            success: true,
            message: 'Laboratory request draft updated successfully.',
            data: {
                laboratoryRequest
            }
        });

    } catch (error) {
        return next(error);
    }
}

// ==========================================
// 5. SUBMIT LABORATORY REQUEST
// ==========================================

async function submitLaboratoryRequestController(req, res, next) {
    try {
        const laboratoryRequest = await submitLaboratoryRequest(
            req.params.requestId,
            req.user
        );

        await logActivity(req.user.username, req.user.role, 'SUBMIT_REQUEST', 'Laboratory Requests', `Submitted lab request ${laboratoryRequest.requestNumber}`, req.ip);
        return res.status(200).json({
            success: true,
            message: 'Laboratory request submitted successfully.',
            data: {
                laboratoryRequest
            }
        });

    } catch (error) {
        return next(error);
    }
}

// Update the status of a specific test inside a request
const updateTestStatus = async (req, res, next) => {
    try {
        const { requestId, testId } = req.params;
        const { status } = req.body;

        const request = await LaboratoryRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }

        // Find the specific test in the array
        const testItem = request.tests.id(testId);
        if (!testItem) {
            return res.status(404).json({ success: false, message: 'Test not found in this request.' });
        }

        // Update test status
        testItem.status = status;

        // If starting processing, log the time
        if (status === 'in_progress' && !request.startedAt) {
            request.startedAt = new Date();
            request.status = 'in_progress';
            request.activities.push({
                action: 'processing_started',
                message: `Processing started for ${testItem.testSnapshot.testName}`,
                performedBy: req.user.id
            });
        }

        // Check if ALL tests are completed
        const allCompleted = request.tests.every(t => t.status === 'completed');
        if (allCompleted) {
            request.status = 'completed';
            request.completedAt = new Date();
            request.activities.push({
                action: 'completed',
                message: 'All laboratory tests completed.',
                performedBy: req.user.id
            });
        }

        await request.save();

         await logActivity(req.user.username, req.user.role, 'UPDATE_PROCESSING', 'Laboratory Processing', `Updated test status to ${status} for request ${request.requestNumber}`, req.ip);

        res.status(200).json({
            success: true,
            message: 'Test status updated.',
            data: { laboratoryRequest: request }
        });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// 5. EXPORT CONTROLLER FUNCTIONS
// ==========================================

module.exports = {
    createDraftRequestController,
    getLaboratoryRequestsController,
    getLaboratoryRequestByIdController,
    updateDraftRequestController,
    submitLaboratoryRequestController,
    updateTestStatus
};
