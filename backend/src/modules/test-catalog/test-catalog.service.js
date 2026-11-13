const TestCatalog = require('./test-catalog.model');
const AppError = require('../../shared/utils/app-error');

// Helper function to map categories to prefixes
function getCategoryPrefix(category) {
    const prefixes = {
        'Hematology': 'HEM',
        'Clinical Chemistry': 'CLN',
        'Microbiology': 'MIC',
        'Immunology': 'IMM',
        'Urinalysis': 'URN',
        'Other': 'OTH'
    };
    return prefixes[category] || 'TST';
}

// Helper function to generate the next Test Code
async function generateNextTestCode(category) {
    const prefix = getCategoryPrefix(category);
    const regex = new RegExp(`^${prefix}-\\d+$`);
    
    // Find the latest test with this prefix
    const lastTest = await TestCatalog.findOne({ testCode: regex }).sort({ testCode: -1 });

    if (!lastTest || !lastTest.testCode) {
        return `${prefix}-001`; // Start at 001
    }

    // Extract number and increment
    const match = lastTest.testCode.match(new RegExp(`${prefix}-(\\d+)`));
    if (!match) return `${prefix}-001`;

    const nextNumber = parseInt(match[1], 10) + 1;
    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
}

// 1. Create a new test
async function createTest(testData) {
    // Generate the code automatically based on the category
    const newTestCode = await generateNextTestCode(testData.category);
    
    // Override whatever code was sent from the frontend
    testData.testCode = newTestCode;

    const test = await TestCatalog.create(testData);
    return test;
}

// 2. Get all tests with pagination and filters
async function searchTests(query) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    if (query.search) {
        const searchRegex = new RegExp(query.search.trim(), 'i');
        filter.$or = [
            { testCode: searchRegex },
            { testName: searchRegex }
        ];
    }

    if (query.category) {
        filter.category = query.category;
    }

    if (query.status) {
        filter.status = query.status;
    }

    const [tests, total] = await Promise.all([
        TestCatalog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        TestCatalog.countDocuments(filter)
    ]);

    return {
        tests,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1
        }
    };
}

// 3. Get a single test by ID
async function getTestById(testId) {
    const test = await TestCatalog.findById(testId);
    if (!test) {
        throw new AppError('Laboratory test not found.', 404);
    }
    return test;
}

module.exports = {
    createTest,
    searchTests,
    getTestById
};