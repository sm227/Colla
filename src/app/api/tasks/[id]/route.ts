import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

// 태스크 업데이트
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    
    const { title, description, status, priority, assignee, dueDate } = body;
    
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
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