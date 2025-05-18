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
      title, 
      startTime, 
      endTime, 
      transcript, 
      mainPoints, 
      decisions, 
      actionItems, 
      participants,
      projectId
    } = body;

    // 회의 데이터 저장
    const meeting = await prisma.meeting.create({
      data: {
        title,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : undefined,
        transcript,
        mainPoints,
        decisions,
        actionItems,
        participants, // JSON 형태로 저장
        projectId
      },
    });

    return NextResponse.json(
      { 
        success: true, 
        message: '회의가 성공적으로 저장되었습니다.', 
        data: meeting 
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