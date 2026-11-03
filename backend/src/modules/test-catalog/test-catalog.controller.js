
const {
    createTest,
    getTestById,
    searchTests
} = require('./test-catalog.service');

// ==========================================
// MEDILINK LABORATORY
// TEST CATALOG CONTROLLER
// ==========================================

// 1. REGISTER LABORATORY TEST

async function registerTest(req, res, next) {
    try {
        const test = await createTest(req.body);

        return res.status(201).json({
            success: true,
            message: 'Laboratory test registered successfully.',
            data: {
                test
            }
        });

    } catch (error) {
        return next(error);
    }
}

// 2. GET LABORATORY TEST BY ID

async function getTestByIdController(req, res, next) {
    try {
        const test = await getTestById(req.params.testId);

        if (!test) {
            return res.status(404).json({
                success: false,
                message: 'Laboratory test not found.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Laboratory test retrieved successfully.',
            data: {
                test
            }
        });

    } catch (error) {
        return next(error);
    }
}

// 3. SEARCH AND FILTER LABORATORY TESTS

async function searchTestsController(req, res, next) {
    try {
        const {
            search,
            category,
            status,
            page,
            limit
        } = req.query;

        const result = await searchTests({
            search,
            category,
            status,
            page,
            limit
        });

        return res.status(200).json({
            success: true,
            message: 'Laboratory test records retrieved successfully.',
            data: result
        });

    } catch (error) {
        return next(error);
    }
}

// 4. EXPORT CONTROLLER FUNCTIONS

module.exports = {
    registerTest,
    getTestByIdController,
    searchTestsController
};

