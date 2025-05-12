import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const meeting = await prisma.meeting.findUnique({
      where: { id }
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, message: '회의를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: meeting },
      { status: 200 }
    );
  } catch (error) {
    console.error('회의 상세 조회 오류:', error);
    return NextResponse.json(
      { success: false, message: '회의 상세 정보를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 