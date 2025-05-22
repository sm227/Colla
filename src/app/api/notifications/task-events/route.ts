import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

// 작업 이벤트 처리 API (작업 생성, 상태 변경 등)
export async function POST(req: NextRequest) {
  try {
    // 세션 확인 (향후 인증 시 주석 해제)
    // const session = await getServerSession(authOptions);
    // if (!session || !session.user) {
    //   return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    // }
    
    // 현재는 임시 세션 정보로 처리
    const session = { user: { id: "temp-user-id" } };
    
    // 이벤트 데이터 파싱
    const eventData = await req.json();
    const { eventType, taskId, projectId, newStatus } = eventData;
    
    if (!eventType || !taskId) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다" }, 
        { status: 400 }
      );
    }
    
    // 관련 작업 정보 조회
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!task) {
      return NextResponse.json(
        { error: "작업을 찾을 수 없습니다" }, 
        { status: 404 }
      );
    }
    
    // 작업 알림 저장 (작업 이벤트 히스토리 테이블이 있다면 사용)
    // 현재는 간단히 작업 이벤트를 로그로 기록
    console.log(`작업 이벤트 발생: ${eventType}`, {
      taskId,
      projectId: task.projectId,
      projectName: task.project?.name,
      taskTitle: task.title,
      status: eventType === 'task_updated' ? newStatus : task.status
    });
    
    // 실제 데이터베이스에 이벤트 기록을 저장하는 코드 (스키마에 TaskEvent 테이블이 있는 경우)
    // await prisma.taskEvent.create({
    //   data: {
    //     eventType,
    //     taskId,
    //     projectId: task.projectId || undefined,
    //     status: eventType === 'task_updated' ? newStatus : task.status,
    //     userId: session.user.id
    //   }
    // });
    
    // 성공 응답
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("작업 이벤트 처리 중 오류 발생:", error);
    return NextResponse.json(
      { error: "작업 이벤트 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
} 