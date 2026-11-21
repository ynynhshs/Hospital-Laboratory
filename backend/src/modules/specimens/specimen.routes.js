const express = require('express');
const router = express.Router();
const specimenController = require('./specimen.controller');
const { requireAuth, authorizeRoles } = require('../../middleware/auth.middleware');

// Receptionists may view specimens; registration and processing belong to
// technologists (administrators may oversee).
const viewRoles = ['lab_admin', 'lab_receptionist', 'lab_technologist'];
const registerRoles = ['lab_admin', 'lab_technologist'];

router.get('/', requireAuth, authorizeRoles(...viewRoles), specimenController.getAllSpecimens);
router.post('/', requireAuth, authorizeRoles(...registerRoles), specimenController.createSpecimen);

module.exports = router;