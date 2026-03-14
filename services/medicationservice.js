const Medication = require('../models/medication');

exports.addMedication = async (data) => {
  return Medication.create(data);
};

exports.getMedications = async (patientId) => {
  return Medication.find({ patientId });
};
