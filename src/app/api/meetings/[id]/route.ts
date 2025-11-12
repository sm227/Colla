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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      endTime,
      transcript,
      mainPoints,
      decisions,
      actionItems,
      participants,
      isLastParticipant
    } = body;

    // 회의 존재 여부 확인
    const existingMeeting = await prisma.meeting.findUnique({
      where: { id }
    });

    if (!existingMeeting) {
      return NextResponse.json(
        { success: false, message: '회의를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 회의 정보 업데이트 (요약 및 전체 대화 내용)
    const updatedMeeting = await prisma.meeting.update({
      where: { id },
      data: {
        endTime: endTime ? new Date(endTime) : undefined,
        transcript,
        mainPoints,
        decisions,
        actionItems,
        participants,
        // 마지막 참가자가 나가면 회의 완료 처리
        status: isLastParticipant ? 'completed' : existingMeeting.status
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: '회의가 성공적으로 업데이트되었습니다.',
        data: updatedMeeting
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('회의 업데이트 오류:', error);
    return NextResponse.json(
      { success: false, message: '회의 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  }
} 