const mongoose = require('mongoose');
const { Schema } = mongoose;

const auditLogSchema = new Schema({
    username: { type: String, required: true },
    role: { type: String, required: true },
    action: { type: String, required: true }, // CREATE, UPDATE, DELETE, LOGIN, etc.
    module: { type: String, required: true }, // Authentication, Registration, etc.
    details: { type: String },
    ip: { type: String }
}, { timestamps: true, collection: 'auditlogs' });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);