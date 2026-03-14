const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorcontroller");
const protect = require("../middlewares/authmiddleware");

/* Doctor protected (must be before /:doctorId to avoid route conflicts) */
router.get("/favorites", protect, doctorController.getFavorites);
router.post("/create", protect, doctorController.createDoctorProfile);

/* Doctor public */
router.get("/", doctorController.getDoctors);
router.get("/:doctorId", doctorController.getDoctorById);
router.get("/:doctorId/availability", doctorController.getDoctorAvailability);

/* Doctor protected (parameterized) */
router.post("/:doctorId/favorite", protect, doctorController.toggleFavorite);

module.exports = router;
