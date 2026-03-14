const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },

    role: {
      type: String,
      enum: ["patient", "doctor", "admin", "nurse"],
      default: "patient",
    },

    // Basic Info
    name: String,
    fullName: String,
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    avatar: String,

    // Patient Profile
    dateOfBirth: String,
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
    },
    bloodGroup: String,
    height: Number,
    weight: Number,

    // Address
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
    },

    // Location for nearby features
    location: {
      latitude: Number,
      longitude: Number,
    },

    // Emergency Contact
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },

    // Medical History
    medicalHistory: {
      conditions: [String],
      allergies: [String],
      previousSurgeries: [String],
      familyHistory: String,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    isProfileCompleted: {
      type: Boolean,
      default: false,
    },

    // Doctor Favorites
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);
