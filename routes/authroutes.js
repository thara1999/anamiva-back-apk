const express = require("express");
const router = express.Router();
const authController = require("../controllers/authcontroller");
const protectTemp = require("../middlewares/authmiddleware"); // temp token also JWT

router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);

router.post("/select-role", protectTemp, authController.selectRole);
router.post("/complete-profile", protectTemp, authController.completeProfile);

router.get("/me", protectTemp, authController.getMe);
router.post("/logout", protectTemp, authController.logout);
router.put("/profile", protectTemp, authController.updateProfile);

module.exports = router;
