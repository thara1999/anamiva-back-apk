const express = require('express');
const router = express.Router();
const medicationController = require('../controllers/medicationcontroller');
const protect = require('../middlewares/authmiddleware');

// POST /api/medications - Add medication
router.post('/', protect, medicationController.addMedication);

// GET /api/medications - Get all medications
router.get('/', protect, medicationController.getMedications);

// GET /api/medications/active - Get active medications
router.get('/active', protect, medicationController.getActiveMedications);

// PATCH /api/medications/:medicationId/reminder - Update reminder settings
router.patch('/:medicationId/reminder', protect, medicationController.updateReminder);

module.exports = router;
