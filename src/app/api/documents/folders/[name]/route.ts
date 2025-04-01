import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getTokenFromCookie, verifyToken } from '@/app/lib/auth';

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

// 폴더 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증된 사용자를 찾을 수 없습니다.' }, 
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { projectId } = body;
    
    if (!projectId) {
      return NextResponse.json(
        { error: '프로젝트 ID는 필수입니다.' },
        { status: 400 }
      );
    }
    
    // 프로젝트 소유권 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    if (project.userId !== currentUser.id) {
      return NextResponse.json(
        { error: '이 프로젝트의 폴더를 삭제할 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    // 폴더 이름이 아닌 ID로 폴더 찾기
    const folderId = params.name;
    
    // 폴더가 존재하는지 확인
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        projectId: projectId
      }
    });
    
    if (!folder) {
      return NextResponse.json(
        { error: '폴더를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 해당 폴더의 모든 문서의 폴더 ID를 null로 설정
    await prisma.document.updateMany({
      where: {
        folderId: folderId,
        projectId: projectId
      },
      data: {
        folderId: null,
        folder: "기본 폴더" // 하위 호환성 유지
      }
    });
    
    // 폴더 삭제
    await prisma.folder.delete({
      where: {
        id: folderId
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('폴더 삭제 오류:', error);
    return NextResponse.json(
      { error: '폴더를 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 