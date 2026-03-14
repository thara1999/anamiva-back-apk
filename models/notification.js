const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        title: {
            type: String,
            required: true,
        },

        message: {
            type: String,
            required: true,
        },

        type: {
            type: String,
            enum: ["appointment", "medication", "emergency", "system", "reminder"],
            default: "system",
        },

        read: {
            type: Boolean,
            default: false,
        },

        data: {
            // Additional data like appointmentId, medicationId, etc.
            type: mongoose.Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

module.exports =
    mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
