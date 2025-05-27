import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripHtmlTags } from '@/lib/utils';

// 특정 태스크 가져오기
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    const task = await prisma.task.findUnique({
      where: { id },
    });
    
    if (!task) {
      return NextResponse.json(
        { error: '태스크를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(task);
  } catch (error) {
    console.error('태스크 조회 오류:', error);
    return NextResponse.json(
      { error: '태스크를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 태스크 업데이트 (부분 업데이트)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    
    const { title, description, status, priority, assignee, dueDate } = body;
    
    // HTML 태그 제거
    const cleanDescription = description !== undefined 
      ? stripHtmlTags(description) 
      : undefined;
    
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description: cleanDescription }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assignee !== undefined && { assignee }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
    });
    
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('태스크 업데이트 오류:', error);
    return NextResponse.json(
      { error: '태스크를 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 태스크 전체 업데이트 (전체 리소스 교체)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    
    // 유효성 검사
    if (!body.title || !body.status || !body.priority) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다 (title, status, priority)' },
        { status: 400 }
      );
    }
    
    // 날짜 데이터 변환 (dueDate만 처리)
    let formattedDueDate = null;
    if (body.dueDate) {
      formattedDueDate = new Date(body.dueDate);
      // 날짜 유효성 검사
      if (isNaN(formattedDueDate.getTime())) {
        return NextResponse.json(
          { error: '유효하지 않은 날짜 형식입니다.' },
          { status: 400 }
        );
      }
    }
    
    // HTML 태그 제거
    const cleanDescription = body.description ? stripHtmlTags(body.description) : '';
    
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title: body.title,
        description: cleanDescription, // HTML 태그가 제거된 설명 저장
        status: body.status,
        priority: body.priority,
        assignee: body.assignee || null,
        dueDate: formattedDueDate,
        projectId: body.projectId || null,
      },
    });
    
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('태스크 전체 업데이트 오류:', error);
    return NextResponse.json(
      { error: '태스크를 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 태스크 삭제
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    await prisma.task.delete({
      where: { id },
    });
    
    return NextResponse.json({ message: '태스크가 삭제되었습니다.' });
  } catch (error) {
    console.error('태스크 삭제 오류:', error);
    return NextResponse.json(
      { error: '태스크를 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 