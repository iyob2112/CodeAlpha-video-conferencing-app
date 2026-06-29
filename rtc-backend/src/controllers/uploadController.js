const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

exports.uploadFile = [
  upload.single("file"),
  (req, res) => {
    res.json({
      file_url: `http://localhost:5000/uploads/${req.file.filename}`,
    });
  },
];