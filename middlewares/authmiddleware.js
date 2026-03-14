const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // TEMP TOKEN (OTP FLOW)
    if (decoded.isTemp) {
      req.user = {
        phone: decoded.phone,
        isTemp: true
      };
    } 
    // NORMAL TOKEN
    else {
      req.user = {
        id: decoded.id,
        role: decoded.role,
        doctorInfo: decoded.doctorInfo || null
      };
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
