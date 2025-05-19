import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

// 작업 관련 알림 조회 API
export async function GET(req: NextRequest) {
  try {
    // 세션 확인 (향후 인증 시 주석 해제)
    // const session = await getServerSession(authOptions);
    // if (!session || !session.user) {
    //   return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    // }
    
    // 현재는 임시 세션 정보로 처리
    const session = { user: { id: "temp-user-id" } };
    
    // 최근 작업 알림 가져오기 (최근 7일 이내 생성/수정된 작업)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // 작업 가져오기
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { createdAt: { gte: sevenDaysAgo } }, // 최근에 생성된 작업
          { updatedAt: { gte: sevenDaysAgo } }  // 최근에 업데이트된 작업
        ]
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10 // 최대 10개만 가져오기
    });
    
    // 작업 알림 형식으로 변환
    const taskNotifications = tasks.map(task => ({
      id: task.id,
      projectId: task.projectId || "",
      taskId: task.id,
      title: task.title,
      description: task.description || "",
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      project: task.project
    }));
    
    return NextResponse.json(taskNotifications);
    
  } catch (error) {
    console.error("작업 알림 조회 중 오류 발생:", error);
    return NextResponse.json(
      { error: "작업 알림을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
} 