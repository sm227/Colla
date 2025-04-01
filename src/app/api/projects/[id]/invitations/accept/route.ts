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

// 프로젝트 초대 수락
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
    
    // 초대 확인
    const invitation = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: currentUser.id,
        inviteStatus: "pending"
      }
    });

    if (!invitation) {
      return NextResponse.json(
        { error: '이 프로젝트에 대한 대기 중인 초대를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 초대 수락 처리
    const updatedMember = await prisma.projectMember.update({
      where: { id: invitation.id },
      data: { 
        inviteStatus: "accepted"
      },
      include: {
        project: true,
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
    console.error('초대 수락 오류:', error);
    return NextResponse.json(
      { error: '초대를 수락하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 