// app/api/socket/route.ts

import { Server as NetServer } from 'http';
import { NextRequest } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

let io: SocketIOServer;

const roomSchema = z.object({
  roomId: z.string(),
  userId: z.string(),
});

function initSocket(server: NetServer) {
  io = new SocketIOServer(server, {
    path: '/api/socket',
    addTrailingSlash: false,
  });

  io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.on('join-room', (data) => {
      try {
        const { roomId, userId } = roomSchema.parse(data);
        console.log(`User ${userId} joined room ${roomId}`);
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId);
        
        socket.on('disconnect', () => {
          console.log(`User ${userId} left room ${roomId}`);
          socket.to(roomId).emit('user-disconnected', userId);
        });
      } catch (error) {
        console.error('Invalid room data:', error);
      }
    });
  });

  return io;
}

export async function GET(req: NextRequest) {
  // @ts-ignore
  if (!io && req.socket.server.io === undefined) {
    console.log('Socket is initializing');
    // @ts-ignore
    initSocket(req.socket.server);
  } else {
    console.log('Socket is already running');
  }

  return new Response('Socket.IO is running', { status: 200 });
}