import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { verifyPassword, createTokenEdge, setTokenCookie } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 요청 본문에서 데이터 추출
    const { email, password } = await request.json();

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

    // JWT 토큰 생성
    const token = await createTokenEdge({ id: user.id, email: user.email });

    // 쿠키에 토큰 저장
    setTokenCookie(token);

    // 비밀번호를 제외한 사용자 정보 반환
    const userWithoutPassword = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    // 응답 생성 - 토큰도 함께 반환
    const response = NextResponse.json(
      { 
        message: '로그인 성공', 
        user: userWithoutPassword,
        token: token // 클라이언트 측에서 localStorage에 저장하기 위해 토큰 포함
      },
      { status: 200 }
    );

    // 응답 헤더에 캐시 방지 설정 추가
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    
    return response;
  } catch (error: any) {
    console.error('로그인 오류:', error);
    return NextResponse.json(
      { message: '로그인 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
} 