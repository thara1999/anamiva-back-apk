const Medication = require('../models/medication');

/* =========================
   ADD MEDICATION
========================= */
exports.addMedication = async (req, res) => {
  try {
    const medication = await Medication.create({
      patientId: req.user.id,
      ...req.body,
    });
    res.status(201).json({ success: true, medication });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET ALL MEDICATIONS
========================= */
exports.getMedications = async (req, res) => {
  try {
    const medications = await Medication.find({ patientId: req.user.id })
      .populate('doctorId')
      .sort({ createdAt: -1 });
    res.json({ success: true, medications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET ACTIVE MEDICATIONS
   - Filters by: no endDate OR endDate >= today, and active=true
========================= */
exports.getActiveMedications = async (req, res) => {
  try {
    const now = new Date();
    const medications = await Medication.find({
      patientId: req.user.id,
      active: { $ne: false },
      $or: [
        { endDate: null },
        { endDate: { $exists: false } },
        { endDate: { $gte: now } },
      ],
    })
      .populate('doctorId')
      .sort({ startDate: -1 });

    res.json({ success: true, medications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   UPDATE REMINDER SETTINGS
========================= */
exports.updateReminder = async (req, res) => {
  try {
    const { enabled, times } = req.body;

    const medication = await Medication.findOne({
      _id: req.params.medicationId,
      patientId: req.user.id,
    });

    if (!medication) {
      return res.status(404).json({ success: false, message: 'Medication not found' });
    }

    medication.reminder = {
      enabled: enabled !== undefined ? enabled : medication.reminder?.enabled || false,
      times: times || medication.reminder?.times || [],
    };
    await medication.save();

    res.json({ success: true, medication });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
