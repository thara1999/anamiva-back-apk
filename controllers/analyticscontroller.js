const Appointment = require('../models/appointment');
const Doctor = require('../models/doctor');
const User = require('../models/user');

exports.getDoctorAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { period, startDate, endDate } = req.query;

    // 1. Get Doctor Profile
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    // 2. Determine Date Range
    let start = new Date();
    let end = new Date();

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      start.setDate(start.getDate() - 7);
    } else if (period === 'month') {
      start.setDate(start.getDate() - 30);
    } else if (period === 'year') {
      start.setDate(start.getDate() - 365);
    } else if (period === 'custom' && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to last 30 days
      start.setDate(start.getDate() - 30);
    }

    // 3. Fetch Appointments
    const appointments = await Appointment.find({
      doctorId: doctor._id,
      date: { $gte: start, $lte: end }
    }).populate('patientId');

    // 4. Calculate Summary Metrics
    const completedAppointments = appointments.filter(a => a.status === 'completed');
    const revenue = completedAppointments.length * (doctor.consultationFee || 500);
    const uniquePatients = new Set(appointments.map(a => a.patientId?._id?.toString())).size;

    // 5. Aggregate Chart Data (Daily breakdown)
    const dailyStats = {};
    const days = [];
    let curr = new Date(start);
    while (curr <= end) {
      const d = curr.toISOString().split('T')[0];
      days.push(d);
      dailyStats[d] = { revenue: 0, count: 0 };
      curr.setDate(curr.getDate() + 1);
    }

    appointments.forEach(apt => {
      const d = new Date(apt.date).toISOString().split('T')[0];
      if (dailyStats[d]) {
        dailyStats[d].count += 1;
        if (apt.status === 'completed') {
          dailyStats[d].revenue += (doctor.consultationFee || 500);
        }
      }
    });

    const chartData = {
      revenue: days.map(d => ({
        day: d.split('-').slice(1).join('/'), // MM/DD format
        amount: dailyStats[d].revenue
      })),
      appointments: days.map(d => ({
        day: d.split('-').slice(1).join('/'),
        count: dailyStats[d].count
      }))
    };

    // 6. Demographics & Top Conditions
    const ageGroups = { '18-30': 0, '31-50': 0, '50+': 0, 'Under 18': 0 };
    const genderDist = { male: 0, female: 0, other: 0 };
    const conditionsMap = {};

    // Use unique patients for demographics
    const patientsMap = new Map();
    appointments.forEach(apt => {
      if (apt.patientId && !patientsMap.has(apt.patientId._id.toString())) {
        patientsMap.set(apt.patientId._id.toString(), apt.patientId);
      }

      // Aggregate conditions from diagnosis
      if (apt.diagnosis && apt.diagnosis !== 'undefined' && apt.diagnosis.trim() !== '') {
        const condition = apt.diagnosis.trim();
        conditionsMap[condition] = (conditionsMap[condition] || 0) + 1;
      }
    });

    patientsMap.forEach(patient => {
      // Gender
      if (patient.gender && genderDist[patient.gender.toLowerCase()] !== undefined) {
        genderDist[patient.gender.toLowerCase()] += 1;
      }

      // Age
      if (patient.dateOfBirth) {
        const dob = new Date(patient.dateOfBirth);
        const age = Math.floor((new Date() - dob) / (1000 * 60 * 60 * 24 * 365.25));
        if (age < 18) ageGroups['Under 18'] += 1;
        else if (age <= 30) ageGroups['18-30'] += 1;
        else if (age <= 50) ageGroups['31-50'] += 1;
        else ageGroups['50+'] += 1;
      }
    });

    const totalPatients = patientsMap.size || 1;
    const demographics = {
      ageGroups: Object.entries(ageGroups).map(([label, count]) => ({
        label,
        value: Math.round((count / totalPatients) * 100)
      })),
      gender: Object.entries(genderDist).map(([label, count]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value: Math.round((count / totalPatients) * 100)
      }))
    };

    const topConditions = Object.entries(conditionsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      summary: {
        revenue,
        appointments: appointments.length,
        patients: uniquePatients,
        rating: doctor.rating || 0
      },
      chartData,
      demographics,
      topConditions
    });
  } catch (error) {
    next(error);
  }
};

