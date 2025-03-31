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

// 특정 문서 가져오기
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
    
    const document = await prisma.document.findUnique({
      where: { id: params.id }
    });
    
    if (!document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(document);
  } catch (error) {
    console.error('문서 조회 오류:', error);
    return NextResponse.json(
      { error: '문서를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 문서 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const documentId = params.id;
  
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증된 사용자를 찾을 수 없습니다.' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    const { title, content, emoji, isStarred, folder, projectId, tags } = body;
    
    // 프로젝트 ID 필수 확인
    if (!projectId || projectId === '' || projectId === 'null' || projectId === undefined || projectId === null) {
      return NextResponse.json(
        { error: "프로젝트 ID는 필수입니다." },
        { status: 400 }
      );
    }
    
    // UUID/CUID 형식 검증
    const isValidId = validateProjectId(projectId);
    if (!isValidId) {
      return NextResponse.json(
        { error: "유효하지 않은 프로젝트 ID 형식입니다" },
        { status: 400 }
      );
    }
    
    // 트랜잭션 시작
    const result = await prisma.$transaction(async (tx) => {
      // 1. 문서 확인
      const existingDocument = await tx.document.findUnique({
        where: { id: documentId }
      });
      
      if (!existingDocument) {
        throw new Error(`문서를 찾을 수 없습니다: ${documentId}`);
      }
      
      // 2. 프로젝트 확인 - 반드시 유효한 프로젝트여야 함
      const projectToUse = await tx.project.findUnique({
        where: { id: projectId }
      });
      
      if (!projectToUse) {
        throw new Error(`지정된 프로젝트(${projectId})를 찾을 수 없습니다.`);
      }
      
      // 권한 확인 - 프로젝트는 반드시 현재 사용자의 것이어야 함
      if (projectToUse.userId !== currentUser.id) {
        throw new Error('이 프로젝트에 문서를 연결할 권한이 없습니다.');
      }
      
      // 3. 태그 처리
      const processedTags = tags ? JSON.stringify(tags) : null;
      
      // 4. 문서 업데이트 데이터 구성
      const updateData: any = {};
      
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (emoji !== undefined) updateData.emoji = emoji;
      if (isStarred !== undefined) updateData.isStarred = isStarred;
      if (folder !== undefined) updateData.folder = folder;
      if (processedTags !== undefined) updateData.tags = processedTags;
      
      // projectId 설정 (필수)
      updateData.projectId = projectId;
      
      // 5. 문서 업데이트
      const updatedDocument = await tx.document.update({
        where: { id: documentId },
        data: updateData
      });
      
      return updatedDocument;
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('문서 업데이트 오류:', error);
    
    // 적절한 상태 코드 결정
    let statusCode = 500;
    let errorMessage = '문서를 업데이트하는 중 오류가 발생했습니다.';
    
    if (error instanceof Error) {
      if (error.message.includes('찾을 수 없습니다')) {
        statusCode = 404;
        errorMessage = error.message;
      } else if (error.message.includes('권한이 없습니다')) {
        statusCode = 403;
        errorMessage = error.message;
      } else {
        errorMessage = `문서 업데이트 오류: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// 프로젝트 ID 유효성 검사 헬퍼 함수
function validateProjectId(id: any): boolean {
  try {
    if (typeof id !== 'string') return false;
    
    // UUID 형식 검증 (예: 123e4567-e89b-12d3-a456-426614174000)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    // CUID 형식 검증 (예: cm8wirk9f0001utnowb3xo0sa)
    const cuidPattern = /^c[a-z0-9]{24}$/i;
    
    return uuidPattern.test(id) || cuidPattern.test(id);
  } catch (error) {
    console.error("ID 검증 중 오류:", error);
    return false;
  }
}

// 문서 삭제
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
    
    const documentId = params.id;
    
    // 문서가 존재하는지 확인
    const existingDocument = await prisma.document.findUnique({
      where: { id: documentId },
      include: { project: true }
    });
    
    if (!existingDocument) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 문서에 연결된 프로젝트가 있으면 접근 권한 확인
    if (existingDocument.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: existingDocument.projectId }
      });
      
      if (project && project.userId !== currentUser.id) {
        return NextResponse.json(
          { error: '이 문서를 삭제할 권한이 없습니다.' },
          { status: 403 }
        );
      }
    }
    
    // 문서 삭제
    await prisma.document.delete({
      where: { id: documentId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('문서 삭제 오류:', error);
    return NextResponse.json(
      { error: '문서를 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 