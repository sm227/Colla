import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 특정 프로젝트 가져오기
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: true,
      },
    });
    
    if (!project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(project);
  } catch (error) {
    console.error('프로젝트 조회 오류:', error);
    return NextResponse.json(
      { error: '프로젝트를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 프로젝트 업데이트
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    
    const { name, description } = body;
    
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });
    
    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('프로젝트 업데이트 오류:', error);
    return NextResponse.json(
      { error: '프로젝트를 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 프로젝트 삭제
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // 프로젝트에 속한 모든 태스크 삭제
    await prisma.task.deleteMany({
      where: { projectId: id },
    });
    
    // 프로젝트 삭제
    await prisma.project.delete({
      where: { id },
    });
    
    return NextResponse.json({ message: '프로젝트가 삭제되었습니다.' });
  } catch (error) {
    console.error('프로젝트 삭제 오류:', error);
    return NextResponse.json(
      { error: '프로젝트를 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 