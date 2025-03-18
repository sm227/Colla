import { NextResponse } from 'next/server';
import { removeTokenCookie } from '@/app/lib/auth';

export async function POST() {
  try {
    // 쿠키에서 토큰 삭제
    removeTokenCookie();

    return NextResponse.json(
      { message: '로그아웃 성공' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('로그아웃 오류:', error);
    return NextResponse.json(
      { message: '로그아웃 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
} 