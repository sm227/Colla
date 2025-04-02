import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 모든 태스크 가져오기
export async function GET() {
  try {
    console.log('모든 태스크 API 호출됨');
    
    // 모든 태스크 가져오기 (프로젝트 정보 포함)
    const tasks = await prisma.task.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    console.log(`모든 태스크 ${tasks.length}개 조회 완료`);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('태스크 조회 오류:', error);
    return NextResponse.json(
      { error: '태스크를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 새 태스크 생성
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { title, description, status, priority, assignee, dueDate, projectId } = body;
    
    if (!title || !status || !priority) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
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