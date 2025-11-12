import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: {
        startTime: 'desc'
      }
    });

    return NextResponse.json(
      { 
        success: true, 
        data: meetings 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('회의 조회 오류:', error);
    return NextResponse.json(
      { success: false, message: '회의 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      id,
      title,
      startTime,
      endTime,
      transcript,
      mainPoints,
      decisions,
      actionItems,
      participants,
      projectId,
      creatorId
    } = body;

    // ID가 제공된 경우 기존 회의 확인
    if (id) {
      const existingMeeting = await prisma.meeting.findUnique({
        where: { id }
      });

      // 이미 회의가 존재하면 반환
      if (existingMeeting) {
        return NextResponse.json(
          {
            success: true,
            message: '기존 회의를 불러왔습니다.',
            data: existingMeeting,
            isExisting: true
          },
          { status: 200 }
        );
      }
    }

    // 회의 데이터 저장 (ID가 있으면 사용, 없으면 자동 생성)
    const meeting = await prisma.meeting.create({
      data: {
        ...(id && { id }), // ID가 있으면 포함
        title,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : undefined,
        transcript,
        mainPoints,
        decisions,
        actionItems,
        participants, // JSON 형태로 저장
        projectId,
        creatorId // 회의 생성자 ID
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: '회의가 성공적으로 생성되었습니다.',
        data: meeting,
        isExisting: false
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('회의 저장 오류:', error);
    return NextResponse.json(
      { success: false, message: '회의 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
} 