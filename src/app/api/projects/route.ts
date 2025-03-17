import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 모든 프로젝트 가져오기
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        tasks: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error('프로젝트 조회 오류:', error);
    return NextResponse.json(
      { error: '프로젝트를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 새 프로젝트 생성
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { name, description } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: '프로젝트 이름은 필수입니다.' },
        { status: 400 }
      );
    }
    
    const project = await prisma.project.create({
      data: {
        name,
        description,
      },
    });
    
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('프로젝트 생성 오류:', error);
    return NextResponse.json(
      { error: '프로젝트를 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 