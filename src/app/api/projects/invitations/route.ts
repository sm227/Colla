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

// 현재 사용자의 대기 중인 프로젝트 초대 목록 가져오기
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증된 사용자를 찾을 수 없습니다.' }, 
        { status: 401 }
      );
    }

    // 사용자의 대기 중인 프로젝트 초대 조회
    const pendingInvitations = await prisma.projectMember.findMany({
      where: {
        userId: currentUser.id,
        inviteStatus: "pending"
      },
      include: {
        project: {
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

    return NextResponse.json(pendingInvitations);
  } catch (error) {
    console.error('초대 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '초대 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 