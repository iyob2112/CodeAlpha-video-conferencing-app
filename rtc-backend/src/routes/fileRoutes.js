const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const File = require("../models/File");

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith("image/");

    return {
      folder: "ConnectHub",
      resource_type: isImage ? "image" : "raw",
      public_id: Date.now() + "-" + file.originalname,
    };
  },
});

const upload = multer({ storage });

router.post("/upload", upload.single("file"), async (req, res) => {
    console.log(req.file);
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    res.json({
      file_url: req.file.path,
      file_name: req.file.originalname,
      file_size: req.file.size,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const file = await File.create(req.body);
    res.json(file);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

router.get("/:meetingId", async (req, res) => {
  try {
    const files = await File.find({
      meeting_id: req.params.meetingId,
    }).sort({
      createdAt: -1,
    });

    res.json(files);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.message,
    });
  }
});

module.exports = router;