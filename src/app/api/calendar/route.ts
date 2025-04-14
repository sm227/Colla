import { NextResponse } from 'next/server';
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

// 캘린더 일정 가져오기
export async function GET(request: Request) {
  try {
    // 현재 로그인한 사용자 정보 가져오기
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }
    
    // URL에서 projectId 파라미터 확인
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    
    // 모든 프로젝트를 볼 수 있는지 여부
    const showAll = url.searchParams.get('showAll') === 'true';
    
    // 쿼리 조건 설정
    const whereCondition: any = {
      OR: [
        { userId: currentUser.id }, // 현재 사용자의 일정
      ]
    };
    
    // 특정 프로젝트의 일정을 볼 때 (프로젝트에 속한 모든 멤버의 일정 포함)
    if (projectId && !showAll) {
      // 1. 내가 소속된 프로젝트인지 확인
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: currentUser.id,
            projectId: projectId
          }
        }
      });
      
      if (!membership) {
        return NextResponse.json(
          { error: '해당 프로젝트에 접근 권한이 없습니다.' },
          { status: 403 }
        );
      }
      
      // 2. 프로젝트에 속한 모든 멤버의 ID 가져오기
      const projectMembers = await prisma.projectMember.findMany({
        where: {
          projectId: projectId,
          inviteStatus: 'accepted'
        },
        select: {
          userId: true
        }
      });
      
      const memberIds = projectMembers.map(member => member.userId);
      
      // 3. 해당 프로젝트의 일정만 표시
      whereCondition.OR.push(
        { 
          projectId: projectId,
          userId: { in: memberIds }
        }
      );
    } else if (showAll) {
      // 내가 속한 모든 프로젝트 찾기
      const myProjects = await prisma.projectMember.findMany({
        where: {
          userId: currentUser.id,
          inviteStatus: 'accepted'
        },
        select: {
          projectId: true
        }
      });
      
      const projectIds = myProjects.map(p => p.projectId);
      
      // 내가 속한 모든 프로젝트의 일정 추가
      whereCondition.OR.push(
        { projectId: { in: projectIds } }
      );
    }

    // Prisma에서 Calendar 모델을 직접 접근
    // @ts-ignore - Calendar 모델이 Prisma 클라이언트에 있지만 타입이 제대로 인식되지 않을 때 사용
    const calendars = await prisma.calendar.findMany({
      where: whereCondition,
      orderBy: {
        startDate: 'asc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    // 태스크도 함께 가져오기 (마감일이 있는 태스크)
    const tasks = await prisma.task.findMany({
      where: {
        dueDate: { not: null },
        OR: [
          { projectId: projectId },
          { 
            projectId: { in: showAll 
              ? await prisma.projectMember.findMany({
                  where: { 
                    userId: currentUser.id,
                    inviteStatus: 'accepted'
                  },
                  select: { projectId: true }
                }).then(data => data.map(item => item.projectId))
              : undefined
            } 
          }
        ]
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    // 태스크를 캘린더 일정 형식으로 변환
    const taskEvents = tasks.map(task => ({
      id: `task_${task.id}`,
      title: `[작업] ${task.title}`,
      description: task.description,
      startDate: task.startDate || task.createdAt,
      endDate: task.dueDate,
      isAllDay: task.isAllDay || false,
      isTask: true,
      taskId: task.id,
      userId: currentUser.id,
      projectId: task.projectId,
      projectName: task.project?.name,
      user: {
        id: currentUser.id,
        name: currentUser.name,
      },
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));
    
    // 캘린더 일정에 isTask 필드 추가
    const calendarEvents = calendars.map((calendar: any) => ({
      ...calendar,
      isTask: false,
    }));
    
    // 모든 일정 병합
    const allEvents = [...calendarEvents, ...taskEvents];
    
    return NextResponse.json(allEvents);
  } catch (error) {
    console.error('캘린더 일정 조회 오류:', error);
    return NextResponse.json(
      { error: '캘린더 일정을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 새 캘린더 일정 추가
export async function POST(request: Request) {
  try {
    console.log('캘린더 일정 추가 요청 시작');
    
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      console.log('인증되지 않은 사용자 요청');
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }
    
    console.log('사용자 인증 완료:', currentUser.id);
    
    const body = await request.json();
    console.log('요청 본문:', JSON.stringify(body, null, 2));
    
    const { title, description, startDate, endDate, isAllDay, projectId } = body;
    
    if (!title || !startDate) {
      console.log('필수 필드 누락');
      return NextResponse.json(
        { error: '제목과 시작 날짜는 필수입니다.' },
        { status: 400 }
      );
    }
    
    // 프로젝트 ID가 있는 경우 해당 프로젝트에 접근 권한이 있는지 확인
    if (projectId) {
      console.log('프로젝트 접근 권한 확인:', projectId);
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: currentUser.id,
            projectId: projectId
          }
        }
      });
      
      if (!membership) {
        console.log('프로젝트 접근 권한 없음');
        return NextResponse.json(
          { error: '해당 프로젝트에 접근 권한이 없습니다.' },
          { status: 403 }
        );
      }
      console.log('프로젝트 접근 권한 확인 완료');
    }
    
    console.log('일정 생성 시도');
    
    try {
      // 일정 생성
      // @ts-ignore - Calendar 모델이 Prisma 클라이언트에 있지만 타입이 제대로 인식되지 않을 때 사용
      const calendar = await prisma.calendar.create({
        data: {
          title,
          description: description || "",
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          isAllDay: isAllDay || false,
          userId: currentUser.id,
          projectId: projectId || null,
        },
      });
      
      console.log('일정 생성 성공:', calendar);
      return NextResponse.json(calendar, { status: 201 });
    } catch (err: any) {
      console.error('Prisma 오류:', err);
      
      // Prisma 오류 메시지 구체화
      const errorMessage = err.message || '알 수 없는 오류가 발생했습니다.';
      
      return NextResponse.json(
        { error: `일정 생성 중 데이터베이스 오류가 발생했습니다: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('캘린더 일정 생성 오류:', error.stack || error);
    return NextResponse.json(
      { error: '캘린더 일정을 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 