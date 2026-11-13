const express = require('express');
const router = express.Router();
const testCatalogController = require('./test-catalog.controller');
const { requireAuth, authorizeRoles } = require('../../middleware/auth.middleware');

router.get('/', requireAuth, testCatalogController.searchTestsController);
router.post('/', requireAuth, authorizeRoles('lab_admin', 'lab_receptionist'), testCatalogController.createTestController);
router.get('/:testId', requireAuth, testCatalogController.getTestByIdController);

module.exports = router;