const Result = require('./result.model');
const LaboratoryRequest = require('../lab-requests/laboratory-request.model');
const Specimen = require('../specimens/specimen.model');

// 1. Save a new result
exports.createResult = async (req, res, next) => {
    try {
        const { requestId, testId, testName, patientId, specimenId, resultValue, unit, referenceRange, remarks } = req.body;

        // Check if result already exists for this test to prevent duplicates
        const existingResult = await Result.findOne({ requestId, testId });
        if (existingResult) {
            return res.status(400).json({ success: false, message: 'Result already exists for this test.' });
        }

        const result = await Result.create({
            requestId,
            testId,
            testName,
            patientId,
            specimenId,
            resultValue,
            unit,
            referenceRange,
            remarks,
            enteredBy: req.user._id || req.user.id, // Updated to match new User model
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
            .populate('requestId', 'requestNumber')
            .populate('patientId', 'firstName lastName patientId') // Updated to patientId
            .populate('enteredBy', 'firstName lastName fullName username')
            .populate('verifiedBy', 'firstName lastName fullName username')
            .populate('specimenId', 'specimenCode')
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
            .populate('patient', 'firstName lastName patientId') // Updated to patientId
            .lean();

        // Find all existing results to avoid duplicates
        const existingResults = await Result.find({}, 'requestId testId').lean();
        const existingSet = new Set(existingResults.map(r => `${r.requestId}_${r.testId}`));

        const awaiting = [];
        for (const req of requests) {
            // Find specimen for this request
            const specimen = await Specimen.findOne({ requestId: req._id });
            
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
                            specimenId: specimen ? specimen._id : null,
                            specimenCode: specimen ? specimen.specimenCode : 'N/A',
                            unit: test.testSnapshot.unit || '',
                            referenceRange: test.testSnapshot.referenceRange || ''
                        });
                    }
                }
            });
        }

        res.status(200).json({ success: true, data: { awaiting } });
    } catch (error) {
        next(error);
    }
};

// 4. Verify and Release a Result
exports.verifyResult = async (req, res, next) => {
    try {
        const { resultId } = req.params;
        const result = await Result.findById(resultId);
        if (!result) return res.status(404).json({ success: false, message: 'Result not found.' });

        result.status = 'released'; 
        result.verifiedBy = req.user._id || req.user.id; 
        result.verifiedAt = new Date();
        await result.save();
        
        res.status(200).json({ success: true, message: 'Result verified and released.', data: { result } });
    } catch (error) {
        next(error);
    }
};