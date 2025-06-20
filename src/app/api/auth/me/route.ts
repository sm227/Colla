import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getTokenFromCookie, verifyToken } from '@/app/lib/auth';

// 동적 라우트로 설정하여 정적 생성 방지
export const dynamic = 'force-dynamic';
// Edge 런타임을 사용하지 않고 Node.js 런타임을 사용하도록 설정
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/auth/me 요청 시작');
    
    // 쿠키에서 토큰 가져오기
    const token = getTokenFromCookie();
    console.log('토큰 확인:', token ? '토큰 있음' : '토큰 없음');

    // 토큰이 없는 경우
    if (!token) {
      console.log('토큰 없음, 401 응답 반환');
      return NextResponse.json(
        { message: '인증되지 않은 사용자입니다.', authenticated: false },
        { status: 401 }
      );
    }

    // 토큰 검증
    console.log('토큰 검증 시작');
    const decoded = verifyToken(token);
    console.log('토큰 검증 결과:', decoded ? '검증 성공' : '검증 실패');
    
    if (!decoded) {
      console.log('토큰 검증 실패, 401 응답 반환');
      return NextResponse.json(
        { message: '인증이 만료되었습니다. 다시 로그인해주세요.', authenticated: false },
        { status: 401 }
      );
    }

    // decoded 객체 확인
    console.log('Decoded 정보:', decoded);
    const userId = typeof decoded === 'string' ? decoded : decoded.id;
    console.log('사용자 ID:', userId);

    // 사용자 조회
    console.log('사용자 정보 조회 시작');
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    console.log('사용자 조회 결과:', user ? '사용자 찾음' : '사용자 없음');
    
    // 사용자가 존재하지 않는 경우
    if (!user) {
      console.log('사용자 없음, 404 응답 반환');
      return NextResponse.json(
        { message: '사용자를 찾을 수 없습니다.', authenticated: false },
        { status: 404 }
      );
    }

    // 사용자 정보 반환 (비밀번호 제외)
    console.log('사용자 정보 반환 성공');
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
  } catch (error: unknown) {
    console.error('사용자 정보 조회 오류:', error);
    return NextResponse.json(
      { 
        message: '사용자 정보 조회 중 오류가 발생했습니다.', 
        error: error instanceof Error ? error.message : 'Unknown error',
        authenticated: false 
      },
      { status: 500 }
    );
  }
} 