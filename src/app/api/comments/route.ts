import { NextResponse } from 'next/server';
import { getTokenFromCookie, verifyToken } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const token = getTokenFromCookie();
    
    if (!token) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: '인증이 만료되었습니다.' }, { status: 401 });
    }
    
    const userId = typeof decoded === 'string' ? decoded : decoded.id;
    
    const body = await request.json();
    const { content, taskId } = body;
    
    if (!content || !taskId) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }
    
    // 댓글 생성
    const comment = await prisma.comment.create({
      data: {
        content,
        taskId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return NextResponse.json(comment);
  } catch (error) {
    console.error('댓글 생성 오류:', error);
    return NextResponse.json({ error: '댓글을 생성하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    
    if (!taskId) {
      return NextResponse.json({ error: '태스크 ID가 필요합니다.' }, { status: 400 });
    }
    
    const comments = await prisma.comment.findMany({
      where: {
        taskId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    
    return NextResponse.json(comments);
  } catch (error) {
    console.error('댓글 조회 오류:', error);
    return NextResponse.json({ error: '댓글을 조회하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 