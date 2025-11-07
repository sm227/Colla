import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookie, verifyToken } from "@/app/lib/auth";
import { prisma } from '../../lib/prisma';

export const dynamic = 'force-dynamic';

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

// 통합 알림 조회 API (작업 알림 + 멘션 알림)
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 최근 24시간 이내
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // 작업 알림 조회
    const userProjects = await prisma.project.findMany({
      where: {
        OR: [
          { userId: currentUser.id },
          {
            members: {
              some: {
                userId: currentUser.id,
                inviteStatus: "accepted"
              }
            }
          }
        ]
      },
      select: { id: true }
    });

    const projectIds = userProjects.map(p => p.id);
    let taskNotifications: any[] = [];

    if (projectIds.length > 0) {
      try {
        const taskEvents = await prisma.taskEvent.findMany({
          where: {
            projectId: { in: projectIds },
            createdAt: { gte: twentyFourHoursAgo }
          },
          include: {
            task: { select: { title: true, projectId: true } },
            project: { select: { name: true } },
            previousUser: { select: { name: true } },
            newUser: { select: { name: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 50
        });

        taskNotifications = taskEvents
          .filter((event) => {
            if (event.eventType === "assignee_changed") {
              return event.newAssignee === currentUser.id;
            }
            if (event.eventType === "task_created") {
              return event.newAssignee === currentUser.id || !event.newAssignee;
            }
            return event.newAssignee === currentUser.id;
          })
          .map((event) => {
            let title = "";
            let message = "";

            switch (event.eventType) {
              case "task_created":
                title = event.newAssignee === currentUser.id
                  ? `새 작업이 할당됨: ${event.task.title}`
                  : `새 작업 생성됨: ${event.task.title}`;
                message = event.project?.name ? `프로젝트: ${event.project.name}` : "프로젝트 정보 없음";
                break;
              case "assignee_changed":
                title = `작업이 할당됨: ${event.task.title}`;
                message = event.project?.name ? `프로젝트: ${event.project.name}` : "프로젝트 정보 없음";
                break;
              default:
                title = `할당된 작업 업데이트: ${event.task.title}`;
                message = event.description || (event.project?.name ? `프로젝트: ${event.project.name}` : "프로젝트 정보 없음");
            }

            return {
              id: `task-${event.id}`,
              type: event.eventType === "task_created"
                ? (event.newAssignee === currentUser.id ? "task_assigned" : "task_created")
                : "task_updated",
              title,
              message,
              link: `/kanban?projectId=${event.task.projectId}`,
              createdAt: event.createdAt,
              isRead: false,
              projectId: event.projectId,
              taskId: event.taskId,
            };
          });
      } catch (eventError) {
        console.log("TaskEvent 조회 실패, 스킵:", eventError);
      }
    }

    // 시간순 정렬
    const allNotifications = taskNotifications
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100); // 최대 100개

    return NextResponse.json(allNotifications);

  } catch (error) {
    console.error("알림 조회 중 오류 발생:", error);
    return NextResponse.json(
      { error: "알림을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
