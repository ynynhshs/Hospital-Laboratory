const Specimen = require('./specimen.model');
const LaboratoryRequest = require('../lab-requests/laboratory-request.model');

// 1. Create a new specimen
exports.createSpecimen = async (req, res, next) => {
    try {
        const { requestId, specimenType, collectedAt, notes } = req.body;

        // Verify the lab request exists and is submitted/accepted
        const request = await LaboratoryRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Laboratory request not found.' });
        }

        // Generate a unique specimen code
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const specimenCode = `SPC-${dateStr}-${randomStr}`;

        const specimen = await Specimen.create({
            specimenCode,
            requestId,
            specimenType,
            status: 'collected',
            collectedBy: req.user.id, // Assuming your auth middleware attaches user to req
            collectedAt: collectedAt || new Date(),
            notes
        });

        res.status(201).json({
            success: true,
            message: 'Specimen registered successfully.',
            data: { specimen }
        });
    } catch (error) {
        next(error);
    }
};

// 2. Get all specimens (with populated request and patient data)
exports.getAllSpecimens = async (req, res, next) => {
    try {
        const specimens = await Specimen.find()
            .populate({
                path: 'requestId',
                populate: { path: 'patient', select: 'firstName lastName patientCode' }
            })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: { specimens }
        });
    } catch (error) {
        next(error);
    }
};