import express from "express";
import dotenv from "dotenv";
import data from "./data/data.js";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { connect } from "tls";

const app = express();
app.use(cors());

dotenv.config();

let roomChats = [
  [{ username: "u1", message: "u1 chat" }],
  [{ username: "u2", message: "u2 chat" }],
  [{ username: "u3", message: "u3 chat" }],
];

const server = http.createServer(app); // Create HTTP server using Express
const io = new Server(server); // Attach Socket.IO to the HTTP server

app.get("/", (req, res) => res.send("You are asking for data"));
app.get("/api/v1/chats/", (req, res) => res.send(data));
app.get("/api/v1/chats/:id/", (req, res) => {
  const singleChat = data.find((c) => c._id === req.params.id);
  res.send(singleChat);
});

// let roomChats = {};

// Socket.IO event handling
io.on("connection", function (socket) {
  console.log("connected!");
  socket.on("user-connect", (username) => {
    console.log(username, "connected");
    io.emit("getChats", roomChats);
  });

  socket.on("setChats", (activeRoom, username, newMessage) => {
    roomChats[activeRoom].push({ username, message: newMessage });
    io.emit("getChats", roomChats);
  });
  // Create a new room
  socket.on("createRoom", function (room) {
    if (!roomChats[room]) {
      roomChats[room] = [];
      io.emit("avlRooms", Object.keys(roomChats)); // Broadcast updated list of available rooms
    }
  });
  // Join a room
  socket.on("joinRoom", function (room) {
    if (roomChats[room]) {
      socket.join(room); // Join the specified room
      socket.emit("getData", roomChats[room]); // Emit existing chat data for the room
    } else {
      // Handle error: Room does not exist
      socket.emit("error", "Room does not exist");
    }
  });
  // Store Chats
  socket.on("storeChats", function (data) {
    const roomId = data.roomId;
    const text = data.text;
    if (!roomId || !text) {
      // Handle error: Invalid message data
      socket.emit("error", "Invalid message data");
    } else if (!roomChats[roomId]) {
      // Handle error: Room does not exist
      socket.emit("error", "Room does not exist");
    } else {
      // Store message in the appropriate room's chat array
      roomChats[roomId].push({ text });
      // Emit updated chat data to all clients in the room
      io.to(roomId).emit("getData", roomChats[roomId]);
    }
  });
  socket.on("disconnect", function () {
    console.log("Socket disconnected");
  });
});

const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`Server running on port ${port}`));

//--------------------------------------------------------------
// 1.  brodcast to all users
// io.emit("brodcast", { message:  "message for all" });
// 2. Sending Messages to the Sender only (using custom events)
// socket.emit("brodcast", { message: `HIi Welcome` });
// 3. Sending Messages to Everyone Except the Sender
// socket.broadcast.emit("brodcast", { message: `message for all except sender` });
//---------------------------------------------------------------------
// broadcast to all connected clients except those in the room
// io.except("roomName").emit("hello", "world not in room");
//---------------------------------------------------------------
// broadcast to all connected clients in the room
// io.to("roomName").emit("hello", "world");
