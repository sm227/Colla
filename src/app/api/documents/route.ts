import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getTokenFromCookie, verifyToken } from '@/app/lib/auth';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

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

// GET: 모든 문서 가져오기 (+프로젝트 ID 필터링 가능)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증된 사용자를 찾을 수 없습니다.' },
        { status: 401 }
      );
    }
    
    // URL 쿼리 파라미터 가져오기
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = searchParams.get('limit');
    
    // 쿼리 조건 설정
    let whereCondition: any = {};
    
    // 현재는 직접 SQL 쿼리로 처리
    let documentsQuery = '';
    
    if (projectId) {
      // 특정 프로젝트의 문서만 가져옴
      documentsQuery = `
        SELECT 
          d.id, 
          d.title, 
          d.content, 
          d.emoji, 
          d."isStarred", 
          d.folder,
          d."folderId",
          d.tags, 
          d."projectId",
          d."createdAt"::timestamp with time zone AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' as "createdAt", 
          d."updatedAt"::timestamp with time zone AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' as "updatedAt"
        FROM "Document" d
        WHERE d."projectId" = '${projectId}'
        ORDER BY d."updatedAt" DESC
        ${limit ? `LIMIT ${limit}` : ''}
      `;
    } else {
      // 사용자의 모든 프로젝트 가져오기
      const userProjects = await prisma.project.findMany({
        where: { userId: currentUser.id },
        select: { id: true }
      });
      
      const userProjectIds = userProjects.map((p: { id: string }) => p.id);
      
      if (userProjectIds.length > 0) {
        // 사용자의 프로젝트에 속한 모든 문서 가져오기
        documentsQuery = `
          SELECT 
            d.id, 
            d.title, 
            d.content, 
            d.emoji, 
            d."isStarred", 
            d.folder,
            d."folderId",
            d.tags, 
            d."projectId",
            d."createdAt"::timestamp with time zone AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' as "createdAt", 
            d."updatedAt"::timestamp with time zone AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul' as "updatedAt"
          FROM "Document" d
          WHERE d."projectId" IN (${userProjectIds.map(id => `'${id}'`).join(',')})
          ORDER BY d."updatedAt" DESC
          ${limit ? `LIMIT ${limit}` : ''}
        `;
      } else {
        // 사용자 프로젝트가 없는 경우
        return NextResponse.json([]);
      }
    }
    
    // 쿼리 실행
    const documents = await prisma.$queryRawUnsafe(documentsQuery);
    
    // 문서 목록 반환
    return NextResponse.json(documents);
  } catch (error) {
    console.error('문서 조회 오류:', error);
    return NextResponse.json(
      { error: '문서를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 새 문서 생성
export async function POST(request: NextRequest) {
  try {
    // 현재 로그인한 사용자 확인
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증된 사용자를 찾을 수 없습니다.' }, 
        { status: 401 }
      );
    }
    
    // 요청 본문 파싱
    const body = await request.json();
    
    const { title, content, emoji, isStarred, folder, tags, projectId, folderId } = body;
    
    // 프로젝트 ID 검증
    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID는 필수입니다." },
        { status: 400 }
      );
    }
    
    // 프로젝트 존재 여부 및 사용자 권한 확인
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      
      if (!project) {
        return NextResponse.json(
          { error: "지정된 프로젝트가 존재하지 않습니다." },
          { status: 404 }
        );
      }
      
      // 프로젝트 소유자 확인
      if (project.userId !== currentUser.id) {
        return NextResponse.json(
          { error: "해당 프로젝트에 문서를 생성할 권한이 없습니다." },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error("프로젝트 조회 중 오류:", error);
      return NextResponse.json(
        { error: "프로젝트 정보를 확인할 수 없습니다." },
        { status: 500 }
      );
    }
    
    // folderId가 제공된 경우 유효성 확인
    if (folderId) {
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
    
    // 문서 데이터 구성
    const documentData = {
      title: title || "제목 없음",
      content: content || "",
      emoji: emoji || "📄",
      isStarred: isStarred || false,
      folder: folder || null, // 하위 호환성 유지
      tags: Array.isArray(tags) ? JSON.stringify(tags) : null,
      projectId: projectId,
      folderId: folderId || null
    };
    
    // 새 문서 생성
    // Prisma 스키마와 실제 DB 컬럼 간 불일치가 있으므로 SQL 쿼리 직접 실행
    const insertResult = await prisma.$queryRaw`
      INSERT INTO "Document" (
        id, title, content, emoji, "isStarred", folder, tags, "projectId", "folderId", "createdAt", "updatedAt"
      ) VALUES (
        ${`doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`}, 
        ${documentData.title}, 
        ${documentData.content}, 
        ${documentData.emoji}, 
        ${documentData.isStarred}, 
        ${documentData.folder}, 
        ${documentData.tags}, 
        ${documentData.projectId}, 
        ${documentData.folderId}, 
        ${new Date(Date.now() + 9 * 60 * 60 * 1000)}, 
        ${new Date(Date.now() + 9 * 60 * 60 * 1000)}
      )
      RETURNING *
    `;
    
    return NextResponse.json((insertResult as any[])[0]);
    
  } catch (error) {
    console.error('문서 생성 오류:', error);
    return NextResponse.json(
      { error: '문서를 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 문서 저장 데이터 유효성 검사 헬퍼 함수 (추가)
function validateDocumentData(data: any) {
  const { title, content, emoji, isStarred, folder, tags, projectId, userId } = data;
  
  const errors = [];
  
  if (!projectId) {
    errors.push("프로젝트 ID는 필수입니다");
  }
  
  if (!userId) {
    errors.push("사용자 ID는 필수입니다");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
} 