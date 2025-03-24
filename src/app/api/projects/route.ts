import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getTokenFromCookie, verifyToken } from '@/app/lib/auth';

// Node.js 런타임 설정
export const runtime = 'nodejs';

// 현재 사용자의 정보 가져오기
async function getCurrentUser() {
  try {
    // 쿠키에서 토큰 가져오기
    const token = getTokenFromCookie();

    // 토큰이 없으면 인증되지 않은 상태
    if (!token) {
      return null;
    }

    // 토큰 검증
    const decoded = verifyToken(token);
    
    if (!decoded || typeof decoded === 'string') {
      return null;
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
    return user;
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    return null;
  }
}

// 모든 프로젝트 가져오기 (현재 사용자의 프로젝트만)
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증된 사용자를 찾을 수 없습니다.' }, 
        { status: 401 }
      );
    }
    
    console.log('프로젝트 조회 중... 사용자 ID:', currentUser.id);
    
    // 현재 사용자의 프로젝트와 미할당 프로젝트 가져오기
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { userId: currentUser.id }, // 사용자 ID로 연결된 프로젝트
          { userId: null }            // userId가 null인 프로젝트
        ]
      },
      include: {
        tasks: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error('프로젝트 조회 오류:', error);
    return NextResponse.json(
      { error: '프로젝트를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 새 프로젝트 생성
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증된 사용자를 찾을 수 없습니다.' }, 
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    const { name, description } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: '프로젝트 이름은 필수입니다.' },
        { status: 400 }
      );
    }
    
    console.log('프로젝트 생성 중...', { name, description, userId: currentUser.id });
    
    // 프로젝트 생성 (userId 필드에 현재 사용자 ID 설정)
    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId: currentUser.id
      },
    });
    
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('프로젝트 생성 오류:', error);
    return NextResponse.json(
      { error: '프로젝트를 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 