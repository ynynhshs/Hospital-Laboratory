
const {
    createDraftRequest,
    searchLaboratoryRequests,
    getLaboratoryRequestById,
    updateDraftRequest,
    submitLaboratoryRequest
} = require('./laboratory-request.service');

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

// ==========================================
// 5. EXPORT CONTROLLER FUNCTIONS
// ==========================================

module.exports = {
    createDraftRequestController,
    getLaboratoryRequestsController,
    getLaboratoryRequestByIdController,
    updateDraftRequestController,
    submitLaboratoryRequestController
};
