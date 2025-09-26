import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const epics = await prisma.epic.findMany({
      where: {
        projectId: projectId
      },
      include: {
        project: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return NextResponse.json(epics);
  } catch (error) {
    console.error('Error fetching epics:', error);
    return NextResponse.json({ error: 'Failed to fetch epics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, startDate, endDate, projectId, color } = body;

    if (!title || !projectId) {
      return NextResponse.json({ error: 'Title and project ID are required' }, { status: 400 });
    }

    const epic = await prisma.epic.create({
      data: {
        title,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        projectId,
        color: color || '#4F46E5'
      },
      include: {
        project: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json(epic, { status: 201 });
  } catch (error) {
    console.error('Error creating epic:', error);
    return NextResponse.json({ error: 'Failed to create epic' }, { status: 500 });
  }
}

// 에픽 수정 (PUT)
export async function PUT(req: NextRequest) {
  try {
    // 개발 중 인증 체크 임시 우회
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    // }
    
    // 임시 세션 정보
    const session = { user: { id: "temp-user-id" } };

    const body = await req.json();
    const { id, title, description, color, projectId } = body;

    if (!id || !title) {
      return NextResponse.json({ error: "ID와 제목은 필수 항목입니다." }, { status: 400 });
    }

    // 에픽 수정
    const updatedEpic = await prisma.epic.update({
      where: { id },
      data: {
        title,
        description,
        color,
        projectId
      }
    });

    return NextResponse.json(updatedEpic);
  } catch (error) {
    console.error("에픽 수정 중 오류 발생:", error);
    return NextResponse.json({ error: "에픽 수정에 실패했습니다." }, { status: 500 });
  }
}

// 에픽 삭제 (DELETE)
export async function DELETE(req: NextRequest) {
  try {
    // 개발 중 인증 체크 임시 우회
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    // }
    
    // 임시 세션 정보
    const session = { user: { id: "temp-user-id" } };

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "에픽 ID가 필요합니다." }, { status: 400 });
    }

    // 에픽 삭제 (연결된 작업들의 epicId를 null로 설정)
    await prisma.task.updateMany({
      where: {
        epicId: id
      },
      data: {
        epicId: null
      }
    });

    // 에픽 삭제
    await prisma.epic.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("에픽 삭제 중 오류 발생:", error);
    return NextResponse.json({ error: "에픽 삭제에 실패했습니다." }, { status: 500 });
  }
}

// 에픽 부분 수정 (PATCH)
export async function PATCH(req: NextRequest) {
  try {
    // 개발 중 인증 체크 임시 우회
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    // }
    
    // 임시 세션 정보
    const session = { user: { id: "temp-user-id" } };

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const body = await req.json();
    const { title } = body;

    if (!id || !title) {
      return NextResponse.json({ error: "ID와 제목은 필수 항목입니다." }, { status: 400 });
    }

    // 에픽 부분 수정 (제목만)
    const updatedEpic = await prisma.epic.update({
      where: { id },
      data: {
        title
      }
    });

    return NextResponse.json(updatedEpic);
  } catch (error) {
    console.error("에픽 부분 수정 중 오류 발생:", error);
    return NextResponse.json({ error: "에픽 부분 수정에 실패했습니다." }, { status: 500 });
  }
} 