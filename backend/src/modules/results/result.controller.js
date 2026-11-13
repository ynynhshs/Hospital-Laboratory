const Result = require('./result.model');
const LaboratoryRequest = require('../lab-requests/laboratory-request.model');
const Specimen = require('../specimens/specimen.model');
const { logActivity } = require('../audit-logs/audit-log.service');

// 1. Save a new result OR Update a returned result
exports.createResult = async (req, res, next) => {
    try {
        const { requestId, testId, testName, patientId, specimenId, resultValue, unit, referenceRange, remarks } = req.body;

        let result = await Result.findOne({ requestId, testId });

        if (result) {
            // If it exists, only allow update if it was returned for correction
            if (result.status === 'returned_for_correction') {
                result.resultValue = resultValue;
                result.unit = unit;
                result.referenceRange = referenceRange;
                result.remarks = remarks;
                result.enteredBy = req.user._id || req.user.id;
                result.status = 'pending_verification'; // Reset status
                result.verificationRemarks = undefined; // Clear old correction note
                await result.save();
                await logActivity(req.user.username, req.user.role, 'CORRECT_RESULT', 'Laboratory Results', `Corrected result for ${testName}`, req.ip);
                return res.status(200).json({ success: true, message: 'Corrected result resubmitted.', data: { result } });
            } else {
                return res.status(400).json({ success: false, message: 'Result already exists and cannot be edited.' });
            }
        }

        // Create new result
        result = await Result.create({
            requestId, testId, testName, patientId, specimenId, resultValue, unit, referenceRange, remarks,
            enteredBy: req.user._id || req.user.id,
            status: 'pending_verification'
        });

        await logActivity(req.user.username, req.user.role, 'ENTER_RESULT', 'Laboratory Results', `Entered result for ${testName}`, req.ip);

        res.status(201).json({ success: true, message: 'Result saved successfully.', data: { result } });
    } catch (error) {
        next(error);
    }
};

// 2. Get all results (for verification)
exports.getAllResults = async (req, res, next) => {
    try {
        const results = await Result.find()
            .populate('requestId', 'requestNumber')
            .populate('patientId', 'firstName lastName patientId')
            .populate('enteredBy', 'firstName lastName fullName username')
            .populate('verifiedBy', 'firstName lastName fullName username')
            .populate('specimenId', 'specimenCode')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: { results } });
    } catch (error) {
        next(error);
    }
};

// 3. Get tests that are completed but don't have results yet (OR were returned)
exports.getAwaitingResults = async (req, res, next) => {
    try {
        const requests = await LaboratoryRequest.find({ 'tests.status': 'completed' })
            .populate('patient', 'firstName lastName patientId')
            .lean();

        const existingResults = await Result.find({}, 'requestId testId status resultValue unit referenceRange verificationRemarks').lean();
        
        const resultMap = {};
        existingResults.forEach(r => { resultMap[`${r.requestId}_${r.testId}`] = r; });

        const awaiting = [];
        for (const req of requests) {
            const specimen = await Specimen.findOne({ requestId: req._id });
            
            req.tests.forEach(test => {
                if (test.status === 'completed') {
                    const key = `${req._id}_${test._id}`;
                    const existing = resultMap[key];

                    // Show if NO result exists, OR if the result was RETURNED for correction
                    if (!existing || existing.status === 'returned_for_correction') {
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
                            referenceRange: test.testSnapshot.referenceRange || '',
                            // Pass correction data if it exists
                            isReturned: existing && existing.status === 'returned_for_correction',
                            verificationRemarks: existing ? existing.verificationRemarks : null,
                            previousValue: existing ? existing.resultValue : null
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

        await logActivity(req.user.username, req.user.role, 'VERIFY_RESULT', 'Laboratory Results', `Verified and released result for ${result.testName}`, req.ip);
        
        res.status(200).json({ success: true, message: 'Result verified and released.', data: { result } });
    } catch (error) {
        next(error);
    }
};

// 5. Return Result for Correction
exports.returnForCorrection = async (req, res, next) => {
    try {
        const { resultId } = req.params;
        const { remarks } = req.body;

        if (!remarks || !remarks.trim()) {
            return res.status(400).json({ success: false, message: 'A reason for returning is required.' });
        }

        const result = await Result.findById(resultId);
        if (!result) return res.status(404).json({ success: false, message: 'Result not found.' });

        result.status = 'returned_for_correction';
        result.verificationRemarks = remarks.trim();
        result.verifiedBy = req.user._id || req.user.id;
        result.verifiedAt = new Date();
        await result.save();

        await logActivity(req.user.username, req.user.role, 'RETURN_RESULT', 'Laboratory Results', `Returned result for ${result.testName} for correction`, req.ip);


        res.status(200).json({ success: true, message: 'Result returned to technologist for correction.', data: { result } });
    } catch (error) {
        next(error);
    }
};