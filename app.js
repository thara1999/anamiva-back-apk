const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const errorMiddleware = require("./middlewares/errormiddleware");

// Routes
const authRoutes = require("./routes/authroutes");
const doctorRoutes = require("./routes/doctorroutes");
const appointmentRoutes = require("./routes/appointmentroutes");
const emergencyRoutes = require("./routes/emergencyroutes");
const medicalRecordRoutes = require("./routes/medicalrecordroutes");
const medicationRoutes = require("./routes/medicationroutes");
const notificationRoutes = require("./routes/notificationroutes");
const analyticsRoutes = require("./routes/analyticsroutes");

const app = express();

/* =========================
   GLOBAL MIDDLEWARES
========================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

/* =========================
   HEALTH CHECK
========================= */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "MedApp API is running 🚀"
  });
});

/* =========================
   API ROUTES
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/medical-records", medicalRecordRoutes);
app.use("/api/medications", medicationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

/* =========================
   ERROR HANDLER
========================= */
app.use(errorMiddleware);

module.exports = app;
