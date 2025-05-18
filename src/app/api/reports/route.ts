import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 프로젝트 통계
    const projects = await prisma.project.findMany({
      include: {
        tasks: true,
        members: {
          include: {
            user: true
          }
        }
      }
    });

    // 작업 통계
    const tasks = await prisma.task.findMany();

    // 상태별 작업 수
    const taskStatusCount = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 프로젝트별 진행률
    const projectProgress = projects.map(project => {
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(task => task.status === "done").length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      return {
        id: project.id,
        name: project.name,
        progress,
        totalTasks,
        completedTasks,
        members: project.members.map(member => ({
          id: member.user.id,
          name: member.user.name,
          role: member.role
        }))
      };
    });

    // 팀원별 성과
    const memberPerformance = projects.reduce((acc, project) => {
      project.members.forEach(member => {
        const memberId = member.user.id;
        if (!acc[memberId]) {
          acc[memberId] = {
            id: memberId,
            name: member.user.name,
            role: member.role,
            completedTasks: 0,
            totalTasks: 0,
            projects: 0
          };
        }
        acc[memberId].projects += 1;
        acc[memberId].totalTasks += project.tasks.length;
        acc[memberId].completedTasks += project.tasks.filter(task => task.status === "done").length;
      });
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      projects: projectProgress,
      taskStatus: taskStatusCount,
      members: Object.values(memberPerformance)
    });
  } catch (error) {
    console.error("Error fetching report data:", error);
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
  }
} 