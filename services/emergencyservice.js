const EmergencyRequest = require('../models/emergencyrequest');

exports.createEmergency = async (data) => {
  return EmergencyRequest.create(data);
};

exports.updateEmergencyStatus = async (id, status) => {
  return EmergencyRequest.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );
};
