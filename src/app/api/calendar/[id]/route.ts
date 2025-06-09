import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// 현재 사용자 ID 가져오기 (실제 인증 로직으로 대체 필요)
async function getCurrentUserId() {
  // 실제 환경에서는 세션이나 토큰을 통해 인증된 사용자의 ID를 가져와야 함
  // 테스트용으로 임시로 사용자 ID 반환
  const user = await prisma.user.findFirst();
  return user?.id;
}

// 사용자가 캘린더 이벤트를 수정/삭제할 권한이 있는지 확인
async function hasEventPermission(userId: string, eventId: string) {
  try {
    // 이벤트 정보 조회
    const event = await prisma.calendar.findUnique({
      where: { id: eventId },
      include: {
        project: {
          include: {
            members: {
              where: {
                userId: userId,
                inviteStatus: 'accepted'
              }
            }
          }
        }
      }
    });

    if (!event) return false;
    
    // 본인이 생성한 이벤트이거나
    if (event.userId === userId) return true;
    
    // 프로젝트 이벤트이고 본인이 해당 프로젝트의 멤버인 경우
    if (event.projectId && event.project && event.project.members && event.project.members.length > 0) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('권한 확인 오류:', error);
    return false;
  }
}

// GET - 특정 캘린더 이벤트 조회
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { id } = await params;

    // 캘린더 이벤트 조회
    const event = await prisma.calendar.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: '캘린더 이벤트를 찾을 수 없습니다' }, { status: 404 });
    }

    // 접근 권한 확인
    const hasPermission = await hasEventPermission(userId, id);
    if (!hasPermission) {
      return NextResponse.json({ error: '캘린더 이벤트에 접근할 권한이 없습니다' }, { status: 403 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('캘린더 이벤트 조회 오류:', error);
    return NextResponse.json(
      { error: '캘린더 이벤트를 조회하는 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// PATCH - 캘린더 이벤트 수정
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // 기존 이벤트 확인
    const existingEvent = await prisma.calendar.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      return NextResponse.json({ error: '캘린더 이벤트를 찾을 수 없습니다' }, { status: 404 });
    }

    // 권한 체크 없이 바로 업데이트
    const updateData: Record<string, any> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.isAllDay !== undefined) updateData.isAllDay = data.isAllDay;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;

    // 캘린더 이벤트 업데이트
    const updatedEvent = await prisma.calendar.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('캘린더 이벤트 업데이트 오류:', error);
    return NextResponse.json(
      { error: '캘린더 이벤트를 업데이트하는 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// DELETE - 캘린더 이벤트 삭제
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { id } = await params;

    // 삭제할 이벤트 확인
    const existingEvent = await prisma.calendar.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      return NextResponse.json({ error: '캘린더 이벤트를 찾을 수 없습니다' }, { status: 404 });
    }

    // 삭제 권한 확인
    const hasPermission = await hasEventPermission(userId, id);
    if (!hasPermission) {
      return NextResponse.json({ error: '캘린더 이벤트를 삭제할 권한이 없습니다' }, { status: 403 });
    }

    // 캘린더 이벤트 삭제
    await prisma.calendar.delete({
      where: { id }
    });

    return NextResponse.json({ message: '캘린더 이벤트가 삭제되었습니다' });
  } catch (error) {
    console.error('캘린더 이벤트 삭제 오류:', error);
    return NextResponse.json(
      { error: '캘린더 이벤트를 삭제하는 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
} 