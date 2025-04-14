import { NextResponse } from 'next/server';
import { getTokenFromCookie, verifyToken } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';

// 댓글 수정 API
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const commentId = params.id;
    
    // 인증 확인
    const token = getTokenFromCookie();
    if (!token) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: '인증이 만료되었습니다.' }, { status: 401 });
    }
    
    const userId = typeof decoded === 'string' ? decoded : decoded.id;
    
    // 요청 본문 가져오기
    const body = await request.json();
    const { content } = body;
    
    if (!content) {
      return NextResponse.json({ error: '댓글 내용이 필요합니다.' }, { status: 400 });
    }
    
    // 댓글 존재 여부 및 소유권 확인
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });
    
    if (!existingComment) {
      return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 자신의 댓글인지 확인
    if (existingComment.userId !== userId) {
      return NextResponse.json({ error: '이 댓글을 수정할 권한이 없습니다.' }, { status: 403 });
    }
    
    // 댓글 수정
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
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
    
    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error('댓글 수정 오류:', error);
    return NextResponse.json({ error: '댓글을 수정하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 댓글 삭제 API
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const commentId = params.id;
    
    // 인증 확인
    const token = getTokenFromCookie();
    if (!token) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: '인증이 만료되었습니다.' }, { status: 401 });
    }
    
    const userId = typeof decoded === 'string' ? decoded : decoded.id;
    
    // 댓글 존재 여부 및 소유권 확인
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });
    
    if (!existingComment) {
      return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 자신의 댓글인지 확인
    if (existingComment.userId !== userId) {
      return NextResponse.json({ error: '이 댓글을 삭제할 권한이 없습니다.' }, { status: 403 });
    }
    
    // 댓글 삭제
    await prisma.comment.delete({
      where: { id: commentId },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    return NextResponse.json({ error: '댓글을 삭제하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 