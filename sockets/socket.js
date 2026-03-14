const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const emergencyChatHandler = require("./emergencychat");
const videoCallHandler = require("./videocall");

let io;

const initSocket = (httpServer) => {
  const allowedOrigins = process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL || "https://medapp.com"]
    : ["http://localhost:3000", "http://localhost:8081", "http://localhost:19006"];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"]
    }
  });

  // JWT authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = { id: decoded.id, role: decoded.role };
      next();
    } catch (err) {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.user?.id})`);

    // Auto-join user's personal room for targeted notifications (video calls, etc.)
    if (socket.user?.id) {
      socket.join(`user_${socket.user.id}`);
    }

    // Register emergency chat events
    emergencyChatHandler(io, socket);

    // Register video call signaling events
    videoCallHandler(io, socket);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

module.exports = {
  initSocket,
  getIO
};
