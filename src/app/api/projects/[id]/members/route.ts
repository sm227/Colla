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

// 프로젝트 멤버 목록 가져오기
export async function GET(
  request: Request,
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
    
    // 프로젝트 존재 여부 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
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

    if (!project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 접근 권한 확인 (프로젝트 소유자 또는 멤버만 접근 가능)
    const isOwner = project.userId === currentUser.id;
    const isMember = project.members.some(
      member => member.userId === currentUser.id && member.inviteStatus === "accepted"
    );

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: '이 프로젝트의 멤버 목록을 볼 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 멤버 목록 반환
    return NextResponse.json(project.members);
  } catch (error) {
    console.error('프로젝트 멤버 조회 오류:', error);
    return NextResponse.json(
      { error: '프로젝트 멤버를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 프로젝트에 새 멤버 초대
export async function POST(
  request: Request,
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
    const { email, role = 'member' } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: '초대할 사용자의 이메일은 필수입니다.' },
        { status: 400 }
      );
    }

    // 프로젝트 존재 여부 확인
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

    // 권한 확인 (프로젝트 소유자 또는 admin 역할의 멤버만 초대 가능)
    const isOwner = project.userId === currentUser.id;
    const isAdmin = project.members.some(
      member => member.userId === currentUser.id && 
                member.inviteStatus === "accepted" && 
                member.role === "admin"
    );

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: '이 프로젝트에 멤버를 초대할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 초대할 사용자 찾기
    const userToInvite = await prisma.user.findUnique({
      where: { email }
    });

    if (!userToInvite) {
      return NextResponse.json(
        { error: '해당 이메일의 사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 자기 자신을 초대하는지 확인
    if (userToInvite.id === currentUser.id) {
      return NextResponse.json(
        { error: '자기 자신을 초대할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 이미 프로젝트 소유자인지 확인
    if (project.userId === userToInvite.id) {
      return NextResponse.json(
        { error: '프로젝트 소유자는 이미 프로젝트의 멤버입니다.' },
        { status: 400 }
      );
    }

    // 이미 초대된 멤버인지 확인
    const existingMember = project.members.find(
      member => member.userId === userToInvite.id
    );

    if (existingMember) {
      if (existingMember.inviteStatus === "accepted") {
        return NextResponse.json(
          { error: '이 사용자는 이미 프로젝트의 멤버입니다.' },
          { status: 400 }
        );
      } else {
        // 이미 초대되었지만 수락하지 않은 경우, 초대 업데이트
        const updatedMember = await prisma.projectMember.update({
          where: { id: existingMember.id },
          data: { role, inviteStatus: "pending" },
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
      }
    }

    // 새 멤버 초대
    const newMember = await prisma.projectMember.create({
      data: {
        userId: userToInvite.id,
        projectId,
        role,
        inviteStatus: "pending"
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

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error('프로젝트 멤버 초대 오류:', error);
    return NextResponse.json(
      { error: '멤버를 초대하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 