const Meeting = require("../models/Meeting");

// GET user meetings
exports.getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({
      host_id: req.params.userId,
    }).sort({ createdAt: -1 });

    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE meeting
exports.createMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.create(req.body);
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// JOIN by code
exports.joinByCode = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const meeting = await Meeting.findOne({
      room_code: req.params.code,
    });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    // remove nulls first (IMPORTANT FIX)
    meeting.participants = meeting.participants.filter(Boolean);

    // avoid duplicates
    if (!meeting.participants.includes(userId)) {
      meeting.participants.push(userId);
    }

    await meeting.save();

    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET by ID
exports.getMeetingById = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE
exports.updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};