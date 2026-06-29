const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    meeting_id: String,
    file_name: String,
    file_url: String,
    file_size: Number,
    uploaded_by: String,
    uploaded_by_id: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("File", fileSchema);