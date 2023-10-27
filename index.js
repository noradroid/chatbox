import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";

const app = express();

const server = app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});

app.get("/", (req, res) => {
  res.sendFile(fileURLToPath(new URL("./index.html", import.meta.url)));
});

let rooms = {}; // { room: { users: [], msgs: [] } }

let users = {}; // { socket.id: roomCode }
// { user: { rooms: [] } }

function isUserExist(user) {
  return user in users;
}

function addUser(user) {
  if (!isUserExist(user)) {
    users[user] = { rooms: [] };
  }
}

function sendRooms(user) {
  io.emit(user, users[user].rooms, "rooms");
}

function isRoomExist(room) {
  return room in rooms;
}

function createRoom(room) {
  if (!isRoomExist(room)) {
    rooms[room] = { users: [], msgs: [] };
  }
}

function joinRoom(user, room, socket) {
  console.log(`Letting user ${user} join room ${room}`);
  createRoom(room);
  if (!isUserInRoom(user, room)) {
    rooms[room].users.push(user);
    users[user].rooms.push(room);
    socket.join(room);
  }
  sendRooms(user);
}

function sendRoomMsgs(user, room) {
  io.emit(user, rooms[room].msgs, "msgs");
}

function isUserInRoom(user, room) {
  return rooms[room].users.some((u) => u === user);
}

function handleMsg(msg, user, room) {
  // const roomCode = users[socket.id];
  console.log("sending to: " + room);
  // io.to(roomCode).emit("chat message", msg);
  rooms[room].msgs.push(msg);
  io.to(room).emit("chat message", msg, user, room);
}

const io = new Server(server);

io.on("connection", (socket) => {
  console.log(`A user (id: ${socket.id}) connected!`);
  socket.on("input name", (name) => {
    addUser(name);
    sendRooms(name);
  });
  socket.on("join room", (username, roomCode) => {
    joinRoom(username, roomCode, socket);
  });
  socket.on("enter room", (username, roomCode) => {
    console.log(`User ${username} entered room ${roomCode}`);
    sendRoomMsgs(username, roomCode);
  });
  socket.on("chat message", (msg, user, room) => {
    console.log("message received: " + msg);
    if (isUserExist(user) && isRoomExist(room) && isUserInRoom(user, room)) {
      handleMsg(msg, user, room);
    } else {
      console.log("not sending anywhere");
    }
  });
  socket.on("disconnect", () => {
    console.log(`A user (id: ${socket.id}) disconnected!`);
    // if (socket.id in users) {
    //   const roomCode = users[socket.id];
    //   socket.leave(roomCode);
    //   delete users[socket.id];
    //   rooms[roomCode].users = rooms[roomCode].users.filter(
    //     (x) => x !== socket.id
    //   );
    // }
  });
});
