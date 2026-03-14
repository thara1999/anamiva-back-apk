const Appointment = require('../models/appointment');
const Doctor = require('../models/doctor');
const MedicalRecord = require('../models/medicalrecord');
const crypto = require('crypto');

// Robust helper to resolve name from user object
const getSafeName = (user) => {
  if (!user) return 'Unknown';

  // Check various name fields, ignoring literal "undefined" strings
  const fullName = (user.fullName && user.fullName !== 'undefined' && user.fullName !== '') ? user.fullName : null;
  const name = (user.name && user.name !== 'undefined' && user.name !== '') ? user.name : null;
  const firstName = (user.firstName && user.firstName !== 'undefined' && user.firstName !== '') ? user.firstName : null;
  const lastName = (user.lastName && user.lastName !== 'undefined' && user.lastName !== '') ? user.lastName : null;

  if (fullName) return fullName;
  if (name) return name;
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;

  return 'Unknown';
};

// Robust helper to calculate age
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth || dateOfBirth === 'undefined') return '-';
  try {
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return '-';
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age.toString() : '-';
  } catch {
    return '-';
  }
};

// Transform appointment for frontend
const transformAppointment = (apt) => {
  const aptObj = apt.toObject ? apt.toObject() : apt;

  return {
    ...aptObj,
    id: aptObj._id.toString(),
    patientId: aptObj.patientId?._id?.toString() || aptObj.patientId?.toString(),
    doctorId: aptObj.doctorId?._id?.toString() || aptObj.doctorId?.toString(),
    // Map patientId -> patient for frontend
    patient: aptObj.patientId ? {
      id: aptObj.patientId._id?.toString() || aptObj.patientId.toString(),
      name: getSafeName(aptObj.patientId),
      avatar: aptObj.patientId.avatar || null,
      age: calculateAge(aptObj.patientId.dateOfBirth),
      gender: (aptObj.patientId.gender && aptObj.patientId.gender !== 'undefined') ? aptObj.patientId.gender : '-',
      phone: aptObj.patientId.phone || aptObj.patientId.phoneNumber,
    } : null,
    // Map doctorId -> doctor for frontend
    doctor: aptObj.doctorId ? {
      id: aptObj.doctorId._id?.toString() || aptObj.doctorId.toString(),
      name: getSafeName(aptObj.doctorId.userId || aptObj.doctorId), // Look in populated userId or Doctor itself
      avatar: aptObj.doctorId.avatar || aptObj.doctorId.userId?.avatar || null,
      specialization: aptObj.doctorId.specialization || aptObj.doctorId.speciality || null,
      consultationFee: aptObj.doctorId.consultationFee || 0,
    } : null,
    // Video call fields
    videoCallRoomId: aptObj.videoCallRoomId || null,
    callStatus: aptObj.callStatus || 'idle',
    callStartedAt: aptObj.callStartedAt || null,
    callEndedAt: aptObj.callEndedAt || null,
  };
};

