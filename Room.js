const mongoose = require("mongoose");

const room = mongoose.Schema({
  projectName: { type: String }, // dropdown menu
  subjectName: { type: String }, // blue text
  topicName: { type: String }, // red text
  roomName: { type: String }, // maroon text
  users: [{ type: String }],
  fileName: { type: String }
});

const Room = mongoose.model("Room", room);
module.exports = Room;
