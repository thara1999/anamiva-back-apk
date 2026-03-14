const Doctor = require("../models/doctor");
const User = require("../models/user");
const Appointment = require("../models/appointment");
const { calculateDistanceKm } = require("../services/geoservice");

/* =========================
   CREATE DOCTOR PROFILE
========================= */
exports.createDoctorProfile = async (req, res) => {
  const doctor = await Doctor.create({
    userId: req.user.id,
    ...req.body
  });

  await User.findByIdAndUpdate(req.user.id, {
    role: "doctor",
    doctorInfo: doctor._id
  });

  res.status(201).json({
    success: true,
    message: "Doctor profile created successfully",
    doctor
  });
};

/* =========================
   GET DOCTORS (SEARCH + FILTER + GEOSPATIAL)
========================= */
exports.getDoctors = async (req, res) => {
  try {
    const {
      query,
      specialization,
      availableNow,
      acceptingEmergency,
      latitude,
      longitude,
      radius,
      sortBy = "rating",
      page = 1,
      limit = 20
    } = req.query;

    const filter = {};

    if (specialization) filter.speciality = specialization;

    if (availableNow)
      filter["availability.online"] = availableNow === "true";

    if (acceptingEmergency)
      filter["availability.acceptEmergency"] = acceptingEmergency === "true";

    if (query) {
      filter.$or = [
        { speciality: new RegExp(query, "i") }
      ];
    }

    // Geospatial search if location provided
    if (latitude && longitude) {
      const radiusKm = Number(radius) || 10;
      filter.location = {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [Number(longitude), Number(latitude)],
          },
          $maxDistance: radiusKm * 1000, // km to meters
        },
      };
    }

    const skip = (Number(page) - 1) * Number(limit);

    let doctors = await Doctor.find(filter)
      .populate("userId", "name profilePicture")
      .sort(sortBy === "distance" ? {} : { [sortBy]: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Calculate distance for each doctor if user location provided
    if (latitude && longitude) {
      doctors = doctors.map(doc => {
        const docObj = doc.toObject ? doc.toObject() : doc;
        const coords = docObj.location?.coordinates;
        if (coords && coords.length === 2) {
          docObj.distance = calculateDistanceKm(
            Number(latitude), Number(longitude),
            coords[1], coords[0]
          );
        }
        return docObj;
      });

      // Sort by distance if requested
      if (sortBy === "distance") {
        doctors.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      }
    }

    const total = await Doctor.countDocuments(filter);

    res.json({
      success: true,
      doctors,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET DOCTOR BY ID
========================= */
exports.getDoctorById = async (req, res) => {
  const doctor = await Doctor.findById(req.params.doctorId).populate(
    "userId",
    "name profilePicture"
  );

  if (!doctor)
    return res.status(404).json({ success: false, message: "Doctor not found" });

  res.json({ success: true, doctor });
};

/* =========================
   DOCTOR AVAILABILITY
   - Generates 30-minute slots based on working hours
   - Excludes already booked slots
========================= */
exports.getDoctorAvailability = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date)
      return res.status(400).json({ success: false, message: "Date required" });

    const doctor = await Doctor.findById(req.params.doctorId);
    if (!doctor)
      return res.status(404).json({ success: false, message: "Doctor not found" });

    // Default working hours: 09:00 - 17:00 (30-min slots)
    const startHour = 9;
    const endHour = 17;
    const slotDuration = 30; // minutes

    // Generate all possible slots
    const allSlots = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += slotDuration) {
        allSlots.push(
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        );
      }
    }

    // Find already booked slots for this doctor on this date
    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

    const bookedAppointments = await Appointment.find({
      doctorId: req.params.doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ["pending", "upcoming"] },
    });

    const bookedTimes = bookedAppointments.map(a => a.time);

    const slots = allSlots.map(time => ({
      time,
      available: !bookedTimes.includes(time),
    }));

    res.json({
      success: true,
      date,
      doctorId: req.params.doctorId,
      slots
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   TOGGLE FAVORITE
========================= */
exports.toggleFavorite = async (req, res) => {
  const user = await User.findById(req.user.id);

  const doctorId = req.params.doctorId;
  const index = user.favorites.indexOf(doctorId);

  let isFavorite;

  if (index === -1) {
    user.favorites.push(doctorId);
    isFavorite = true;
  } else {
    user.favorites.splice(index, 1);
    isFavorite = false;
  }

  await user.save();

  res.json({
    success: true,
    isFavorite,
    message: isFavorite
      ? "Doctor added to favorites"
      : "Doctor removed from favorites"
  });
};

/* =========================
   GET FAVORITES
========================= */
exports.getFavorites = async (req, res) => {
  const user = await User.findById(req.user.id).populate({
    path: "favorites",
    populate: { path: "userId", select: "name profilePicture" }
  });

  res.json({
    success: true,
    doctors: user.favorites
  });
};
