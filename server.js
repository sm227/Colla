import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { profile } from "node:console";
import onCall from "./socket-events/onCall.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

console.log("running ..")

export let io;

app.prepare().then(() => {
  const httpServer = createServer(handler);

  io = new Server(httpServer);
  let onlineUsers = []

  io.on("connection", (socket) => {
    console.log('client connected...')
    // ...
    // add user
    socket.on('addNewUser', (clerkUser => {
       clerkUser && ! onlineUsers.some(user => user?.userId === clerkUser.id) &&
       onlineUsers.push({
          userId : clerkUser.id,
          socketId : socket.id, 
          profile: clerkUser,
       })

       io.emit('getUsers', onlineUsers)
    }))
    socket.on('disconnect', () => {
      onlineUsers = onlineUsers.filter(user => user.socketId != socket.id)

      //send active users
       io.emit('getUsers', onlineUsers)

    }) 

    // call events
    socket.on('call', onCall)
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});

// Hocuspocus 서버 실행 스크립트
const { startHocuspocusServer } = require('./dist/lib/hocuspocus-server');

// Hocuspocus 서버 시작
startHocuspocusServer()
  .then(() => {
    console.log('Hocuspocus 서버가 시작되었습니다.');
  })
  .catch((error) => {
    console.error('Hocuspocus 서버 시작 중 오류가 발생했습니다:', error);
    process.exit(1);
  });