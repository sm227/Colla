import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromCookie, verifyToken } from '@/app/lib/auth';

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

// 관리자 여부 확인 (임시 함수, 실제로는 DB에서 역할 체크가 필요)
async function isAdmin(userId: string): Promise<boolean> {
  // 관리자 ID 목록 (하드코딩) - 실제로는 DB에서 확인해야 함
  const adminIds = ['admin-id-1', 'admin-id-2']; // 임시 관리자 ID 목록
  return adminIds.includes(userId);
}

// 사용자 목록 가져오기
export async function GET(request: NextRequest) {
  try {
    // 인증 체크
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }
    
    // URL 파라미터에서 사용자 ID를 확인
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    // 특정 사용자 정보 요청인 경우
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        }
      });
      
      if (!user) {
        return NextResponse.json(
          { error: '사용자를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(user);
    }
    
    // 관리자 체크
    const userIsAdmin = await isAdmin(currentUser.id);
    
    // 모든 사용자 조회 (비밀번호 제외)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: userIsAdmin ? true : undefined, // 관리자만 추가 정보 제공
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '사용자 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 사용자 정보 업데이트 (관리자용)
export async function PATCH(request: NextRequest) {
  try {
    // 인증 체크
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }
    
    // 관리자 권한 체크
    if (!(await isAdmin(currentUser.id))) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    const { id, ...updateData } = await request.json();
    
    // 비밀번호 필드가 있으면 제거 (별도의 API로 처리해야 함)
    if ('password' in updateData) {
      delete updateData.password;
    }
    
    // 사용자 업데이트
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      }
    });
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('사용자 업데이트 오류:', error);
    return NextResponse.json(
      { error: '사용자 정보를 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 사용자 삭제 (관리자용)
export async function DELETE(request: NextRequest) {
  try {
    // 인증 체크
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }
    
    // 관리자 권한 체크
    if (!(await isAdmin(currentUser.id))) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }
    
    // 현재 사용자 자신은 삭제 불가
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: '자신의 계정은 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }
    
    // 사용자 삭제
    await prisma.user.delete({
      where: { id: userId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('사용자 삭제 오류:', error);
    return NextResponse.json(
      { error: '사용자를 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 