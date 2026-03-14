const { JWT_SECRET, JWT_EXPIRES_IN } = require('./env');

module.exports = {
  secret: JWT_SECRET,
  expiresIn: JWT_EXPIRES_IN,
};
