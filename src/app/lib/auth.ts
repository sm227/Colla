import { compare, hash } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { jwtVerify, SignJWT } from 'jose';

// 비밀번호 해싱
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 10);
}

// 비밀번호 검증
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await compare(password, hashedPassword);
}

// JWT 토큰 생성 (Node.js 환경용)
export function createToken(payload: any): string {
  return sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '7d',
  });
}

// Edge 호환 JWT 토큰 생성 (jose 라이브러리 사용)
export async function createTokenEdge(payload: any, rememberMe = false): Promise<string> {
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback_secret'
  );
  
  // rememberMe가 true면 15일, false면 1일
  const expirationTime = rememberMe ? '15d' : '1d';
  
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secret);
  
  return token;
}

// JWT 토큰 검증 (Node.js 환경용)
export function verifyToken(token: string) {
  try {
    // JWT 검증 시 더 자세한 로그 추가
    console.log('토큰 검증 시작:', token.substring(0, 20) + '...');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    console.log('토큰 검증 성공:', decoded);
    return decoded;
  } catch (error) {
    // 오류 세부 정보 로깅
    console.error('토큰 검증 실패:', error);
    return null;
  }
}

// Edge 런타임용 JWT 토큰 검증 (jose 라이브러리 사용)
export async function verifyTokenEdge(token: string) {
  if (!token) return null;
  
  try {
    console.log('Edge 토큰 검증 시작:', token.substring(0, 20) + '...');
    
    // jose 라이브러리는 TextEncoder를 사용하여 시크릿을 인코딩
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'fallback_secret'
    );
    
    const { payload } = await jwtVerify(token, secret);
    console.log('Edge 토큰 검증 성공:', payload);
    return payload;
  } catch (error) {
    console.error('Edge 토큰 검증 실패:', error);
    return null;
  }
}

// 쿠키에 토큰 설정
export function setTokenCookie(token: string, rememberMe = false) {
  const cookieStore = cookies();
  const maxAge = rememberMe ? 60 * 60 * 24 * 15 : 60 * 60 * 24 * 7; // 15일 또는 7일
  
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAge,
    path: '/',
    sameSite: 'lax', // 외부 사이트에서 링크로 접속할 때도 쿠키 전송 허용
  });
}

// 쿠키에서 토큰 삭제
export function removeTokenCookie() {
  const cookieStore = cookies();
  cookieStore.delete('token');
}

// 쿠키에서 토큰 가져오기
export function getTokenFromCookie() {
  const cookieStore = cookies();
  return cookieStore.get('token')?.value;
} 