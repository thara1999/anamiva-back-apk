const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    title: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ['prescription', 'lab-report', 'x-ray', 'other'],
      default: 'other',
    },
    fileUrl: String,
    files: [String], // Multiple file URLs (max 10)
    status: {
      type: String,
      enum: ['pending', 'verified', 'transcribed', 'rejected', 'approved'],
      default: 'pending',
    },
    diagnosis: String,
    notes: String,
    rejectionReason: String,
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
