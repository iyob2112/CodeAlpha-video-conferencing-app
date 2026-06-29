const express = require("express");
const router = express.Router();
const controller = require("../controllers/messageController");

router.get("/:meetingId", controller.getMessages);
router.post("/", controller.createMessage);

module.exports = router;