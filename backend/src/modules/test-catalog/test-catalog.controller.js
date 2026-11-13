const { createTest, searchTests, getTestById } = require('./test-catalog.service');

// 1. Create Test Controller
exports.createTestController = async (req, res, next) => {
    try {
        const test = await createTest(req.body);
        res.status(201).json({
            success: true,
            message: 'Laboratory test registered successfully.',
            data: { test }
        });
    } catch (error) {
        next(error);
    }
};

// 2. Search Tests Controller
exports.searchTestsController = async (req, res, next) => {
    try {
        const result = await searchTests(req.query);
        res.status(200).json({
            success: true,
            message: 'Laboratory tests retrieved successfully.',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// 3. Get Test By ID Controller
exports.getTestByIdController = async (req, res, next) => {
    try {
        const test = await getTestById(req.params.testId);
        res.status(200).json({
            success: true,
            message: 'Laboratory test retrieved successfully.',
            data: { test }
        });
    } catch (error) {
        next(error);
    }
};