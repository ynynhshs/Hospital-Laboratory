const Result = require('./result.model');
const LaboratoryRequest = require('../lab-requests/laboratory-request.model');

// 1. Save a new result
exports.createResult = async (req, res, next) => {
    try {
        const { requestId, testId, testName, patientId, resultValue, unit, referenceRange, remarks } = req.body;

        // Check if result already exists for this test to prevent duplicates
        const existingResult = await Result.findOne({ requestId, testId });
        if (existingResult) {
            return res.status(400).json({ success: false, message: 'Result already exists for this test. Use update instead.' });
        }

        const result = await Result.create({
            requestId,
            testId,
            testName,
            patientId,
            resultValue,
            unit,
            referenceRange,
            remarks,
            enteredBy: req.user.id,
            status: 'pending_verification'
        });

        res.status(201).json({
            success: true,
            message: 'Result saved successfully.',
            data: { result }
        });
    } catch (error) {
        next(error);
    }
};

// 2. Get all results (for verification)
exports.getAllResults = async (req, res, next) => {
    try {
        const results = await Result.find()
            .populate('requestId', 'requestNumber patient')
            .populate('patientId', 'firstName lastName patientCode')
            .populate('enteredBy', 'firstName lastName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: { results }
        });
    } catch (error) {
        next(error);
    }
};




// 3. Get tests that are completed but don't have results yet
exports.getAwaitingResults = async (req, res, next) => {
    try {
        // Find all requests with completed tests
        const requests = await LaboratoryRequest.find({ 'tests.status': 'completed' })
            .populate('patient', 'firstName lastName patientCode')
            .populate('requestedBy', 'firstName lastName')
            .lean();

        // Find all existing results to avoid duplicates
        const existingResults = await Result.find({}, 'requestId testId').lean();
        const existingSet = new Set(existingResults.map(r => `${r.requestId}_${r.testId}`));

        const awaiting = [];
        requests.forEach(req => {
            req.tests.forEach(test => {
                if (test.status === 'completed') {
                    const key = `${req._id}_${test._id}`;
                    if (!existingSet.has(key)) {
                        awaiting.push({
                            requestId: req._id,
                            requestNumber: req.requestNumber,
                            testId: test._id,
                            testName: test.testSnapshot.testName,
                            patientId: req.patient?._id,
                            patientName: req.patient ? `${req.patient.firstName} ${req.patient.lastName}` : 'Unknown',
                            specimenType: test.testSnapshot.specimenType || 'N/A',
                            unit: test.testSnapshot.unit || '',
                            referenceRange: test.testSnapshot.referenceRange || ''
                        });
                    }
                }
            });
        });

        res.status(200).json({ success: true, data: { awaiting } });
    } catch (error) {
        next(error);
    }
};