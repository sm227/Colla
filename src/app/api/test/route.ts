import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'API 라우트가 작동합니다!' });
} 