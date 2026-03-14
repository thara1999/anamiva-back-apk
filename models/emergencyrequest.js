const mongoose = require('mongoose');

const emergencyRequestSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: String,
    },
    description: { type: String, required: true },
    urgency: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    estimatedArrival: Date,
    acceptedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

emergencyRequestSchema.index({ location: '2dsphere' });
emergencyRequestSchema.index({ status: 1, patientId: 1 });

module.exports = mongoose.model('EmergencyRequest', emergencyRequestSchema);
