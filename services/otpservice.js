const { sendOTP, verifyOTP } = require('../config/otp');

exports.sendOtpToPhone = async (phone) => {
  await sendOTP(phone);
};

exports.verifyPhoneOtp = async (phone, otp) => {
  return await verifyOTP(phone, otp);
};
