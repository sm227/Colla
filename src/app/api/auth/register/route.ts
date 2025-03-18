import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { hashPassword } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 요청 본문에서 데이터 추출
    const { name, email, password } = await request.json();

    // 필수 필드 검증
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 비밀번호 길이 검증
    if (password.length < 8) {
      return NextResponse.json(
        { message: '비밀번호는 최소 8자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: '이미 사용 중인 이메일입니다.' },
        { status: 409 }
      );
    }

    // 비밀번호 해싱
    const hashedPassword = await hashPassword(password);

    // 새 사용자 생성
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // 비밀번호를 제외한 사용자 정보 반환
    const userWithoutPassword = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    return NextResponse.json(
      { message: '회원가입이 완료되었습니다.', user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('회원가입 오류:', error);
    return NextResponse.json(
      { message: '회원가입 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
} 