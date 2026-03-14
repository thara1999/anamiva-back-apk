const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencycontroller');
const protect = require('../middlewares/authmiddleware');
const authorize = require('../middlewares/rolemiddleware');

// POST /api/emergency/request - Patient creates emergency
router.post('/request', protect, authorize('patient'), emergencyController.createEmergency);

// GET /api/emergency/nearby - Doctor sees nearby emergencies
router.get('/nearby', protect, authorize('doctor'), emergencyController.getNearbyEmergencies);

// GET /api/emergency/active - Patient gets their active emergency
router.get('/active', protect, emergencyController.getActiveEmergency);

// POST /api/emergency/:requestId/accept - Doctor accepts emergency
router.post('/:requestId/accept', protect, authorize('doctor'), emergencyController.acceptEmergency);

// PATCH & PUT /api/emergency/:requestId/status - Update emergency status
router.patch('/:requestId/status', protect, emergencyController.updateEmergencyStatus);
router.put('/:requestId/status', protect, emergencyController.updateEmergencyStatus);

// GET /api/emergency/:requestId/messages - Get chat messages
router.get('/:requestId/messages', protect, emergencyController.getMessages);

// POST /api/emergency/:requestId/messages - Send chat message
router.post('/:requestId/messages', protect, emergencyController.sendMessage);

module.exports = router;
