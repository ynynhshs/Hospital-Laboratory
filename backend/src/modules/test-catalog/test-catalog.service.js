
const mongoose = require('mongoose');

const TestCatalog = require('./test-catalog.model');
const AppError = require('../../shared/utils/app-error');

// ==========================================
// MEDILINK LABORATORY
// LABORATORY TEST CATALOG SERVICE
// ==========================================

const ALLOWED_CATEGORIES = [
    'Hematology',
    'Clinical Chemistry',
    'Microbiology',
    'Immunology',
    'Urinalysis',
    'Other'
];

const ALLOWED_STATUSES = [
    'active',
    'inactive'
];

// ==========================================
// 1. CREATE LABORATORY TEST
// ==========================================

async function createTest(testData) {

    if (
        !testData ||
        typeof testData !== 'object' ||
        Array.isArray(testData)
    ) {
        throw new AppError(
            'Laboratory test information is required.',
            400
        );
    }

    const {
        testCode,
        testName,
        category,
        specimenType,
        testingMethod,
        turnaroundTime,
        status
    } = testData;

    if (
        !testCode ||
        !String(testCode).trim() ||
        !testName ||
        !String(testName).trim() ||
        !category ||
        !specimenType ||
        !String(specimenType).trim() ||
        !testingMethod ||
        !String(testingMethod).trim() ||
        !turnaroundTime ||
        !String(turnaroundTime).trim()
    ) {
        throw new AppError(
            'All required laboratory test fields must be provided.',
            400
        );
    }

    const normalizedTestCode = String(testCode)
        .trim()
        .toUpperCase();

    const existingTest = await TestCatalog.findOne({
        testCode: normalizedTestCode
    });

    if (existingTest) {
        throw new AppError(
            'Laboratory test code is already registered.',
            409
        );
    }

    const newTest = new TestCatalog({
        testCode: normalizedTestCode,
        testName,
        category,
        specimenType,
        testingMethod,
        turnaroundTime,
        status
    });

    try {
        return await newTest.save();

    } catch (error) {

        if (
            error.code === 11000 &&
            error.keyPattern?.testCode
        ) {
            throw new AppError(
                'Laboratory test code is already registered.',
                409
            );
        }

        throw error;
    }
}

// ==========================================
// 2. GET LABORATORY TEST BY ID
// ==========================================

async function getTestById(testId) {

    if (
        typeof testId !== 'string' ||
        !mongoose.Types.ObjectId.isValid(testId)
    ) {
        throw new AppError(
            'A valid laboratory test ID is required.',
            400
        );
    }

    return await TestCatalog.findById(testId);
}

// ==========================================
// 3. SEARCH AND FILTER LABORATORY TESTS
// ==========================================

async function searchTests(options = {}) {

    if (
        !options ||
        typeof options !== 'object' ||
        Array.isArray(options)
    ) {
        throw new AppError(
            'Invalid laboratory test search options.',
            400
        );
    }

    const {
        search,
        category,
        status
    } = options;

    const page = Number(options.page ?? 1);
    const limit = Number(options.limit ?? 10);

    // Validate pagination.
    if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100
    ) {
        throw new AppError(
            'Invalid pagination settings.',
            400
        );
    }

    // Validate category filter.
    if (
        category &&
        !ALLOWED_CATEGORIES.includes(category)
    ) {
        throw new AppError(
            'Invalid laboratory test category.',
            400
        );
    }

    // Validate status filter.
    if (
        status &&
        !ALLOWED_STATUSES.includes(status)
    ) {
        throw new AppError(
            'Invalid laboratory test status.',
            400
        );
    }

    const filter = {};

    // Search test code, test name, specimen, or method.
    if (search !== undefined && search !== '') {

        if (
            typeof search !== 'string' ||
            !search.trim()
        ) {
            throw new AppError(
                'Invalid laboratory test search term.',
                400
            );
        }

        const escapedSearch = search
            .trim()
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const searchRegex = new RegExp(
            escapedSearch,
            'i'
        );

        filter.$or = [
            { testCode: searchRegex },
            { testName: searchRegex },
            { specimenType: searchRegex },
            { testingMethod: searchRegex }
        ];
    }

    // Apply category filter.
    if (category) {
        filter.category = category;
    }

    // Apply status filter.
    if (status) {
        filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [tests, total] = await Promise.all([
        TestCatalog.find(filter)
            .sort({ testName: 1, testCode: 1 })
            .skip(skip)
            .limit(limit),

        TestCatalog.countDocuments(filter)
    ]);

    return {
        tests,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
}

// ==========================================
// 4. EXPORT SERVICE FUNCTIONS
// ==========================================

module.exports = {
    createTest,
    getTestById,
    searchTests
};
