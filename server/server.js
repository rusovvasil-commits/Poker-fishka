
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Ваш серверний код тут

server.listen(3000, () => {
    console.log("Server is running on port 3000");
});
