import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 댓글 수정
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const commentId = params.commentId;
    const body = await request.json();
    
    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: body.content,
      },
    });
    
    return NextResponse.json(comment);
  } catch (error) {
    console.error('댓글 수정 오류:', error);
    return NextResponse.json(
      { error: '댓글을 수정하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 댓글 삭제
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const commentId = params.commentId;
    
    await prisma.comment.delete({
      where: { id: commentId },
    });
    
    return NextResponse.json({ message: '댓글이 삭제되었습니다.' });
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    return NextResponse.json(
      { error: '댓글을 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 