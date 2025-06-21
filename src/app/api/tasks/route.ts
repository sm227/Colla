import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripHtmlTags } from '@/lib/utils';
import { prisma } from '../../lib/prisma';

// 작업 목록 조회 (GET)
export async function GET(req: NextRequest) {
  try {
    // 개발 중 인증 체크 임시 우회
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    // }
    
    // 임시 세션 정보
    const session = { user: { id: "temp-user-id" } };

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    const epicId = url.searchParams.get("epicId");
    const noCalendarEvents = url.searchParams.get("noCalendarEvents");
    const hasDueDate = url.searchParams.get("hasDueDate");
    
    // 필터링 조건 구성
    const where: any = {};
    if (projectId) {
      where.projectId = projectId;
    }
    
    if (epicId) {
      where.epicId = epicId;
    }
    
    // noCalendarEvents가 true인 경우: dueDate가 null인 태스크만 (예약되지 않은 업무)
    if (noCalendarEvents === 'true') {
      where.dueDate = null;
    }
    
    // hasDueDate가 true인 경우: dueDate가 있는 태스크만 (캘린더에 표시할 태스크)
    if (hasDueDate === 'true') {
      where.dueDate = {
        not: null
      };
    }
    
    // 모든 작업 조회 (개발 편의를 위해 사용자 체크 없이)
    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("작업 조회 중 오류 발생:", error);
    return NextResponse.json({ error: "작업 조회에 실패했습니다." }, { status: 500 });
  }
}

// 작업 생성 (POST)
export async function POST(req: NextRequest) {
  try {
    // 개발 중 인증 체크 임시 우회
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    // }
    
    // 임시 세션 정보
    const session = { user: { id: "temp-user-id" } };

    const body = await req.json();
    const { title, description, status, priority, epicId, projectId, assignee, startDate, endDate, dueDate } = body;

    if (!title || !status) {
      return NextResponse.json({ error: "제목과 상태는 필수 항목입니다." }, { status: 400 });
    }

    // 날짜 처리
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;
    const parsedDueDate = dueDate ? new Date(dueDate) : undefined;

    // 작업 생성
    const newTask = await prisma.task.create({
      data: {
        title,
        description,
        status,
        priority: priority || "medium",
        epicId,
        projectId,
        assignee,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        dueDate: parsedDueDate
      }
    });

    // 작업 생성 알림 이벤트 발생 (담당자 정보 포함)
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/notifications/task-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'task_created',
          taskId: newTask.id,
          projectId: newTask.projectId,
          newAssignee: assignee, // 담당자 정보 추가
        }),
      });
    } catch (notificationError) {
      console.error('작업 생성 알림 발생 중 오류:', notificationError);
      // 알림 실패해도 작업 생성은 성공으로 처리
    }

    return NextResponse.json(newTask);
  } catch (error) {
    console.error("작업 생성 중 오류 발생:", error);
    return NextResponse.json({ error: "작업 생성에 실패했습니다." }, { status: 500 });
  }
}

// 작업 수정 (PUT)
export async function PUT(req: NextRequest) {
  try {
    // 개발 중 인증 체크 임시 우회
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    // }
    
    // 임시 세션 정보
    const session = { user: { id: "temp-user-id" } };

    const body = await req.json();
    const { id, title, description, status, priority, assignee, projectId, epicId, dueDate, startDate, endDate } = body;

    if (!id) {
      return NextResponse.json({ error: "작업 ID가 필요합니다." }, { status: 400 });
    }

    // 변경 전 작업 정보 조회 (담당자 변경 추적용)
    const previousTask = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!previousTask) {
      return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
    }

    // 작업 업데이트
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title,
        description: typeof description === 'string' 
          ? { 
              type: 'doc', 
              content: [{ 
                type: 'paragraph', 
                content: [{ type: 'text', text: description }] 
              }] 
            }
          : description,
        status,
        priority,
        assignee,
        projectId,
        epicId,
        dueDate: dueDate ? new Date(dueDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        updatedAt: new Date()
      }
    });

    // 담당자 변경 여부 확인
    const assigneeChanged = previousTask.assignee !== assignee;
    
    // 작업 업데이트 알림 이벤트 발생
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/notifications/task-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'task_updated',
          taskId: updatedTask.id,
          projectId: updatedTask.projectId,
          newStatus: status,
          assigneeChanged,
          previousAssignee: previousTask.assignee,
          newAssignee: assignee,
        }),
      });
    } catch (notificationError) {
      console.error('작업 업데이트 알림 발생 중 오류:', notificationError);
      // 알림 실패해도 작업 업데이트는 성공으로 처리
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("작업 업데이트 중 오류 발생:", error);
    
    // 상세 에러 로깅 추가
    if (error instanceof Error) {
      console.error("에러 이름:", error.name);
      console.error("에러 메시지:", error.message);
      console.error("에러 스택:", error.stack);
    }
    
    return NextResponse.json({ 
      error: "작업 업데이트에 실패했습니다.", 
      details: error instanceof Error ? error.message : "알 수 없는 오류" 
    }, { status: 500 });
  }
}

// 작업 삭제 (DELETE)
export async function DELETE(req: NextRequest) {
  try {
    // 개발 중 인증 체크 임시 우회
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    // }
    
    // 임시 세션 정보
    const session = { user: { id: "temp-user-id" } };

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "작업 ID가 필요합니다." }, { status: 400 });
    }

    // 작업 삭제 (연결된 댓글도 CASCADE로 삭제됨)
    await prisma.task.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("작업 삭제 중 오류 발생:", error);
    return NextResponse.json({ error: "작업 삭제에 실패했습니다." }, { status: 500 });
  }
} 