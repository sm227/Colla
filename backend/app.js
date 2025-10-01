const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// HTTP 서버 생성
const httpServer = http.createServer(app);

// Socket.IO 서버 생성
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket.IO 핸들러 초기화
const { initializeSocketHandlers } = require('./socket/handlers');
initializeSocketHandlers(io);

// 미들웨어 설정
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우트 설정
const tasksRoutes = require('./routes/tasks');
const epicsRoutes = require('./routes/epics');
const meetingsRoutes = require('./routes/meetings');

app.use('/api/tasks', tasksRoutes);
app.use('/api/epics', epicsRoutes);
app.use('/api/meetings', meetingsRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'Colla Backend API Server',
    version: '1.0.0',
    status: 'running',
    features: ['REST API', 'Socket.IO', 'Real-time Communication']
  });
});

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 서버 시작 (HTTP + Socket.IO)
httpServer.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 Colla Backend Server Started');
  console.log('='.repeat(60));
  console.log(`📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`⚡ Socket.IO: ws://localhost:${PORT}`);
  console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('='.repeat(60));
  console.log('✅ Available Routes:');
  console.log('   - GET  /');
  console.log('   - REST /api/tasks');
  console.log('   - REST /api/epics');
  console.log('   - REST /api/meetings');
  console.log('   - WS   Socket.IO');
  console.log('='.repeat(60));
});

// Export io for potential use in other modules
module.exports = { io };