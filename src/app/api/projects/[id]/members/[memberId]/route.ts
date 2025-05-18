import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getTokenFromCookie, verifyToken } from '@/app/lib/auth';

// Node.js 런타임 설정
export const runtime = 'nodejs';

// 현재 사용자의 정보 가져오기
async function getCurrentUser() {
  try {
    const token = getTokenFromCookie();
    if (!token) return null;
    const decoded = verifyToken(token);
    if (!decoded || typeof decoded === 'string') return null;
    return await prisma.user.findUnique({ where: { id: decoded.id } });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    return null;
  }
}

// 멤버 정보 가져오기
export async function GET(
  request: Request,
  { params }: { params: { id: string, memberId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증된 사용자를 찾을 수 없습니다.' }, 
        { status: 401 }
      );
    }

    const { id: projectId, memberId } = params;
    
    // 프로젝트 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true }
    });

    if (!project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 접근 권한 확인
    const isOwner = project.userId === currentUser.id;
    const isMember = project.members.some(
      member => member.userId === currentUser.id && member.inviteStatus === "accepted"
    );

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: '이 프로젝트의 멤버 정보를 볼 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 멤버 조회
    const member = await prisma.projectMember.findUnique({
      where: { 
        id: memberId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!member || member.projectId !== projectId) {
      return NextResponse.json(
        { error: '멤버를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error('멤버 조회 오류:', error);
    return NextResponse.json(
      { error: '멤버 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 멤버 역할 업데이트
export async function PATCH(
  request: Request,
  { params }: { params: { id: string, memberId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증된 사용자를 찾을 수 없습니다.' }, 
        { status: 401 }
      );
    }

    const { id: projectId, memberId } = params;
    const { role } = await request.json();
    
    // 프로젝트 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true }
    });

    if (!project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인 (프로젝트 소유자만 멤버 역할 변경 가능)
    if (project.userId !== currentUser.id) {
      return NextResponse.json(
        { error: '이 프로젝트의 멤버 역할을 변경할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 멤버 확인
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.projectId !== projectId) {
      return NextResponse.json(
        { error: '멤버를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 멤버 역할 업데이트
    const updatedMember = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('멤버 역할 업데이트 오류:', error);
    return NextResponse.json(
      { error: '멤버 역할을 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 멤버 제거
export async function DELETE(
  request: Request,
  { params }: { params: { id: string, memberId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증된 사용자를 찾을 수 없습니다.' }, 
        { status: 401 }
      );
    }

    const { id: projectId, memberId } = params;
    
    // 프로젝트 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true }
    });

    if (!project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 멤버 확인
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: { user: true }
    });

    if (!member || member.projectId !== projectId) {
      return NextResponse.json(
        { error: '멤버를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인
    // 1. 프로젝트 소유자는 모든 멤버 제거 가능
    // 2. admin 역할 멤버는 일반 멤버 제거 가능 (다른 admin은 제거 불가)
    // 3. 자기 자신은 제거 가능 (프로젝트 탈퇴)
    const isOwner = project.userId === currentUser.id;
    const isSelf = member.userId === currentUser.id;
    const isAdmin = project.members.some(
      m => m.userId === currentUser.id && 
           m.inviteStatus === "accepted" && 
           m.role === "admin"
    );
    const targetIsAdmin = member.role === "admin";

    if (!isOwner && !isSelf && !(isAdmin && !targetIsAdmin)) {
      return NextResponse.json(
        { error: '이 멤버를 제거할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 멤버 제거
    await prisma.projectMember.delete({
      where: { id: memberId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('멤버 제거 오류:', error);
    return NextResponse.json(
      { error: '멤버를 제거하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 