// server.ts
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    path: '/api/socket',
    addTrailingSlash: false,
  });

  io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.on('join-room', (roomId: string, userId: string) => {
      console.log(`User ${userId} joined room ${roomId}`);
      socket.join(roomId);
      socket.to(roomId).emit('user-connected', userId);
      
      socket.on('disconnect', () => {
        console.log(`User ${userId} left room ${roomId}`);
        socket.to(roomId).emit('user-disconnected', userId);
      });
    });
  });

  app.all('*', (req, res) => nextHandler(req, res));

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});