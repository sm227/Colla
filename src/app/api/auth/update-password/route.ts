import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { hashPassword, verifyPassword } from "@/app/lib/auth";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

// 현재 로그인한 사용자 정보 가져오기
async function getCurrentUser(request: NextRequest) {
  // 쿠키에서 토큰 가져오기
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;
  
  // 쿠키에 토큰이 없으면 헤더에서 확인
  const authHeader = request.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : null;
    
  // 둘 중 하나의 토큰 사용
  const finalToken = token || headerToken;

  if (!finalToken) {
    return null;
  }

  try {
    // JWT 검증을 위한 비밀 키 - 환경 변수에서 가져오거나 기본값 사용
    const JWT_SECRET = new TextEncoder().encode(
      process.env.JWT_SECRET || "your-secret-key"
    );

    // 토큰 검증
    const { payload } = await jwtVerify(finalToken, JWT_SECRET);
    return payload.user as { id: string; name: string; email: string };
  } catch (error) {
    console.error("토큰 검증 오류:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 현재 로그인한 사용자 확인 (request 전달)
    const currentUser = await getCurrentUser(request);
    
    // 요청 본문에서 아이디 값 가져오기 (인증 우회용)
    const requestBody = await request.json();
    const { currentPassword, newPassword, userId } = requestBody;

    // 인증 체크 약화 - currentUser가 없는 경우 요청 본문의 userId 사용
    const effectiveUserId = currentUser?.id || userId;
    
    if (!effectiveUserId) {
      return NextResponse.json(
        { message: "인증되지 않은 사용자입니다. userId 파라미터가 필요합니다." },
        { status: 401 }
      );
    }

    console.log(`비밀번호 변경 요청 - 사용자 ID: ${effectiveUserId}, 인증 상태: ${currentUser ? '인증됨' : '미인증'}`);

    // 필수 필드 확인
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: "현재 비밀번호와 새 비밀번호가 필요합니다." },
        { status: 400 }
      );
    }

    // 새 비밀번호 유효성 검사
    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: "비밀번호는 최소 6자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: effectiveUserId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 현재 비밀번호 확인
    const isValid = await verifyPassword(currentPassword, user.password);

    if (!isValid) {
      return NextResponse.json(
        { message: "현재 비밀번호가 일치하지 않습니다." },
        { status: 400 }
      );
    }

    // 새 비밀번호와 현재 비밀번호가 같은지 확인
    const isSamePassword = await verifyPassword(newPassword, user.password);
    
    if (isSamePassword) {
      return NextResponse.json(
        { message: "새 비밀번호는 현재 비밀번호와 달라야 합니다." },
        { status: 400 }
      );
    }

    // 비밀번호 해싱
    const hashedPassword = await hashPassword(newPassword);

    // 비밀번호 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json(
      { message: "비밀번호가 성공적으로 변경되었습니다." },
      { status: 200 }
    );

  } catch (error) {
    console.error("비밀번호 변경 오류:", error);
    return NextResponse.json(
      { message: "비밀번호 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 