/* =========================
   BOOK APPOINTMENT
   - 30-minute slots
   - Max 30 days in advance
   - Auto video link for online
========================= */
exports.createAppointment = async (req, res) => {
  try {
    const { doctorId, date, time, type, symptoms } = req.body;

    // Validate 30-minute slot format (HH:00 or HH:30)
    if (time) {
      const minutes = time.split(':')[1];
      if (minutes !== '00' && minutes !== '30') {
        return res.status(400).json({
          success: false,
          message: 'Appointments must be on 30-minute slots (e.g. 09:00, 09:30)',
        });
      }
    }

    // Validate max 30 days in advance
    const appointmentDate = new Date(date);
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);

    if (appointmentDate < now) {
      return res.status(400).json({ success: false, message: 'Cannot book appointments in the past' });
    }

    if (appointmentDate > maxDate) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book more than 30 days in advance',
      });
    }

    // Check slot availability
    const existing = await Appointment.findOne({
      doctorId, date, time,
      status: { $in: ['pending', 'upcoming'] },
    });
    if (existing) return res.status(409).json({ success: false, message: 'Time slot already booked' });

    // Auto-generate video link for online appointments
    let videoLink = null;
    if (type === 'online') {
      videoLink = `https://meet.medapp.com/${crypto.randomBytes(8).toString('hex')}`;
    }

    const appointment = await Appointment.create({
      patientId: req.user.id,
      doctorId,
      date,
      time,
      type,
      symptoms,
      videoLink,
    });

    // Populate doctor and patient data for frontend
    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    res.status(201).json({ success: true, appointment: transformAppointment(populated), message: 'Appointment booked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET ALL APPOINTMENTS
   - Supports status, startDate, endDate, page, limit
========================= */
exports.getAppointments = async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;
    let filter = {};

    console.log(`\n[getAppointments] role=${req.user.role}, userId=${req.user.id}`);

    if (req.user.role === "patient") {
      filter.patientId = req.user.id;
    }
    else if (req.user.role === "doctor") {
      const doctorProfile = await Doctor.findOne({ userId: req.user.id });
      console.log(`[getAppointments] Doctor profile lookup: userId=${req.user.id} => doctorProfile=${doctorProfile ? doctorProfile._id : 'NOT FOUND'}`);
      if (doctorProfile) {
        filter.doctorId = doctorProfile._id;
      } else {
        console.log('[getAppointments] No doctor profile found, returning empty');
        return res.json({
          success: true,
          appointments: [],
          pagination: { page: 1, limit: 20, total: 0, pages: 0 }
        });
      }
    }

    if (status) {
      filter.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    console.log(`[getAppointments] filter=${JSON.stringify(filter)}`);

    const appointments = await Appointment.find(filter)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId')
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Appointment.countDocuments(filter);
    console.log(`[getAppointments] found ${total} appointments`);

    const transformedAppointments = appointments.map(apt => transformAppointment(apt));

    res.json({
      success: true,
      appointments: transformedAppointments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('[getAppointments] ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET APPOINTMENT BY ID
========================= */
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    res.json({
      success: true,
      appointment: transformAppointment(appointment)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   UPDATE STATUS (Doctor Only)
========================= */
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    // For doctors, compare against their doctor profile ID
    if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ userId: req.user.id });
      if (!doctorProfile || appointment.doctorId.toString() !== doctorProfile._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    appointment.status = status;

    // Auto-generate video call room ID when online appointment becomes upcoming
    if (status === 'upcoming' && appointment.type === 'online' && !appointment.videoCallRoomId) {
      appointment.videoCallRoomId = crypto.randomBytes(16).toString('hex');
    }

    await appointment.save();

    // Re-populate so transformAppointment has full patient/doctor data
    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    res.json({ success: true, appointment: transformAppointment(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   CANCEL APPOINTMENT
   - Must cancel 24+ hours before (else no refund)
========================= */
exports.cancelAppointment = async (req, res) => {
  try {
    const { reason } = req.body;
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    if (appointment.patientId.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    // Check 24-hour cancellation window
    const appointmentDateTime = new Date(appointment.date);
    if (appointment.time) {
      const [hours, minutes] = appointment.time.split(':');
      appointmentDateTime.setHours(Number(hours), Number(minutes));
    }

    const hoursUntilAppointment = (appointmentDateTime - new Date()) / (1000 * 60 * 60);
    const eligibleForRefund = hoursUntilAppointment >= 24;

    appointment.status = 'cancelled';
    appointment.cancelReason = reason;

    if (!eligibleForRefund) {
      appointment.refund = { amount: 0, status: 'processed' };
    }

    await appointment.save();

    // Re-populate so transformAppointment has full patient/doctor data
    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    res.json({
      success: true,
      appointment: transformAppointment(populated),
      refundEligible: eligibleForRefund,
      message: eligibleForRefund
        ? 'Appointment cancelled. Refund will be processed.'
        : 'Appointment cancelled. No refund (less than 24 hours notice).',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   RESCHEDULE APPOINTMENT
========================= */
exports.rescheduleAppointment = async (req, res) => {
  try {
    const { date, time } = req.body;
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    if (appointment.patientId.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    appointment.date = date;
    appointment.time = time;
    appointment.status = 'upcoming';
    await appointment.save();

    // Re-populate so transformAppointment has full patient/doctor data
    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    res.json({ success: true, appointment: transformAppointment(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   ADD CLINICAL NOTES
========================= */
exports.addNotes = async (req, res) => {
  try {
    const { notes, diagnosis } = req.body;
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    const doctorProfile = await Doctor.findOne({ userId: req.user.id });
    if (!doctorProfile || appointment.doctorId.toString() !== doctorProfile._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    appointment.notes = notes;
    appointment.diagnosis = diagnosis;
    await appointment.save();

    // Re-populate so transformAppointment has full patient/doctor data
    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    res.json({ success: true, appointment: transformAppointment(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   CREATE PRESCRIPTION (Doctor only)
   - Creates a MedicalRecord of type 'prescription'
   - Links to appointment via appointmentId
========================= */
exports.createPrescription = async (req, res) => {
  try {
    const { medications, diagnosis, notes } = req.body;
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Verify doctor authorization
    const doctorProfile = await Doctor.findOne({ userId: req.user.id });
    if (!doctorProfile || appointment.doctorId.toString() !== doctorProfile._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Build prescription description from medications
    let prescriptionDesc = '';
    if (medications && Array.isArray(medications)) {
      prescriptionDesc = medications.map(m =>
        `${m.name} - ${m.dosage || ''} ${m.frequency || ''}`
      ).join('; ');
    }

    // Create medical record as prescription
    const record = await MedicalRecord.create({
      patientId: appointment.patientId,
      doctorId: doctorProfile._id,
      appointmentId: appointment._id,
      title: `Prescription - ${new Date().toLocaleDateString()}`,
      description: prescriptionDesc || 'Prescription',
      type: 'prescription',
      diagnosis: diagnosis || '',
      notes: notes || '',
      status: 'verified',
    });

    res.status(201).json({
      success: true,
      prescription: {
        id: record._id.toString(),
        ...record.toObject(),
        medications: medications || [],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   START VIDEO CALL (Doctor)
========================= */
exports.startCall = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    if (appointment.type !== 'online') {
      return res.status(400).json({ success: false, message: 'Video calls are only for online appointments' });
    }

    // Ensure a room ID exists
    if (!appointment.videoCallRoomId) {
      appointment.videoCallRoomId = crypto.randomBytes(16).toString('hex');
    }

    appointment.callStatus = 'ringing';
    await appointment.save();

    // Notify patient via Socket.IO
    const { getIO } = require('../sockets/socket');
    try {
      const io = getIO();
      const doctorProfile = await Doctor.findById(appointment.doctorId).populate('userId');
      io.to(`user_${appointment.patientId.toString()}`).emit('incoming-call', {
        appointmentId: appointment._id.toString(),
        roomId: appointment.videoCallRoomId,
        caller: {
          id: appointment.doctorId.toString(),
          name: getSafeName(doctorProfile?.userId || doctorProfile),
          role: 'doctor',
        },
      });
    } catch (socketErr) {
      console.warn('Socket notification failed:', socketErr.message);
    }

    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    res.json({ success: true, appointment: transformAppointment(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   JOIN VIDEO CALL (Patient)
========================= */
exports.joinCall = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    if (!appointment.videoCallRoomId) {
      return res.status(400).json({ success: false, message: 'No active call for this appointment' });
    }

    appointment.callStatus = 'in_progress';
    appointment.callStartedAt = new Date();
    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    res.json({ success: true, appointment: transformAppointment(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   END VIDEO CALL
========================= */
exports.endCall = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    appointment.callStatus = 'ended';
    appointment.callEndedAt = new Date();
    await appointment.save();

    // Notify the other party
    const { getIO } = require('../sockets/socket');
    try {
      const io = getIO();
      io.to(`call_${appointment.videoCallRoomId}`).emit('call-ended', {
        appointmentId: appointment._id.toString(),
      });
    } catch (socketErr) {
      console.warn('Socket notification failed:', socketErr.message);
    }

    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    res.json({ success: true, appointment: transformAppointment(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
