import express from "express";
import dotenv from "dotenv";
import data from "./data/data.js";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { connect } from "tls";

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

const server = http.createServer(app); // Create HTTP server using Express
const io = new Server(server); // Attach Socket.IO to the HTTP server

app.get("/", (req, res) => res.send("You are asking for data"));
app.get("/api/v1/chats/", (req, res) => res.send(data));
app.get("/api/v1/chats/:id/", (req, res) => {
  const singleChat = data.find((c) => c._id === req.params.id);
  res.send(singleChat);
});
const initalChats = [
  [{ username: "Admin", message: "Welcome" }],
  [{ username: "Admin", message: "Welcome" }],
  [{ username: "Admin", message: "Welcome" }],
];
let roomChats = [...initalChats.map((subarray) => [...subarray])];
let activeSockets = {};
const users = new Set();
// let roomChats = {};
users.add("rahul");

app.get("/api/v1/get-user/:username", (req, res) => {
  if (users.has(req.params.username)) {
    res.status(200).json({
      status: "succcess",
      check: false,
    });
  } else {
    res.status(200).json({
      status: "success",
      check: true,
    });
  }
});
app.post("/api/v1/add-user/", (req, res) => {
  users.add(req.body.username);

  res.status(201).json({
    status: "success",
  });
});
app.delete("/api/v1/delete-user", (req, res) => {
  users.delete(req.body.username);
  res.status(204).json({
    status: "success",
  });
});
// Socket.IO event handling
io.on("connection", function (socket) {
  console.log("connected!");
  socket.on("user-connect", (username) => {
    console.log(username, "connected");
    activeSockets[socket.id] = username;
    io.emit("getChats", roomChats);
  });
  socket.on("user-disconnect", (username) => {
    console.log(username, "disconnected");
    users.delete(activeSockets[socket.id]);
    if (Object.keys(activeSockets).length === 0) {
      console.log("No More Sockets");
      roomChats = [...initalChats.map((subarray) => [...subarray])];
    }
  });
  socket.on("disconnect", () => {
    users.delete(activeSockets[socket.id]);
    delete activeSockets[socket.id];
    if (Object.keys(activeSockets).length === 0) {
      console.log("No More Sockets");
      roomChats = [...initalChats.map((subarray) => [...subarray])];
    }
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
