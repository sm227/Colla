import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getTokenFromCookie, verifyToken } from "@/app/lib/auth";

const prisma = new PrismaClient();

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

// 작업 관련 알림 조회 API
export async function GET(req: NextRequest) {
  try {
    // 현재 사용자 확인
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 현재 사용자가 속한 프로젝트 조회
    const userProjects = await prisma.project.findMany({
      where: {
        OR: [
          { userId: currentUser.id }, // 소유한 프로젝트
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

    if (projectIds.length === 0) {
      return NextResponse.json([]);
    }

    // 최근 24시간 이내의 작업 이벤트 조회
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    try {
      // TaskEvent 테이블 존재 여부 확인 후 조회 시도
      let taskEvents: any[] = [];
      
      try {
        taskEvents = await prisma.taskEvent.findMany({
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
        
        console.log(`TaskEvent에서 ${taskEvents.length}개의 이벤트를 찾았습니다.`);
      } catch (taskEventError) {
        console.log("TaskEvent 테이블이 존재하지 않거나 조회 실패:", taskEventError);
        taskEvents = [];
      }

      // TaskEvent가 없거나 적으면 기존 방식도 함께 사용
      if (taskEvents.length === 0) {
        console.log("TaskEvent가 비어있습니다. 기존 방식으로 폴백합니다.");
        throw new Error("TaskEvent가 비어있음");
      }

      // TaskEvent에서 알림 생성 (본인 할당 작업 + 담당자 없는 새 작업)
      const notifications = taskEvents
        .filter((event) => {
          try {
            // 담당자 변경 이벤트인 경우 본인이 새 담당자일 때만 알림
            if (event.eventType === "assignee_changed") {
              return event.newAssignee === currentUser.id;
            }
            
            // 작업 생성 이벤트인 경우: 본인에게 할당되었거나 담당자가 없는 경우
            if (event.eventType === "task_created") {
              return event.newAssignee === currentUser.id || !event.newAssignee;
            }
            
            // 기타 이벤트는 본인에게 할당된 경우만
            return event.newAssignee === currentUser.id;
          } catch (filterError) {
            console.log("TaskEvent 필터링 중 오류:", filterError);
            return false;
          }
        })
        .map((event) => {
          let title = "";
          let message = "";

                  switch (event.eventType) {
          case "task_created":
            if (event.newAssignee === currentUser.id) {
              title = `새 작업이 할당됨: ${event.task.title}`;
            } else {
              title = `새 작업 생성됨: ${event.task.title}`;
            }
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
          id: event.id, // 이벤트의 고유 ID 사용
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

      console.log(`TaskEvent에서 ${notifications.length}개의 알림을 생성했습니다.`);
      return NextResponse.json(notifications);

    } catch (eventError) {
      console.log("TaskEvent 조회 실패 또는 데이터 부족. 기존 방식으로 폴백합니다:", eventError);
      
      // TaskEvent 테이블이 없거나 데이터가 없는 경우 기존 방식으로 폴백
      const recentTasks = await prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          updatedAt: { gte: twentyFourHoursAgo }
        },
        include: {
          project: { select: { name: true } }
        },
        orderBy: { updatedAt: "desc" },
        take: 50
      });

      console.log(`기존 방식에서 ${recentTasks.length}개의 작업을 찾았습니다.`);
      
      // 본인에게 할당된 작업 + 담당자 없는 작업 필터링
      const relevantTasks = recentTasks.filter(task => {
        const createdDate = new Date(task.createdAt);
        const updatedDate = new Date(task.updatedAt);
        const isNewTask = Math.abs(createdDate.getTime() - updatedDate.getTime()) < 60000; // 1분 이내면 새 작업
        
        // 새로 생성된 작업이면서 담당자가 없는 경우 OR 본인에게 할당된 작업
        return (isNewTask && !task.assignee) || task.assignee === currentUser.id;
      });
      console.log(`그 중 관련된 ${relevantTasks.length}개의 작업을 찾았습니다.`);

      // 담당자 정보 조회를 위해 고유한 담당자 ID 목록 추출
      const assigneeIds = Array.from(new Set(relevantTasks.map((task: any) => task.assignee).filter(Boolean))) as string[];
      
      // 담당자 정보 일괄 조회
      const assigneeUsers = await prisma.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true, name: true }
      });
      
      const assigneeMap = new Map(assigneeUsers.map(user => [user.id, user.name]));

      // 알림 형태로 변환하면서 담당자 변경 정보 추가
      const notifications = relevantTasks.map((task: any) => {
        const createdDate = new Date(task.createdAt);
        const updatedDate = new Date(task.updatedAt);
        const isNewTask = Math.abs(createdDate.getTime() - updatedDate.getTime()) < 60000; // 1분 이내면 새 작업
        
        let title = "";
        let message = "";
        let notificationType = "";

        // 각 알림에 고유 ID 생성 (작업 ID + 타임스탬프)
        const uniqueId = `${task.id}-${task.updatedAt.getTime()}`;

        if (isNewTask) {
          if (task.assignee === currentUser.id) {
            notificationType = "task_assigned";
            title = `새 작업이 할당됨: ${task.title}`;
          } else {
            notificationType = "task_created";
            title = `새 작업 생성됨: ${task.title}`;
          }
          message = task.project?.name 
            ? `프로젝트: ${task.project.name}` 
            : "프로젝트 정보 없음";
        } else {
          // 작업 업데이트의 경우
          notificationType = "task_updated";
          title = `할당된 작업 업데이트: ${task.title}`;
          message = task.project?.name 
            ? `프로젝트: ${task.project.name}` 
            : "프로젝트 정보 없음";
        }

        return {
          id: uniqueId, // 고유한 ID 사용
          type: notificationType as "task_assigned" | "task_created" | "task_updated",
          title,
          message,
          link: `/kanban?projectId=${task.projectId}`,
          createdAt: task.updatedAt,
          isRead: false,
          projectId: task.projectId,
          taskId: task.id, // 원본 작업 ID도 별도로 저장
        };
      });

      console.log(`기존 방식에서 ${notifications.length}개의 알림을 생성했습니다.`);
      return NextResponse.json(notifications);
    }

  } catch (error) {
    console.error("작업 알림 조회 중 오류 발생:", error);
    return NextResponse.json(
      { error: "작업 알림을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
} 