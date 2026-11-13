const AuditLog = require('../core/auditlog.model');

exports.getAuditLogs = async (req, res, next) => {
    try {
        // Fetch logs, newest first
        const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200);
        
        res.status(200).json({
            success: true,
            data: { logs }
        });
    } catch (error) {
        next(error);
    }
};