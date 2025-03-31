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

// 모든 문서 가져오기 (프로젝트 ID로 필터링 가능)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증된 사용자를 찾을 수 없습니다.' }, 
        { status: 401 }
      );
    }
    
    // URL에서 projectId 쿼리 파라미터 가져오기
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    let whereCondition: any = {};
    
    if (projectId) {
      // 특정 프로젝트의 문서만 조회
      whereCondition = { 
        projectId: {
          equals: projectId
        }
      };
    } else {
      // 사용자의 모든 문서 조회 (프로젝트 문서 포함)
      
      // 사용자의 프로젝트 목록 가져오기
      const userProjects = await prisma.project.findMany({
        where: { userId: currentUser.id },
        select: { id: true }
      });
      
      const userProjectIds = userProjects.map(p => p.id);
      
      // 사용자의 문서 또는 사용자의 프로젝트에 속한 문서
      whereCondition = {
        OR: [
          { projectId: { in: userProjectIds.length > 0 ? userProjectIds : undefined } },
          { projectId: null }
        ]
      };
    }
    
    // 문서 조회
    const documents = await prisma.document.findMany({
      where: whereCondition,
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
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
    
    const { title, content, emoji, isStarred, folder, tags, projectId } = body;
    
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
    
    // 문서 데이터 구성
    const documentData = {
      title: title || "제목 없음",
      content: content || "",
      emoji: emoji || "📄",
      isStarred: isStarred || false,
      folder: folder || null,
      tags: Array.isArray(tags) ? JSON.stringify(tags) : null,
      projectId: projectId
    };
    
    // 문서 생성
    try {
      const document = await prisma.document.create({
        data: documentData
      });
      
      return NextResponse.json(document, { status: 201 });
    } catch (error) {
      console.error("문서 생성 중 오류:", error);
      
      if (error instanceof Error) {
        if (error.message.includes("Foreign key constraint failed")) {
          return NextResponse.json(
            { error: "프로젝트 ID가 유효하지 않습니다." },
            { status: 400 }
          );
        }
        
        if (error.message.includes("Unique constraint failed")) {
          return NextResponse.json(
            { error: "이미 존재하는 문서입니다." },
            { status: 400 }
          );
        }
      }
      
      return NextResponse.json(
        { error: "문서 생성 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("요청 처리 중 오류:", error);
    return NextResponse.json(
      { error: "요청을 처리할 수 없습니다." },
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