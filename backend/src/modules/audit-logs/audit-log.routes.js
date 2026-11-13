const express = require('express');
const router = express.Router();
const auditLogController = require('./audit-log.controller');
const { requireAuth, authorizeRoles } = require('../../middleware/auth.middleware');

// Only Admins can view audit logs
router.get('/', requireAuth, authorizeRoles('lab_admin'), auditLogController.getAuditLogs);

module.exports = router;