const rateLimit = require('express-rate-limit');
const { RATE_LIMIT_WINDOW, RATE_LIMIT_MAX } = require('../config/env');

module.exports = rateLimit({
  windowMs: RATE_LIMIT_WINDOW * 60 * 1000,
  max: RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many requests, try again later',
  },
});
