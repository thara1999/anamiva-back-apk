const Analytics = require('../models/analytics');

exports.getDoctorAnalytics = async (doctorId) => {
  return Analytics.findOne({ doctorId });
};

exports.updateAnalytics = async (doctorId, updates) => {
  return Analytics.findOneAndUpdate(
    { doctorId },
    { $inc: updates },
    { upsert: true, new: true }
  );
};
