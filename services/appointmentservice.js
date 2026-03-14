const Appointment = require('../models/appointment');

exports.createAppointment = async (data) => {
  return Appointment.create(data);
};

exports.getAppointmentsByPatient = async (patientId) => {
  return Appointment.find({ patientId }).populate('doctorId');
};
