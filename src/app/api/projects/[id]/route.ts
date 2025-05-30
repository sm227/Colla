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
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
    });
    
    if (!project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 프로젝트 접근 권한 확인
    if (currentUser) {
      // 1. 프로젝트 소유자인 경우
      const isOwner = project.userId === currentUser.id;
      
      // 2. 프로젝트 멤버인 경우
      const isMember = project.members.some(
        member => member.userId === currentUser.id && member.inviteStatus === "accepted"
      );
      
      // 권한이 없는 경우
      if (!isOwner && !isMember) {
        return NextResponse.json(
          { error: '이 프로젝트에 접근할 권한이 없습니다.' },
          { status: 403 }
        );
      }
    } else {
      // 인증되지 않은 사용자
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
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
      where: { id: projectId },
      include: {
        members: true
      }
    });
    
    if (!existingProject) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 프로젝트 권한 확인
    // 소유자이거나 admin 역할의 멤버만 수정 가능
    const isOwner = existingProject.userId === currentUser.id;
    const isAdmin = existingProject.members.some(
      member => member.userId === currentUser.id && 
                member.inviteStatus === "accepted" && 
                member.role === "admin"
    );
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: '이 프로젝트를 수정할 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    // 프로젝트 업데이트 (소유자는 변경하지 않음)
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: body.name,
        description: body.description,
        // userId는 업데이트하지 않음 (소유자 변경 방지)
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
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