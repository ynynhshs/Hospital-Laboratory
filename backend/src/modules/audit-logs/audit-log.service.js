const AuditLog = require('../core/auditlog.model');

async function logActivity(username, role, action, module, details, ip) {
    try {
        await AuditLog.create({
            username,
            role,
            action,
            module,
            details,
            ip: ip || '127.0.0.1'
        });
    } catch (error) {
        console.error('Failed to write audit log:', error);
    }
}

module.exports = { logActivity };