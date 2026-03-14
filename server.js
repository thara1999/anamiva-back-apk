require("dotenv").config();

const http = require("http");
const mongoose = require("mongoose");
const app = require("./app");
const { initSocket } = require("./sockets/socket");

const PORT = process.env.PORT;

/* =========================
   DATABASE CONNECTION
========================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

/* =========================
   HTTP + SOCKET SERVER
========================= */
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

/* =========================
   START SERVER
========================= */
server.listen(PORT, () => {
  console.log(`🚀 MedApp server running on port ${PORT}`);
});
  