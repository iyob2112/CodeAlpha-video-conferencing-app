const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema(
  {
    x: Number,
    y: Number,
  },
  { _id: false }
);

const strokeSchema = new mongoose.Schema(
  {
    meetingId: { type: String, index: true },
    points: [pointSchema],
    tool: String, // "pen" | "eraser" | "line" | "rect" | "circle"
    color: String,
    width: Number,
    authorId: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stroke", strokeSchema);