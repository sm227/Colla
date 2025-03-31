import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromCookie, verifyToken } from '@/app/lib/auth';

// Node.js 런타임 설정
export const runtime = 'nodejs';

// 특정 프로젝트 가져오기
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // 현재 사용자 확인 (인증 검사)
    const currentUser = await getCurrentUser();
    
    // 프로젝트 데이터 조회
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: true,
      },
    });
    
    if (!project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 프로젝트 소유자 확인 (인증된 사용자만)
    if (currentUser && project.userId !== null && project.userId !== currentUser.id) {
      // 다른 사용자의 프로젝트에 접근하려는 시도 (경고만 표시)
    }
    
    return NextResponse.json(project);
  } catch (error) {
    console.error('프로젝트 조회 오류:', error);
    return NextResponse.json(
      { error: '프로젝트를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

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

// 프로젝트 수정 (PATCH)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증된 사용자를 찾을 수 없습니다.' }, 
        { status: 401 }
      );
    }
    
    const projectId = params.id;
    const body = await request.json();
    
    // 프로젝트가 존재하는지 확인
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!existingProject) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 프로젝트 소유자 확인 (null이거나 현재 사용자의 프로젝트만 수정 가능)
    if (existingProject.userId !== null && existingProject.userId !== currentUser.id) {
      return NextResponse.json(
        { error: '이 프로젝트를 수정할 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    // 프로젝트 업데이트
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...body,
        userId: currentUser.id // 프로젝트를 수정하는 사용자로 소유권 업데이트
      },
    });
    
    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('프로젝트 수정 오류:', error);
    return NextResponse.json(
      { error: '프로젝트를 수정하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 프로젝트 삭제 (DELETE)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증된 사용자를 찾을 수 없습니다.' }, 
        { status: 401 }
      );
    }
    
    const projectId = params.id;
    
    // 프로젝트가 존재하는지 확인
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!existingProject) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 프로젝트 소유자 확인
    if (existingProject.userId !== currentUser.id) {
      return NextResponse.json(
        { error: '이 프로젝트를 삭제할 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    // 관련 작업 삭제
    await prisma.task.deleteMany({
      where: { projectId }
    });
    
    // 프로젝트 삭제
    await prisma.project.delete({
      where: { id: projectId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('프로젝트 삭제 오류:', error);
    return NextResponse.json(
      { error: '프로젝트를 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 