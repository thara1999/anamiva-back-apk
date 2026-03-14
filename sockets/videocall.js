/**
 * Video Call Socket Handler
 * Handles WebRTC signaling for peer-to-peer video calls
 */
module.exports = (io, socket) => {

  /**
   * Join a video call room
   * payload: { roomId, userId, role }
   */
  socket.on("join-call-room", (payload) => {
    const { roomId, userId, role } = payload;

    if (!roomId || !userId) {
      return socket.emit("error", { message: "Invalid join-call-room request" });
    }

    const room = `call_${roomId}`;
    socket.join(room);
    socket.callRoomId = room;
    socket.callUserId = userId;

    console.log(`📹 ${role} (${userId}) joined call room: ${roomId}`);

    // Notify the other participant that a peer has joined
    socket.to(room).emit("peer-joined", { userId, role });
  });

  /**
   * Relay WebRTC SDP offer to the other peer
   * payload: { roomId, offer }
   */
  socket.on("webrtc-offer", (payload) => {
    const { roomId, offer } = payload;
    if (!roomId || !offer) return;

    socket.to(`call_${roomId}`).emit("webrtc-offer", {
      offer,
      from: socket.callUserId,
    });
  });

  /**
   * Relay WebRTC SDP answer to the other peer
   * payload: { roomId, answer }
   */
  socket.on("webrtc-answer", (payload) => {
    const { roomId, answer } = payload;
    if (!roomId || !answer) return;

    socket.to(`call_${roomId}`).emit("webrtc-answer", {
      answer,
      from: socket.callUserId,
    });
  });

  /**
   * Relay ICE candidate to the other peer
   * payload: { roomId, candidate }
   */
  socket.on("webrtc-ice-candidate", (payload) => {
    const { roomId, candidate } = payload;
    if (!roomId || !candidate) return;

    socket.to(`call_${roomId}`).emit("webrtc-ice-candidate", {
      candidate,
      from: socket.callUserId,
    });
  });

  /**
   * Relay audio toggle state to the other peer
   * payload: { roomId, isMuted }
   */
  socket.on("peer-toggle-audio", (payload) => {
    const { roomId, isMuted } = payload;
    if (!roomId) return;

    socket.to(`call_${roomId}`).emit("peer-toggle-audio", {
      userId: socket.callUserId,
      isMuted,
    });
  });

  /**
   * Relay video toggle state to the other peer
   * payload: { roomId, isVideoOff }
   */
  socket.on("peer-toggle-video", (payload) => {
    const { roomId, isVideoOff } = payload;
    if (!roomId) return;

    socket.to(`call_${roomId}`).emit("peer-toggle-video", {
      userId: socket.callUserId,
      isVideoOff,
    });
  });

  /**
   * Leave a video call room
   * payload: { roomId }
   */
  socket.on("leave-call-room", (payload) => {
    const { roomId } = payload;
    if (!roomId) return;

    const room = `call_${roomId}`;
    socket.to(room).emit("peer-left", { userId: socket.callUserId });
    socket.leave(room);
    socket.callRoomId = null;

    console.log(`📹 User left call room: ${roomId}`);
  });
};
