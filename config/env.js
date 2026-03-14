require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  BASE_URL: process.env.BASE_URL,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  REDIS_URL: process.env.REDIS_URL,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE: process.env.TWILIO_PHONE,
  OTP_EXPIRES_IN: process.env.OTP_EXPIRES_IN || 300,
  OTP_LENGTH: process.env.OTP_LENGTH || 6,
  UPLOAD_TYPE: process.env.UPLOAD_TYPE || 'local',
  UPLOAD_PATH: process.env.UPLOAD_PATH || 'uploads',
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || 5242880,
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || 15,
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX || 100,
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  ENABLE_CRON: process.env.ENABLE_CRON === 'true',
};
