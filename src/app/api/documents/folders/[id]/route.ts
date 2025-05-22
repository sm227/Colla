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

// GET: 특정 폴더 가져오기
export async function GET(
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
    
    const folderId = params.id;
    
    // 폴더 조회
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    });
    
    if (!folder) {
      return NextResponse.json(
        { error: '폴더를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 프로젝트 접근 권한 확인
    if (folder.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: folder.projectId },
      });
      
      if (!project) {
        return NextResponse.json(
          { error: '폴더가 속한 프로젝트를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      // 현재 사용자가 프로젝트 소유자인지 확인
      if (project.userId !== currentUser.id) {
        return NextResponse.json(
          { error: '이 폴더에 접근할 권한이 없습니다.' },
          { status: 403 }
        );
      }
    }
    
    // 폴더 내 문서 수 조회
    const documentCount = await prisma.document.count({
      where: { folderId: folder.id }
    });
    
    return NextResponse.json({
      ...folder,
      count: documentCount
    });
  } catch (error) {
    console.error('폴더 조회 오류:', error);
    return NextResponse.json(
      { error: '폴더를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PATCH: 폴더 정보 수정
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
    
    const folderId = params.id;
    const body = await request.json();
    
    // 폴더 조회
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    });
    
    if (!folder) {
      return NextResponse.json(
        { error: '폴더를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 프로젝트 접근 권한 확인
    if (folder.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: folder.projectId },
      });
      
      if (!project) {
        return NextResponse.json(
          { error: '폴더가 속한 프로젝트를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      // 현재 사용자가 프로젝트 소유자인지 확인
      if (project.userId !== currentUser.id) {
        return NextResponse.json(
          { error: '이 폴더를 수정할 권한이 없습니다.' },
          { status: 403 }
        );
      }
    }
    
    // 필수 필드 검증
    if (body.name && !body.name.trim()) {
      return NextResponse.json(
        { error: '폴더 이름은 비어있을 수 없습니다.' },
        { status: 400 }
      );
    }
    
    // 동일한 이름의 폴더가 이미 존재하는지 확인
    if (body.name && body.name !== folder.name) {
      const existingFolder = await prisma.folder.findFirst({
        where: {
          name: body.name.trim(),
          projectId: folder.projectId,
          id: { not: folderId } // 현재 폴더 제외
        }
      });
      
      if (existingFolder) {
        return NextResponse.json(
          { error: '동일한 이름의 폴더가 이미 존재합니다.' },
          { status: 409 }
        );
      }
    }
    
    // 수정할 필드 구성
    const updateData: any = {
      updatedAt: new Date(Date.now() + 9 * 60 * 60 * 1000)
    };
    
    // 이름 업데이트
    if (body.name) {
      updateData.name = body.name.trim();
    }
    
    // 설명 업데이트
    if (body.description !== undefined) {
      updateData.description = body.description;
    }
    
    // 폴더 업데이트
    const updatedFolder = await prisma.folder.update({
      where: { id: folderId },
      data: updateData,
    });
    
    // 폴더 내 문서 수 조회
    const documentCount = await prisma.document.count({
      where: { folderId: updatedFolder.id }
    });
    
    return NextResponse.json({
      ...updatedFolder,
      count: documentCount
    });
  } catch (error) {
    console.error('폴더 업데이트 오류:', error);
    return NextResponse.json(
      { error: '폴더를 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 폴더 삭제
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
    
    const folderId = params.id;
    
    // 요청 본문 파싱
    const body = await request.json();
    const { projectId } = body;
    
    if (!projectId) {
      return NextResponse.json(
        { error: '프로젝트 ID는 필수입니다.' },
        { status: 400 }
      );
    }
    
    // 폴더 조회
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    });
    
    if (!folder) {
      return NextResponse.json(
        { error: '폴더를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 프로젝트 접근 권한 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    
    if (!project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 현재 사용자가 프로젝트 소유자인지 확인
    if (project.userId !== currentUser.id) {
      return NextResponse.json(
        { error: '이 폴더를 삭제할 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    // 트랜잭션으로 폴더 내 문서 업데이트 및 폴더 삭제 처리
    await prisma.$transaction(async (tx) => {
      // 폴더에 속한 모든 문서의 folderId를 null로 변경
      await tx.document.updateMany({
        where: { folderId },
        data: { 
          folderId: null,
          folder: null, // 하위 호환성을 위해 folder 필드도 업데이트
          updatedAt: new Date(Date.now() + 9 * 60 * 60 * 1000)
        }
      });
      
      // 폴더 삭제
      await tx.folder.delete({
        where: { id: folderId }
      });
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