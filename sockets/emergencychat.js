const ChatMessage = require("../models/chatmessage");
const EmergencyRequest = require("../models/emergencyrequest");

/**
 * Emergency Chat Socket Handler
 */
module.exports = (io, socket) => {

  /**
   * Join emergency room
   * payload: { emergencyId, userId, role }
   */
  socket.on("joinEmergency", async (payload) => {
    const { emergencyId, userId, role } = payload;

    if (!emergencyId || !userId) {
      return socket.emit("error", {
        message: "Invalid join request"
      });
    }

    socket.join(emergencyId);

    console.log(`🚑 ${role} joined emergency room: ${emergencyId}`);

    socket.emit("joinedEmergency", {
      emergencyId,
      message: "Joined emergency chat successfully"
    });
  });

  /**
   * Send message
   * payload: { emergencyId, senderId, senderRole, message }
   */
  socket.on("sendEmergencyMessage", async (payload) => {
    try {
      const { emergencyId, senderId, senderRole, message } = payload;

      if (!emergencyId || !senderId || !message) {
        return;
      }

      // Validate emergency
      const emergency = await EmergencyRequest.findById(emergencyId);
      if (!emergency) {
        return socket.emit("error", { message: "Emergency not found" });
      }

      // Save chat message
      const chat = await ChatMessage.create({
        emergencyId,
        senderId,
        senderRole,
        message,
        timestamp: new Date()
      });

      // Emit to all in room
      io.to(emergencyId).emit("receiveEmergencyMessage", {
        _id: chat._id,
        emergencyId,
        senderId,
        senderRole,
        message,
        timestamp: chat.timestamp
      });

    } catch (err) {
      console.error("Emergency chat error:", err.message);
    }
  });

  /**
   * Leave emergency room
   */
  socket.on("leaveEmergency", (payload) => {
    const { emergencyId } = payload;
    socket.leave(emergencyId);

    socket.emit("leftEmergency", {
      emergencyId,
      message: "Left emergency chat"
    });
  });

};
