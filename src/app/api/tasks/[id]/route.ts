import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from '../../../../lib/prisma';
import { stripHtmlTags } from '@/lib/utils';

// 개별 작업 조회 (GET)
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    // 개발 중 인증 체크 임시 우회
    const session = { user: { id: "temp-user-id" } };

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            name: true
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("작업 조회 중 오류 발생:", error);
    return NextResponse.json({ error: "작업 조회에 실패했습니다." }, { status: 500 });
  }
}

// 개별 작업 업데이트 (PUT)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    console.log("🔍 PUT 요청 받음 - ID:", id);
    
    // 개발 중 인증 체크 임시 우회
    const session = { user: { id: "temp-user-id" } };

    const body = await request.json();
    console.log("🔍 요청 본문:", JSON.stringify(body, null, 2));
    
    const { title, description, status, priority, assignee, projectId, epicId, dueDate, startDate, endDate } = body;

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

    // description 처리: 문자열이면 JSON 형식으로 변환, 아니면 그대로 사용
    let processedDescription = description;
    if (typeof description === 'string') {
      processedDescription = {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: description }]
        }]
      };
    }

    // 작업 업데이트
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: processedDescription }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(assignee !== undefined && { assignee }),
        ...(projectId !== undefined && { projectId }),
        ...(epicId !== undefined && { epicId }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        updatedAt: new Date()
      }
    });

    console.log("✅ 작업 업데이트 성공:", updatedTask.id);

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
    console.error("❌ PUT 에러 상세:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause
    });
    
    return NextResponse.json({ 
      error: "작업 업데이트에 실패했습니다.", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 개별 작업 상태 업데이트 (PATCH)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    console.log("🔍 PATCH 요청 받음 - ID:", id);
    
    // 개발 중 인증 체크 임시 우회
    const session = { user: { id: "temp-user-id" } };

    const body = await request.json();
    console.log("🔍 PATCH 요청 본문:", JSON.stringify(body, null, 2));
    
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "상태 정보가 필요합니다." }, { status: 400 });
    }

    // 작업 상태 업데이트
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date()
      }
    });

    console.log("✅ 작업 상태 업데이트 성공:", updatedTask.id, "->", status);

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("❌ PATCH 에러 상세:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
    
    return NextResponse.json({ 
      error: "작업 상태 업데이트에 실패했습니다.", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 개별 작업 삭제 (DELETE)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    // 개발 중 인증 체크 임시 우회
    const session = { user: { id: "temp-user-id" } };

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