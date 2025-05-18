import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyTokenEdge } from '@/app/lib/auth';

// 인증이 필요하지 않은 경로 목록
const publicPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/me',
  '/_next',
  '/favicon.ico',
  '/api/socket', // WebSocket 연결은 인증 없이 허용
];

// 환경 변수 확인 로그
console.log('JWT_SECRET 환경변수 설정 여부:', !!process.env.JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 디버깅을 위한 로그 (실제 배포 시 제거)
  console.log('미들웨어 실행:', pathname);
  
  // WebSocket 경로 특별 처리
  if (pathname.startsWith('/api/socket')) {
    const upgrade = request.headers.get('upgrade');
    if (upgrade?.toLowerCase() === 'websocket') {
      // WebSocket 연결을 환경 변수에 설정된 실제 Hocuspocus 서버로 리다이렉트
      const hocuspocusUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:1234';
      console.log(`WebSocket 연결을 ${hocuspocusUrl}로 리다이렉트합니다.`);
      return NextResponse.rewrite(new URL(hocuspocusUrl));
    }
  }
  
  // 공개 경로는 인증 검사 없이 통과
  if (publicPaths.some(path => pathname.startsWith(path))) {
    // 토큰이 있고 유효한 경우, 로그인 페이지에 있다면 홈으로 리디렉션
    if (pathname.startsWith('/auth/')) {
      const token = request.cookies.get('token')?.value;
      if (token) {
        try {
          const decoded = await verifyTokenEdge(token);
          if (decoded) {
            console.log('유효한 토큰으로 홈으로 리디렉션');
            return NextResponse.redirect(new URL('/', request.url));
          }
        } catch (error) {
          console.error('토큰 검증 오류:', error);
          // 토큰 검증 오류 시 쿠키 삭제
          const response = NextResponse.next();
          response.cookies.delete('token');
          return response;
        }
      }
    }
    return NextResponse.next();
  }
  
  // API 경로 처리
  if (pathname.startsWith('/api/')) {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { message: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }
    
    try {
      const decoded = await verifyTokenEdge(token);
      if (!decoded) {
        return NextResponse.json(
          { message: '인증이 만료되었습니다. 다시 로그인해주세요.' },
          { status: 401 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { message: '유효하지 않은 토큰입니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }
    
    return NextResponse.next();
  }
  
  // 페이지 경로 처리
  const token = request.cookies.get('token')?.value;
  
  // 토큰이 없는 경우 로그인 페이지로 리디렉션
  if (!token) {
    // 현재 경로가 이미 auth로 시작하는 경우 리디렉션하지 않음
    if (pathname.startsWith('/auth/')) {
      return NextResponse.next();
    }
    
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    console.log('토큰 없음, 리디렉션:', url.toString());
    return NextResponse.redirect(url);
  }
  
  // 토큰 검증
  try {
    console.log('토큰 검증 시도:', token.substring(0, 20) + '...');
    const decoded = await verifyTokenEdge(token);
    
    // 토큰이 유효하지 않은 경우
    if (!decoded) {
      console.log('유효하지 않은 토큰 - 검증 실패');
      // 토큰이 유효하지 않은 경우 쿠키 삭제 및 로그인 페이지로 리디렉션
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      response.cookies.delete('token');
      return response;
    }
    
    console.log('토큰 검증 성공, 사용자:', decoded);
    
    // 토큰이 유효하고 로그인 페이지에 있는 경우 홈으로 리디렉션
    if (pathname.startsWith('/auth/')) {
      console.log('로그인 페이지에서 홈으로 리디렉션');
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // 그 외의 경우 정상 진행
    return NextResponse.next();
  } catch (error) {
    console.error('토큰 검증 예외 발생:', error);
    // 토큰 검증 오류 시 쿠키 삭제 및 로그인 페이지로 리디렉션
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.cookies.delete('token');
    return response;
  }
}

// 미들웨어가 실행될 경로 설정
export const config = {
  matcher: [
    /*
     * 다음 경로에 미들웨어 적용:
     * - 모든 API 경로 (/api/*)
     * - 모든 페이지 경로 (/, /about, /dashboard 등)
     * 다음 경로는 제외:
     * - 정적 파일 (_next/static, _next/image, favicon.ico 등)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 