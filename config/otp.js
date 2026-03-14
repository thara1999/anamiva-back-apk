const redis = require("redis");
const twilio = require("twilio");
const {
  REDIS_URL,
  OTP_EXPIRES_IN,
  OTP_LENGTH,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE
} = require("./env");

/* =========================
   REDIS
========================= */
const client = redis.createClient({ url: REDIS_URL });

client.on("error", err => {
  console.error("Redis Error:", err.message);
});

(async () => {
  await client.connect();
  console.log("Redis connected");
})();

/* =========================
   TWILIO
========================= */
const twilioClient = twilio(
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN
);

/* =========================
   OTP HELPERS
========================= */
const generateOTP = () => {
  let otp = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

const saveOTP = async (phone, otp) => {
  await client.setEx(`otp:${phone}`, OTP_EXPIRES_IN, otp);
};

const verifyOTP = async (phone, otp) => {
  const saved = await client.get(`otp:${phone}`);
  if (saved === otp) {
    await client.del(`otp:${phone}`);
    return true;
  }
  return false;
};

/* =========================
   OTP RATE LIMITING (max 3 per hour per phone)
========================= */
const OTP_RATE_LIMIT = 3;
const OTP_RATE_WINDOW = 3600; // 1 hour in seconds

const checkOTPRateLimit = async (phone) => {
  const key = `otp_rate:${phone}`;
  const count = await client.get(key);

  if (count && Number(count) >= OTP_RATE_LIMIT) {
    return false; // Rate limited
  }

  // Increment counter, set TTL on first request
  const newCount = await client.incr(key);
  if (newCount === 1) {
    await client.expire(key, OTP_RATE_WINDOW);
  }

  return true;
};

const sendOTP = async phone => {
  // Rate limit disabled for testing
  // const allowed = await checkOTPRateLimit(phone);
  // if (!allowed) {
  //   const err = new Error('Too many OTP requests. Max 3 per hour. Please try again later.');
  //   err.statusCode = 429;
  //   throw err;
  // }

  const otp = generateOTP();
  await saveOTP(phone, otp);

  // Log OTP to server console for testing
  console.log(`\n========== OTP for ${phone}: ${otp} ==========\n`);

  // Send SMS via Twilio (don't throw on failure — OTP is saved in Redis)
  try {
    await twilioClient.messages.create({
      from: TWILIO_PHONE,
      to: phone,
      body: `Your Anamiva verification code is ${otp}. Valid for 10 minutes.`
    });
    console.log(`SMS sent successfully to ${phone}`);
  } catch (twilioErr) {
    console.error(`Twilio SMS failed [${twilioErr.code || 'UNKNOWN'}]: ${twilioErr.message}`);
    if (twilioErr.code === 20003) {
      console.error('>>> Twilio credentials are INVALID. Update TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
    }
  }

  return otp;
};

module.exports = {
  sendOTP,
  verifyOTP
};
