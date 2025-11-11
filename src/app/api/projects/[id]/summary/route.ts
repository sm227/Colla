import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

// 프로젝트 요약 정보 가져오기
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // 현재 사용자 확인 (인증 검사)
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 프로젝트 데이터 조회 (상세 정보 포함)
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          where: {
            inviteStatus: "accepted"
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 프로젝트 접근 권한 확인
    const isOwner = project.userId === currentUser.id;
    const isMember = project.members.some(
      member => member.userId === currentUser.id
    );

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: '이 프로젝트에 접근할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 작업 통계 계산
    const taskStats = {
      total: project.tasks.length,
      todo: project.tasks.filter(task => task.status === 'todo').length,
      inProgress: project.tasks.filter(task => task.status === 'in_progress').length,
      review: project.tasks.filter(task => task.status === 'review').length,
      done: project.tasks.filter(task => task.status === 'done').length
    };

    // 우선순위별 작업 수
    const priorityStats = {
      high: project.tasks.filter(task => task.priority === 'high').length,
      medium: project.tasks.filter(task => task.priority === 'medium').length,
      low: project.tasks.filter(task => task.priority === 'low').length
    };

    // 담당자 정보 조회를 위한 유니크한 assignee ID 목록
    const assigneeIds = Array.from(
      new Set(
        project.tasks
          .map(task => task.assignee)
          .filter((id): id is string => id !== null && id !== undefined)
      )
    );

    // 담당자 정보 조회
    const assignees = assigneeIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: { in: assigneeIds }
          },
          select: {
            id: true,
            name: true,
            email: true
          }
        })
      : [];

    // assignee ID -> User 정보 매핑
    const assigneeMap = new Map(
      assignees.map(user => [user.id, user])
    );

    // 마감일 임박 작업 (7일 이내)
    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(now.getDate() + 7);

    const upcomingTasks = project.tasks.filter(task => {
      if (!task.dueDate || task.status === 'done') return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= now && dueDate <= sevenDaysLater;
    });

    // 지연된 작업 (마감일이 지났지만 완료되지 않은 작업)
    const overdueTasks = project.tasks.filter(task => {
      if (!task.dueDate || task.status === 'done') return false;
      return new Date(task.dueDate) < now;
    });

    // 팀원 정보 (소유자 + 멤버)
    const teamMembers = [
      {
        id: project.user.id,
        name: project.user.name,
        email: project.user.email,
        role: 'owner' as const
      },
      ...project.members.map(member => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: member.role
      }))
    ];

    // 팀원별 작업 수
    const tasksByMember = teamMembers.map(member => {
      const memberTasks = project.tasks.filter(task => task.assigneeId === member.id);
      return {
        memberId: member.id,
        memberName: member.name,
        totalTasks: memberTasks.length,
        completedTasks: memberTasks.filter(task => task.status === 'done').length,
        inProgressTasks: memberTasks.filter(task => task.status === 'in_progress').length
      };
    });

    // 진행률 계산
    const progressPercentage = taskStats.total > 0
      ? Math.round((taskStats.done / taskStats.total) * 100)
      : 0;

    // 요약 정보 반환
    const summary = {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      owner: {
        id: project.user.id,
        name: project.user.name,
        email: project.user.email
      },
      teamMembers: teamMembers,
      taskStats: taskStats,
      priorityStats: priorityStats,
      progressPercentage: progressPercentage,
      upcomingTasks: upcomingTasks.map(task => {
        const assigneeInfo = task.assignee ? assigneeMap.get(task.assignee) : null;
        return {
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          priority: task.priority,
          assignee: assigneeInfo ? {
            id: assigneeInfo.id,
            name: assigneeInfo.name
          } : null
        };
      }),
      overdueTasks: overdueTasks.map(task => {
        const assigneeInfo = task.assignee ? assigneeMap.get(task.assignee) : null;
        return {
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          priority: task.priority,
          assignee: assigneeInfo ? {
            id: assigneeInfo.id,
            name: assigneeInfo.name
          } : null
        };
      }),
      tasksByMember: tasksByMember
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('프로젝트 요약 조회 오류:', error);
    return NextResponse.json(
      { error: '프로젝트 요약 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
