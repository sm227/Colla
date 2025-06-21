import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { verifyPassword, createTokenEdge } from '@/app/lib/auth';

// 동적 라우트로 설정하여 정적 생성 방지
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 요청 본문에서 데이터 추출
    const { email, password, rememberMe = false } = await request.json();

    // 필수 필드 검증
    if (!email || !password) {
      return NextResponse.json(
        { message: '이메일과 비밀번호를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    // 사용자가 존재하지 않는 경우
    if (!user) {
      return NextResponse.json(
        { message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 비밀번호 확인
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // JWT 토큰 생성 (rememberMe 옵션 전달)
    const token = await createTokenEdge({ id: user.id, email: user.email }, rememberMe);

    // 비밀번호를 제외한 사용자 정보 반환
    const userWithoutPassword = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    // 응답 생성 - 쿠키와 응답 본문에 토큰 포함
    const response = NextResponse.json(
      { 
        message: '로그인 성공', 
        user: userWithoutPassword,
        token: token
      },
      { status: 200 }
    );

    // 쿠키에 토큰 설정 (Next.js 13+ 방식)
    // rememberMe가 true면 15일, false면 기본 1일
    const maxAge = rememberMe ? 60 * 60 * 24 * 15 : 60 * 60 * 24; // 15일 또는 1일
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: maxAge,
      path: '/',
      sameSite: 'lax', // 외부 사이트에서 링크로 접속할 때도 쿠키 전송 허용
    });

    // 응답 헤더에 캐시 방지 설정 추가
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    
    return response;
  } catch (error: unknown) {
    console.error('로그인 오류:', error);
    return NextResponse.json(
      { message: '로그인 중 오류가 발생했습니다.', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET 메서드 추가 (빌드 시 페이지 데이터 수집을 위해)
export async function GET() {
  return NextResponse.json(
    { message: 'Login endpoint' },
    { status: 200 }
  );
} 