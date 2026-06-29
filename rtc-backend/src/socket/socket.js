const Message = require("../models/Message");

// roomId -> Map<socketId, { userId, name }>
const rooms = new Map();

function getRoomUsers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.entries()).map(([socketId, info]) => ({
    socketId,
    userId: info.userId,
    name: info.name,
  }));
}

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ---- Room presence ----
    socket.on("join_room", ({ roomId, userId, name }) => {
      if (!roomId) return;

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userId = userId;
      socket.data.name = name;

      if (!rooms.has(roomId)) rooms.set(roomId, new Map());
      const room = rooms.get(roomId);

      // Tell the new joiner who is already in the room
      const existingUsers = getRoomUsers(roomId);
      socket.emit("room_users", existingUsers);

      // Add the new joiner to the room map
      room.set(socket.id, { userId, name });

      // Tell everyone else a new user joined
      socket.to(roomId).emit("user_joined", {
        socketId: socket.id,
        userId,
        name,
      });
    });

    // ---- WebRTC signaling (targeted, per-peer) ----
    // data: { to: socketId, from: socketId, sdp }
    socket.on("webrtc_offer", (data) => {
      io.to(data.to).emit("webrtc_offer", {
        from: socket.id,
        sdp: data.sdp,
      });
    });

    socket.on("webrtc_answer", (data) => {
      io.to(data.to).emit("webrtc_answer", {
        from: socket.id,
        sdp: data.sdp,
      });
    });

    socket.on("webrtc_ice_candidate", (data) => {
      io.to(data.to).emit("webrtc_ice_candidate", {
        from: socket.id,
        candidate: data.candidate,
      });
    });

    // ---- Live chat ----
    socket.on("send_message", async (data) => {
      try {
        const newMessage = await Message.create({
          meeting_id: data.meeting_id,
          sender_id: data.sender_id,
          sender_name: data.sender_name,
          content: data.content,
          type: data.type || "text",
          file_url: data.file_url,
          file_name: data.file_name,
        });

        io.to(data.roomId).emit("receive_message", newMessage);
      } catch (err) {
        console.error("send_message error:", err.message);
      }
    });

    // ---- Whiteboard ----
    socket.on("whiteboard_draw", (data) => {
      // data: { roomId, ...drawing payload }
      socket.to(data.roomId).emit("whiteboard_draw", data);
    });

    socket.on("whiteboard_clear", (data) => {
      socket.to(data.roomId).emit("whiteboard_clear");
    });

    // ---- Disconnect cleanup ----
    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;
      console.log("Socket disconnected:", socket.id);

      if (roomId && rooms.has(roomId)) {
        const room = rooms.get(roomId);
        room.delete(socket.id);
        if (room.size === 0) {
          rooms.delete(roomId);
        }

        socket.to(roomId).emit("user_left", { socketId: socket.id });
      }
    });
  });
};

module.exports = socketHandler;