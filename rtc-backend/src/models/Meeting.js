const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
  {
    title: String,
    room_code: String,
    status: { type: String, default: "active" },

    host_name: String,
    host_id: String,

    participants: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Meeting", meetingSchema);