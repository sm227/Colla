const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    // 개발 환경에서는 모든 origin 허용
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    // origin이 없는 경우 (같은 origin) 또는 허용된 origin인 경우
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires']
};

module.exports = cors(corsOptions);