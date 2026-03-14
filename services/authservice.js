const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

exports.findOrCreateUser = async ({ phoneNumber, countryCode }) => {
  let user = await User.findOne({ phoneNumber });
  if (!user) {
    user = await User.create({ phoneNumber, countryCode });
  }
  return user;
};

exports.generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};
