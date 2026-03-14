const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', unique: true },
    patientCount: { type: Number, default: 0 },
    appointmentCount: { type: Number, default: 0 },
    emergencyHandled: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Analytics', analyticsSchema);
