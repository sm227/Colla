import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 댓글 목록 조회
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    
    const comments = await prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(comments);
  } catch (error) {
    console.error('댓글 조회 오류:', error);
    return NextResponse.json(
      { error: '댓글을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 댓글 작성
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    const body = await request.json();
    
    const comment = await prisma.comment.create({
      data: {
        content: body.content,
        author: body.author,
        taskId,
      },
    });
    
    return NextResponse.json(comment);
  } catch (error) {
    console.error('댓글 작성 오류:', error);
    return NextResponse.json(
      { error: '댓글을 작성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 