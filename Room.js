const mongoose = require("mongoose");

const room = mongoose.Schema({
  projectName: { type: String }, // dropdown menu
  subjectName: { type: String }, // blue text
  topicName: { type: String }, // red text
  roomName: { type: String }, // maroon text
  path: { type: String },
  error: { type: String, default: null }
});

const Room = mongoose.model("Room", room);
module.exports = Room;
