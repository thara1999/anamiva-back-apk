const express = require('express');
const router = express.Router();

const analyticsController = require('../controllers/analyticscontroller');
const protect = require('../middlewares/authmiddleware');

router.get('/doctor', protect, analyticsController.getDoctorAnalytics);

module.exports = router;
