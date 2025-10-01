// 루트 디렉토리의 @prisma/client 사용
const { PrismaClient } = require('../../node_modules/@prisma/client');
const path = require('path');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // 개발 환경에서는 global을 사용하여 재연결 방지
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['warn', 'error'],
    });
  }
  prisma = global.prisma;
}

module.exports = { prisma };