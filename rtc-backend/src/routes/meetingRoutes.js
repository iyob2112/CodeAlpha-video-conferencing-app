const express = require("express");
const router = express.Router();

const meetingController = require("../controllers/meetingController");

// GET all meetings for a user
router.get("/user/:userId", meetingController.getMeetings);

// CREATE meeting
router.post("/", meetingController.createMeeting);

// JOIN by room code
router.post("/join/:code", meetingController.joinByCode);

// GET meeting by ID
router.get("/:id", meetingController.getMeetingById);

// UPDATE meeting
router.put("/:id", meetingController.updateMeeting);

module.exports = router;