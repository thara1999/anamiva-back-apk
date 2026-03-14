const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  emergencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "EmergencyRequest",
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  senderRole: {
    type: String,
    enum: ["PATIENT", "DOCTOR", "ADMIN"],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
