const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    meeting_id: String,
    sender_name: String,
    sender_id: String,
    content: String,
    type: { type: String, default: "text" },
    file_url: String,
    file_name: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("MeetingMessage", messageSchema);