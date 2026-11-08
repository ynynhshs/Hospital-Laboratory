const express = require('express');
const router = express.Router();
const specimenController = require('./specimen.controller');
const { requireAuth, authorizeRoles } = require('../../middleware/auth.middleware');

// Allow receptionists, technologists, and admins to view/register specimens
const allowedRoles = ['lab_admin', 'lab_receptionist', 'lab_technologist'];

router.get('/', requireAuth, authorizeRoles(...allowedRoles), specimenController.getAllSpecimens);
router.post('/', requireAuth, authorizeRoles(...allowedRoles), specimenController.createSpecimen);

module.exports = router;