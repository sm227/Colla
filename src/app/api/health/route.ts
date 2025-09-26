import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // 데이터베이스 연결 상태 확인
    await prisma.$queryRaw`SELECT 1`;

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'operational'
      },
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    };

    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);

    const errorStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        api: 'operational'
      },
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    return NextResponse.json(errorStatus, { status: 503 });
  } finally {
    await prisma.$disconnect();
  }
}