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
    
    // 문서 정보 및 프로젝트 소유자 정보 가져오기
    const documentQuery = await prisma.$queryRaw`
      SELECT d.*, p."userId" as "projectOwnerId", p.id as "projectId"
      FROM "Document" d
      LEFT JOIN "Project" p ON d."projectId" = p.id
      WHERE d.id = ${params.id}
    `;
    
    const document = (documentQuery as any[])[0];
    
    if (!document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 프로젝트 멤버십 확인
    const projectMembershipQuery = await prisma.$queryRaw`
      SELECT * FROM "ProjectMember"
      WHERE "userId" = ${currentUser.id}
      AND "projectId" = ${document.projectId}
    `;
    
    const isProjectMember = (projectMembershipQuery as any[]).length > 0;
    const isProjectOwner = document.projectOwnerId === currentUser.id;
    
    // 사용자가 프로젝트 소유자이거나 멤버인 경우에만 문서 접근 허용
    if (!isProjectOwner && !isProjectMember) {
      return NextResponse.json(
        { error: "이 문서에 접근할 권한이 없습니다. 프로젝트 멤버만 문서를 볼 수 있습니다." },
        { status: 403 }
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
    
    const { title, content, emoji, isStarred, folder, projectId, tags, folderId } = body;
    
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
    
    // 문서가 존재하는지 확인
    const existingDocumentQuery = await prisma.$queryRaw`
      SELECT d.*, p."userId" 
      FROM "Document" d
      LEFT JOIN "Project" p ON d."projectId" = p.id
      WHERE d.id = ${documentId}
    `;
    
    const existingDocument = (existingDocumentQuery as any[])[0];
    
    if (!existingDocument) {
      return NextResponse.json(
        { error: "문서를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    
    // 프로젝트 멤버십 확인
    const projectMembershipQuery = await prisma.$queryRaw`
      SELECT * FROM "ProjectMember"
      WHERE "userId" = ${currentUser.id}
      AND "projectId" = ${existingDocument.projectId}
    `;
    
    const isProjectMember = (projectMembershipQuery as any[]).length > 0;
    const isProjectOwner = existingDocument.userId === currentUser.id;
    
    // 사용자가 프로젝트 소유자이거나 멤버인 경우에만 문서 수정 허용
    if (!isProjectOwner && !isProjectMember) {
      return NextResponse.json(
        { error: "이 문서를 수정할 권한이 없습니다. 프로젝트 멤버만 문서를 수정할 수 있습니다." },
        { status: 403 }
      );
    }
    
    // 다른 프로젝트로 이동 불가
    if (existingDocument.projectId !== projectId) {
      return NextResponse.json(
        { error: "문서의 프로젝트를 변경할 수 없습니다." },
        { status: 400 }
      );
    }
    
    // folderId가 제공된 경우 유효성 확인
    if (folderId && folderId !== existingDocument.folderId) {
      try {
        // SQL로 폴더 확인
        const folderQuery = await prisma.$queryRaw`
          SELECT id FROM "Folder" 
          WHERE id = ${folderId} AND "projectId" = ${projectId}
        `;
        
        if (!(folderQuery as any[]).length) {
          return NextResponse.json(
            { error: "지정된 폴더가 존재하지 않거나 해당 프로젝트에 속하지 않습니다." },
            { status: 404 }
          );
        }
      } catch (error) {
        console.error("폴더 조회 중 오류:", error);
        return NextResponse.json(
          { error: "폴더 정보를 확인할 수 없습니다." },
          { status: 500 }
        );
      }
    }
    
    // 문서 업데이트
    const updateQuery = `
      UPDATE "Document"
      SET 
        title = $1,
        content = $2,
        emoji = $3,
        "isStarred" = $4,
        folder = $5,
        tags = $6,
        "folderId" = $7,
        "updatedAt" = $8
      WHERE id = $9
      RETURNING *
    `;
    
    // 업데이트할 값 준비
    const updateTitle = title !== undefined ? title : existingDocument.title;
    const updateContent = content !== undefined ? content : existingDocument.content;
    const updateEmoji = emoji !== undefined ? emoji : existingDocument.emoji;
    const updateIsStarred = isStarred !== undefined ? isStarred : existingDocument.isStarred;
    const updateFolder = folder !== undefined ? folder : existingDocument.folder;
    const updateTags = tags !== undefined 
      ? (Array.isArray(tags) ? JSON.stringify(tags) : tags) 
      : existingDocument.tags;
    const updateFolderId = folderId !== undefined ? folderId : existingDocument.folderId;
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
    
    // 문서 업데이트 직접 쿼리
    const updatedDocumentResult = await prisma.$queryRaw`
      UPDATE "Document"
      SET 
        title = ${updateTitle},
        content = ${updateContent},
        emoji = ${updateEmoji},
        "isStarred" = ${updateIsStarred},
        folder = ${updateFolder},
        tags = ${updateTags},
        "folderId" = ${updateFolderId},
        "updatedAt" = ${now}
      WHERE id = ${documentId}
      RETURNING *
    `;
    
    return NextResponse.json((updatedDocumentResult as any[])[0]);
  } catch (error) {
    console.error('문서 수정 오류:', error);
    return NextResponse.json(
      { error: '문서를 수정하는 중 오류가 발생했습니다.' },
      { status: 500 }
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
    
    // 문서 정보 및 소유권 확인
    const documentQuery = await prisma.$queryRaw`
      SELECT d.*, d."userId" as "documentCreatorId", 
             p."userId" as "projectOwnerId", p.id as "projectId"
      FROM "Document" d
      LEFT JOIN "Project" p ON d."projectId" = p.id
      WHERE d.id = ${params.id}
    `;
    
    const document = (documentQuery as any[])[0];
    
    if (!document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 프로젝트 소유자 또는 문서 생성자만 삭제 가능
    const isProjectOwner = document.projectOwnerId === currentUser.id;
    const isDocumentCreator = document.documentCreatorId === currentUser.id;
    
    if (!isProjectOwner && !isDocumentCreator) {
      return NextResponse.json(
        { error: '이 문서를 삭제할 권한이 없습니다. 프로젝트 소유자나 문서 생성자만 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }
    
    // 문서 삭제
    await prisma.document.delete({
      where: { id: params.id }
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