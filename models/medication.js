const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: String,
    duration: String,
    startDate: Date,
    endDate: Date,
    active: { type: Boolean, default: true },
    reminder: {
      enabled: { type: Boolean, default: false },
      times: [String], // e.g. ["08:00", "20:00"]
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Medication', medicationSchema);
