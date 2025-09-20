const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// 미들웨어 설정
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우트 설정
const tasksRoutes = require('./routes/tasks');
app.use('/api/tasks', tasksRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'Colla Backend API Server',
    version: '1.0.0',
    status: 'running'
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

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 Colla Backend Server running on port ${PORT}`);
  console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});