import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripHtmlTags } from '@/lib/utils';

// 프로젝트의 모든 태스크 가져오기
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: {
        createdAt: 'desc',
      },
      // 필요한 모든 필드 선택 (startDate, endDate, isAllDay 포함)
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        assignee: true,
        dueDate: true,
        startDate: true,
        endDate: true,
        isAllDay: true,
        createdAt: true,
        updatedAt: true,
        projectId: true
      }
    });
    
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('태스크 조회 오류:', error);
    return NextResponse.json(
      { error: '태스크를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 프로젝트에 새 태스크 추가
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    
    const { 
      title, 
      description, 
      status, 
      priority, 
      assignee, 
      dueDate,
      startDate,
      endDate,
      isAllDay 
    } = body;
    
    if (!title || !status || !priority) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    // HTML 태그 제거
    const cleanDescription = description ? stripHtmlTags(description) : '';
    
    // 프로젝트가 존재하는지 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    
    if (!project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    const task = await prisma.task.create({
      data: {
        title,
        description: cleanDescription,  // HTML 태그가 제거된 설명 저장
        status,
        priority,
        assignee,
        dueDate: dueDate ? new Date(dueDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isAllDay: isAllDay || false,
        projectId,
      },
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
          taskId: task.id,
          projectId: task.projectId,
          newAssignee: assignee, // 담당자 정보 추가
        }),
      });
    } catch (notificationError) {
      console.error('작업 생성 알림 발생 중 오류:', notificationError);
      // 알림 실패해도 작업 생성은 성공으로 처리
    }
    
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('태스크 생성 오류:', error);
    return NextResponse.json(
      { error: '태스크를 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 