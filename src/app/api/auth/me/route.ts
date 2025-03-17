import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getTokenFromCookie, verifyToken } from '@/app/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 쿠키에서 토큰 가져오기
    const token = getTokenFromCookie();

    // 토큰이 없는 경우
    if (!token) {
      return NextResponse.json(
        { message: '인증되지 않은 사용자입니다.', authenticated: false },
        { status: 401 }
      );
    }

    // 토큰 검증
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { message: '인증이 만료되었습니다. 다시 로그인해주세요.', authenticated: false },
        { status: 401 }
      );
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
    // 사용자가 존재하지 않는 경우
    if (!user) {
      return NextResponse.json(
        { message: '사용자를 찾을 수 없습니다.', authenticated: false },
        { status: 404 }
      );
    }

    // 사용자 정보 반환 (비밀번호 제외)
    const response = NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    }, { status: 200 });

    // 캐시 방지 헤더 추가
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    
    return response;
  } catch (error: any) {
    console.error('사용자 정보 조회 오류:', error);
    return NextResponse.json(
      { 
        message: '사용자 정보 조회 중 오류가 발생했습니다.', 
        error: error.message,
        authenticated: false 
      },
      { status: 500 }
    );
  }
} 