import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// 이미지 업로드
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { imageIds } = body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({ error: '이미지 ID가 필요합니다.' }, { status: 400 });
    }

    // 이미지들을 태스크에 연결
    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        imageIds: {
          push: imageIds
        }
      }
    });

    // 이미지 레코드들의 taskId 업데이트
    await prisma.image.updateMany({
      where: { 
        id: { in: imageIds } 
      },
      data: { 
        taskId: params.id 
      }
    });

    return NextResponse.json({ 
      message: '이미지가 태스크에 성공적으로 연결되었습니다.', 
      task: updatedTask 
    }, { status: 200 });

  } catch (error) {
    console.error('이미지 연결 오류:', error);
    return NextResponse.json({ error: '이미지 연결 중 오류 발생' }, { status: 500 });
  }
}

// 이미지 삭제
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ error: '이미지 ID가 필요합니다.' }, { status: 400 });
    }

    // 이미지 삭제
    await prisma.image.delete({
      where: { id: imageId }
    });

    // 태스크의 imageIds에서 해당 이미지 ID 제거
    const task = await prisma.task.update({
      where: { id: params.id },
      data: {
        imageIds: {
          set: (await prisma.task.findUnique({
            where: { id: params.id },
            select: { imageIds: true }
          }))?.imageIds.filter(id => id !== imageId) || []
        }
      }
    });

    return NextResponse.json({ 
      message: '이미지 삭제 성공', 
      task 
    }, { status: 200 });

  } catch (error) {
    console.error('이미지 삭제 오류:', error);
    return NextResponse.json({ error: '이미지 삭제 중 오류 발생' }, { status: 500 });
  }
} 