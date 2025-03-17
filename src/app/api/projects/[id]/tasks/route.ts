import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    
    const { title, description, status, priority, assignee, dueDate } = body;
    
    if (!title || !status || !priority) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
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
        description,
        status,
        priority,
        assignee,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
      },
    });
    
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('태스크 생성 오류:', error);
    return NextResponse.json(
      { error: '태스크를 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 