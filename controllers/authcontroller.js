const User = require("../models/user");
const Doctor = require("../models/doctor");
const jwt = require("jsonwebtoken");
const { sendOTP, verifyOTP } = require("../config/otp");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/env");

/* =====================
   SEND OTP (rate limited: max 3/hr per phone)
===================== */
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone)
      return res.status(400).json({
        success: false,
        message: "Phone required"
      });

    await sendOTP(phone);

    res.json({
      success: true,
      message: `OTP sent successfully to ${phone}`
    });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      message: err.message
    });
  }
};

/* =====================
   VERIFY OTP
===================== */
exports.verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp)
    return res.status(400).json({
      success: false,
      message: "Phone & OTP required"
    });

  const valid = await verifyOTP(phone, otp);
  if (!valid)
    return res.status(400).json({
      success: false,
      message: "Invalid or expired OTP"
    });

  let user = await User.findOne({ phoneNumber: phone });

  // Mark phone as verified after successful OTP
  // Use updateOne to avoid full document validation (prevents failures from
  // legacy data with invalid enum values like a misspelled gender)
  if (user) {
    await User.updateOne(
      { _id: user._id },
      { $set: { phoneVerified: true } }
    );
    user.phoneVerified = true;
  }

  // EXISTING USER
  if (user && user.isProfileCompleted) {
    const token = jwt.sign(
      { id: user._id, role: user.role, phoneVerified: true },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    // If user is a doctor, merge doctor profile data
    let userData = user;
    if (user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ userId: user._id });
      if (doctorProfile) {
        userData = {
          ...user.toObject(),
          specialization: doctorProfile.speciality,
          experience: doctorProfile.experience,
          rating: doctorProfile.rating,
          reviewCount: doctorProfile.reviewCount,
          consultationFee: doctorProfile.consultationFee,
          qualifications: doctorProfile.degree,
          registrationNumber: doctorProfile.registrationNo,
          clinicInfo: doctorProfile.clinicInfo,
          availability: doctorProfile.availability,
          languages: doctorProfile.languages,
          doctorProfileId: doctorProfile._id,
        };
      }
    }

    return res.json({
      success: true,
      user: userData,
      isNewUser: false,
      token
    });
  }

  // NEW USER
  const tempToken = jwt.sign(
    { phone, isTemp: true },
    JWT_SECRET,
    { expiresIn: "50m" }
  );

  res.json({
    success: true,
    isNewUser: true,
    phone,
    tempToken
  });
};

/* =====================
   SELECT ROLE
===================== */
exports.selectRole = async (req, res) => {
  const { role } = req.body;
  const phone = req.user.phone;

  if (!["patient", "doctor"].includes(role))
    return res.status(400).json({ message: "Invalid role" });

  await User.findOneAndUpdate(
    { phoneNumber: phone },
    { role },
    { upsert: true }
  );

  res.json({
    success: true,
    role,
    phone
  });
};

/* =====================
   COMPLETE PROFILE
===================== */
exports.completeProfile = async (req, res) => {
  const phone = req.user.phone;

  const user = await User.findOneAndUpdate(
    { phoneNumber: phone },
    {
      ...req.body,
      isProfileCompleted: true,
      phoneVerified: true
    },
    { new: true }
  );

  // Auto-create Doctor profile if role is doctor and none exists
  if (user.role === 'doctor') {
    const existingDoctor = await Doctor.findOne({ userId: user._id });
    if (!existingDoctor) {
      const doctorData = {
        userId: user._id,
        speciality: req.body.specialization || req.body.speciality || 'General Medicine',
        degree: req.body.qualifications || req.body.degree || 'MBBS',
        registrationNo: req.body.registrationNumber || req.body.registrationNo || 'PENDING',
        experience: req.body.experience || 0,
        consultationFee: req.body.consultationFee || 0,
        availability: req.body.availability || { online: true, clinicOpen: false, acceptEmergency: false },
        languages: req.body.languages || ['English'],
        location: {
          type: 'Point',
          coordinates: [80.2707, 13.0827] // Default, updated later
        }
      };
      const newDoctor = await Doctor.create(doctorData);
      console.log(`Auto-created Doctor profile ${newDoctor._id} for user ${user._id}`);
    }
  }

  const token = jwt.sign(
    { id: user._id, role: user.role, phoneVerified: true },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  res.status(201).json({
    success: true,
    user,
    token
  });
};

/* =====================
   GET ME
===================== */
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id);

  // If user is a doctor, also fetch the doctor profile data
  if (user && user.role === 'doctor') {
    const doctorProfile = await Doctor.findOne({ userId: user._id });

    if (doctorProfile) {
      // Merge doctor profile data with user data
      const userWithDoctorProfile = {
        ...user.toObject(),
        // Map doctor fields to the names expected by the frontend
        specialization: doctorProfile.speciality,
        experience: doctorProfile.experience,
        rating: doctorProfile.rating,
        reviewCount: doctorProfile.reviewCount,
        consultationFee: doctorProfile.consultationFee,
        qualifications: doctorProfile.degree,
        registrationNumber: doctorProfile.registrationNo,
        clinicInfo: doctorProfile.clinicInfo,
        availability: doctorProfile.availability,
        languages: doctorProfile.languages,
        // Keep doctor profile ID for reference
        doctorProfileId: doctorProfile._id,
      };

      return res.json({ success: true, user: userWithDoctorProfile });
    }
  }

  res.json({ success: true, user });
};

/* =====================
   LOGOUT
===================== */
exports.logout = async (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
};

/* =====================
   UPDATE PROFILE
===================== */
exports.updateProfile = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    req.body,
    { new: true }
  );

  res.json({ success: true, user });
};
