import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 현재 사용자 ID 가져오기 (실제 인증 로직으로 대체 필요)
async function getCurrentUserId() {
  // 실제 환경에서는 세션이나 토큰을 통해 인증된 사용자의 ID를 가져와야 함
  const user = await prisma.user.findFirst();
  return user?.id;
}

// GET - 캘린더 이벤트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }
    
    // 쿼리 파라미터 가져오기
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    let events = [];
    
    if (projectId) {
      console.log(`[캘린더] userId=${userId}가 projectId=${projectId} 일정 조회 시도`);
      events = await prisma.calendar.findMany({
        where: {
          projectId: projectId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          project: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { startDate: 'asc' }
      });
      console.log(`[캘린더] projectId=${projectId} 일정 ${events.length}건 반환`);
    } else {
      console.log(`[캘린더] userId=${userId}가 전체 일정 조회 시도`);
      // 프로젝트 ID가 없을 경우 현재 사용자의 개인 일정과
      // 사용자가 속한 모든 프로젝트의 일정 가져오기
      
      // 1. 사용자가 속한 모든 프로젝트 ID 가져오기
      const userProjects = await prisma.projectMember.findMany({
        where: {
          userId: userId,
          inviteStatus: 'accepted'
        },
        select: {
          projectId: true
        }
      });
      
      const projectIds = userProjects.map(p => p.projectId);
      
      // 2. 사용자의 개인 일정 + 참여 중인 모든 프로젝트 일정 가져오기
      events = await prisma.calendar.findMany({
        where: {
          OR: [
            // 사용자의 개인 일정
            { userId: userId },
            // 사용자가 참여 중인 프로젝트의 일정
        { projectId: { in: projectIds } }
          ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
              email: true
            }
        },
        project: {
          select: {
            id: true,
              name: true
            }
          }
        },
        orderBy: { startDate: 'asc' }
      });
    }

    return NextResponse.json(events);
  } catch (error) {
    console.error('캘린더 이벤트 조회 오류:', error);
    return NextResponse.json(
      { error: '캘린더 이벤트를 가져오는 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// POST - 새 캘린더 이벤트 생성
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }
    
    // 요청 본문 파싱
    const data = await request.json();
    
    // 필수 필드 검증
    if (!data.title || !data.startDate) {
      return NextResponse.json(
        { error: '제목과 시작 날짜는 필수입니다' },
        { status: 400 }
      );
    }
    
    // 캘린더 이벤트 생성
    const newEvent = await prisma.calendar.create({
        data: {
        title: data.title,
        description: data.description || '',
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        isAllDay: data.isAllDay || false,
        userId: userId,
        projectId: data.projectId || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: data.projectId ? {
          select: {
            id: true, 
            name: true
          }
        } : undefined
      }
    });
      
    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error('캘린더 이벤트 생성 오류:', error);
    return NextResponse.json(
      { error: '캘린더 이벤트 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
} 