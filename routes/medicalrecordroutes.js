const express = require('express');
const router = express.Router();
const medicalRecordController = require('../controllers/medicalrecordcontroller');
const protect = require('../middlewares/authmiddleware');
const authorize = require('../middlewares/rolemiddleware');
const upload = require('../config/storage');

// POST /api/medical-records - Patient uploads record (multipart/form-data, max 10 files)
router.post('/', protect, upload.array('files', 10), medicalRecordController.createMedicalRecord);

// GET /api/medical-records - List records
router.get('/', protect, medicalRecordController.getMedicalRecords);

// GET /api/medical-records/pending - Doctor gets pending prescriptions to transcribe
router.get('/pending', protect, authorize('doctor'), medicalRecordController.getPendingRecords);

// POST /api/medical-records/:recordId/transcribe - Doctor transcribes prescription
router.post('/:recordId/transcribe', protect, authorize('doctor'), medicalRecordController.transcribeRecord);

// PUT & PATCH /api/medical-records/:recordId/verify - Doctor verifies record
router.put('/:recordId/verify', protect, authorize('doctor'), medicalRecordController.verifyRecord);
router.patch('/:recordId/verify', protect, authorize('doctor'), medicalRecordController.verifyRecord);

// PUT & PATCH /api/medical-records/:recordId/reject - Doctor rejects record
router.put('/:recordId/reject', protect, authorize('doctor'), medicalRecordController.rejectRecord);
router.patch('/:recordId/reject', protect, authorize('doctor'), medicalRecordController.rejectRecord);

// PUT & PATCH /api/medical-records/:recordId/prescription - Doctor updates prescription
router.put('/:recordId/prescription', protect, authorize('doctor'), medicalRecordController.updatePrescription);
router.patch('/:recordId/prescription', protect, authorize('doctor'), medicalRecordController.updatePrescription);

module.exports = router;
