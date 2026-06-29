const express = require("express");
const router = express.Router();
const whiteboardController = require("../controllers/whiteboardController");

// GET all strokes for a meeting
router.get("/:meetingId", whiteboardController.getStrokes);

// POST a new stroke
router.post("/", whiteboardController.createStroke);

// DELETE all strokes for a meeting (clear board)
router.delete("/:meetingId", whiteboardController.clearStrokes);

module.exports = router;