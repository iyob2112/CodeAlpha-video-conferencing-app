const Stroke = require("../models/Stroke");

// GET all strokes for a meeting (load history when whiteboard opens)
exports.getStrokes = async (req, res) => {
  try {
    const strokes = await Stroke.find({
      meetingId: req.params.meetingId,
    }).sort({ createdAt: 1 });

    res.json(strokes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST a new stroke (persists it; live broadcast happens via socket separately)
exports.createStroke = async (req, res) => {
  try {
    const { meetingId, points, tool, color, width, authorId } = req.body;

    if (!meetingId || !points || points.length < 2) {
      return res.status(400).json({ message: "meetingId and at least 2 points are required" });
    }

    const stroke = await Stroke.create({
      meetingId,
      points,
      tool,
      color,
      width,
      authorId,
    });

    res.json(stroke);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE all strokes for a meeting (clear board)
exports.clearStrokes = async (req, res) => {
  try {
    await Stroke.deleteMany({ meetingId: req.params.meetingId });
    res.json({ message: "Board cleared" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};