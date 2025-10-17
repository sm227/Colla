import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { sendEmail, createDeadlineEmailTemplate } from '@/lib/email';

export const runtime = 'nodejs';

// 마감일이 임박한 작업을 체크하고 알림 전송
export async function POST(request: NextRequest) {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // 마감일이 3일 이내인 작업 찾기
    const upcomingTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: threeDaysLater,
        },
        status: {
          not: 'done', // 완료된 작업은 제외
        },
      },
      include: {
        project: {
          include: {
            user: true, // 프로젝트 소유자
            members: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    console.log(`마감일 임박 작업 ${upcomingTasks.length}개 발견`);

    const emailResults = [];

    for (const task of upcomingTasks) {
      if (!task.dueDate || !task.project) continue;

      const daysRemaining = Math.ceil(
        (task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 담당자 찾기
      let assigneeEmail: string | null = null;
      let assigneeName: string | null = null;

      if (task.assignee) {
        // assignee가 userId인 경우
        const assigneeUser = await prisma.user.findUnique({
          where: { id: task.assignee },
        });

        if (assigneeUser) {
          assigneeEmail = assigneeUser.email;
          assigneeName = assigneeUser.name;
        }
      }

      // 담당자가 없으면 프로젝트 소유자에게 알림
      if (!assigneeEmail && task.project.user) {
        assigneeEmail = task.project.user.email;
        assigneeName = task.project.user.name;
      }

      if (!assigneeEmail) {
        console.log(`작업 ${task.id}의 알림 수신자를 찾을 수 없습니다.`);
        continue;
      }

      // 이미 오늘 알림을 보냈는지 체크 (중복 방지)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const existingNotification = await prisma.taskEvent.findFirst({
        where: {
          taskId: task.id,
          eventType: 'deadline_reminder',
          createdAt: {
            gte: todayStart,
          },
        },
      });

      if (existingNotification) {
        console.log(`작업 ${task.id}는 오늘 이미 알림을 전송했습니다.`);
        continue;
      }

      // 이메일 전송
      const taskUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/kanban?projectId=${task.projectId}`;

      const emailHtml = createDeadlineEmailTemplate({
        userName: assigneeName || '사용자',
        taskTitle: task.title,
        taskDescription: typeof task.description === 'string' ? task.description : undefined,
        dueDate: task.dueDate,
        projectName: task.project.name,
        daysRemaining,
        taskUrl,
      });

      const result = await sendEmail({
        to: assigneeEmail,
        subject: `[Colla] 작업 마감일 알림: ${task.title} (${daysRemaining === 0 ? '오늘' : `${daysRemaining}일 후`})`,
        html: emailHtml,
      });

      emailResults.push({
        taskId: task.id,
        taskTitle: task.title,
        recipient: assigneeEmail,
        success: result.success,
        error: result.error,
      });

      // 알림 전송 기록 저장
      if (result.success) {
        await prisma.taskEvent.create({
          data: {
            taskId: task.id,
            projectId: task.projectId,
            eventType: 'deadline_reminder',
            description: `마감일 ${daysRemaining}일 전 알림 전송 (${assigneeEmail})`,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${upcomingTasks.length}개의 작업을 체크하고 ${emailResults.filter(r => r.success).length}개의 알림을 전송했습니다.`,
      results: emailResults,
    });
  } catch (error) {
    console.error('마감일 체크 중 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '마감일 체크 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}
