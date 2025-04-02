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

// GET: 폴더 목록 가져오기
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
    
    // 쿼리 조건 설정
    let whereCondition: any = {};
    
    if (projectId) {
      // 특정 프로젝트의 폴더만 가져옴
      whereCondition.projectId = projectId;
    } else {
      // 사용자의 모든 프로젝트 가져오기
      const userProjects = await prisma.project.findMany({
        where: { userId: currentUser.id },
        select: { id: true }
      });
      
      const userProjectIds = userProjects.map(p => p.id);
      
      if (userProjectIds.length > 0) {
        // 사용자의 프로젝트에 속한 모든 폴더 가져오기
        whereCondition.projectId = {
          in: userProjectIds
        };
      } else {
        // 사용자 프로젝트가 없는 경우
        return NextResponse.json([]);
      }
    }
    
    // 폴더 목록 조회
    const folders = await prisma.folder.findMany({
      where: whereCondition,
      orderBy: { name: 'asc' }
    });
    
    // 각 폴더의 문서 수 계산
    const foldersWithCounts = await Promise.all(folders.map(async (folder) => {
      const count = await prisma.document.count({
        where: { folderId: folder.id }
      });
      
      return {
        ...folder,
        count
      };
    }));
    
    return NextResponse.json(foldersWithCounts);
  } catch (error) {
    console.error('폴더 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '폴더 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 새 폴더 생성
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증된 사용자를 찾을 수 없습니다.' },
        { status: 401 }
      );
    }
    
    // 요청 본문 파싱
    const body = await request.json();
    const { name, projectId } = body;
    
    // 필수 필드 검증
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: '폴더 이름은 필수입니다.' },
        { status: 400 }
      );
    }
    
    if (!projectId) {
      return NextResponse.json(
        { error: '프로젝트 ID는 필수입니다.' },
        { status: 400 }
      );
    }
    
    // 프로젝트 존재 여부 및 사용자 권한 확인
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
        { error: '이 프로젝트에 폴더를 생성할 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    // 동일한 이름의 폴더가 이미 존재하는지 확인
    const existingFolder = await prisma.folder.findFirst({
      where: {
        name: name.trim(),
        projectId: projectId
      }
    });
    
    if (existingFolder) {
      return NextResponse.json(
        { error: '동일한 이름의 폴더가 이미 존재합니다.' },
        { status: 409 }
      );
    }
    
    // 새 폴더 생성
    const newFolder = await prisma.folder.create({
      data: {
        name: name.trim(),
        projectId,
        createdAt: new Date(Date.now() + 9 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() + 9 * 60 * 60 * 1000)
      }
    });
    
    // count 필드 추가
    return NextResponse.json({
      ...newFolder,
      count: 0
    });
  } catch (error) {
    console.error('폴더 생성 오류:', error);
    return NextResponse.json(
      { error: '폴더를 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 