const MedicalRecord = require('../models/medicalrecord');

exports.createMedicalRecord = async (data) => {
  return MedicalRecord.create(data);
};

exports.getMedicalRecords = async (patientId) => {
  return MedicalRecord.find({ patientId });
};
