const EmergencyRequest = require('../models/emergencyrequest');
const ChatMessage = require('../models/chatmessage');
const Doctor = require('../models/doctor');

/* =========================
   CREATE EMERGENCY REQUEST
   - Patient only
   - Only ONE active emergency per patient
========================= */
exports.createEmergency = async (req, res) => {
  try {
    const { description, symptoms, urgency, location } = req.body;

    // Accept symptoms as fallback for description (frontend sends both)
    const desc = description || symptoms;

    if (!desc || !location) {
      return res.status(400).json({
        success: false,
        message: 'Description/symptoms and location are required',
      });
    }

    // Enforce one active emergency per patient
    const activeEmergency = await EmergencyRequest.findOne({
      patientId: req.user.id,
      status: { $in: ['pending', 'accepted', 'in_progress'] },
    });

    if (activeEmergency) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active emergency request',
      });
    }

    // Build GeoJSON location
    const coordinates = [
      location.longitude || location.lng,
      location.latitude || location.lat,
    ];

    const emergency = await EmergencyRequest.create({
      patientId: req.user.id,
      description: desc,
      urgency: urgency || 'medium',
      location: {
        type: 'Point',
        coordinates,
        address: location.address || '',
      },
    });

    res.status(201).json({ success: true, emergency });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET ACTIVE EMERGENCY (Patient)
   - Returns the patient's current active emergency
========================= */
exports.getActiveEmergency = async (req, res) => {
  try {
    const emergency = await EmergencyRequest.findOne({
      patientId: req.user.id,
      status: { $in: ['pending', 'accepted', 'in_progress'] },
    })
      .populate('doctorId')
      .sort({ createdAt: -1 });

    if (!emergency) {
      return res.json({ success: true, emergency: null });
    }

    res.json({ success: true, emergency });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET NEARBY EMERGENCIES
   - Doctor only
   - Location-based search (5km default, expandable to 10km)
========================= */
exports.getNearbyEmergencies = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const radiusKm = Math.min(Number(radius), 10); // Cap at 10km

    const emergencies = await EmergencyRequest.find({
      status: 'pending',
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(longitude), Number(latitude)],
          },
          $maxDistance: radiusKm * 1000, // Convert km to meters
        },
      },
    })
      .populate('patientId', 'name fullName phoneNumber avatar location')
      .sort({ createdAt: -1 });

    res.json({ success: true, emergencies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   DOCTOR ACCEPTS EMERGENCY
   - Doctor only
   - First-come, first-served (atomic update)
========================= */
exports.acceptEmergency = async (req, res) => {
  try {
    const { estimatedArrival } = req.body;

    // Find doctor profile
    const doctorProfile = await Doctor.findOne({ userId: req.user.id });
    if (!doctorProfile) {
      return res.status(403).json({
        success: false,
        message: 'Doctor profile not found',
      });
    }

    // Atomic update: only accept if still pending (first-come, first-served)
    const emergency = await EmergencyRequest.findOneAndUpdate(
      {
        _id: req.params.requestId,
        status: 'pending',
      },
      {
        status: 'accepted',
        doctorId: doctorProfile._id,
        acceptedAt: new Date(),
        estimatedArrival: estimatedArrival || null,
      },
      { new: true }
    ).populate('patientId', 'name fullName phoneNumber avatar');

    if (!emergency) {
      return res.status(409).json({
        success: false,
        message: 'Emergency already accepted by another doctor or not found',
      });
    }

    res.json({ success: true, emergency });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   UPDATE EMERGENCY STATUS
   - Validate status transitions
========================= */
exports.updateEmergencyStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const emergency = await EmergencyRequest.findById(req.params.requestId);
    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency request not found',
      });
    }

    // Validate status transitions
    const validTransitions = {
      pending: ['accepted', 'cancelled'],
      accepted: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
    };

    const allowed = validTransitions[emergency.status];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from '${emergency.status}' to '${status}'`,
      });
    }

    emergency.status = status;
    if (status === 'completed') {
      emergency.completedAt = new Date();
    }
    await emergency.save();

    res.json({ success: true, emergency });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET EMERGENCY CHAT MESSAGES
   - Only patient or assigned doctor
========================= */
exports.getMessages = async (req, res) => {
  try {
    const emergency = await EmergencyRequest.findById(req.params.requestId);
    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency request not found',
      });
    }

    // Check that emergency is accepted (chat unlocked)
    if (emergency.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Chat is not available until a doctor accepts the emergency',
      });
    }

    const messages = await ChatMessage.find({ emergencyId: req.params.requestId })
      .sort({ timestamp: 1 });

    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   SEND EMERGENCY CHAT MESSAGE
   - Only patient or assigned doctor
   - Chat must be unlocked (status != pending)
========================= */
exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    const emergency = await EmergencyRequest.findById(req.params.requestId);
    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency request not found',
      });
    }

    // Chat only available after doctor accepts
    if (emergency.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Chat is not available until a doctor accepts the emergency',
      });
    }

    const chatMessage = await ChatMessage.create({
      emergencyId: req.params.requestId,
      senderId: req.user.id,
      senderRole: req.user.role === 'doctor' ? 'DOCTOR' : 'PATIENT',
      message,
    });

    res.status(201).json({ success: true, message: chatMessage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
