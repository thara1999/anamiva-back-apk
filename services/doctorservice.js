const Doctor = require('../models/doctor');
const User = require('../models/user');

exports.createDoctor = async (userId, data) => {
  const doctor = await Doctor.create({ userId, ...data });

  await User.findByIdAndUpdate(userId, {
    role: 'doctor',
    doctorInfo: doctor._id,
  });

  return doctor;
};

exports.getAllDoctors = async () => {
  return Doctor.find().populate('userId');
};
