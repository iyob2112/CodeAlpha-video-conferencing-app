const Message = require("../models/Message");

// GET messages
exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      meeting_id: req.params.meetingId,
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE message
exports.createMessage = async (req, res) => {
  try {
    const msg = await Message.create(req.body);
    res.json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};