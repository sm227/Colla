import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

// 에픽 목록 조회 (GET)
export async function GET(req: NextRequest) {
  try {
    // 개발 중 인증 체크 임시 우회
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    // }
    
    // 임시 세션 정보
    const session = { user: { id: "temp-user-id" } };

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    
    // 프로젝트별 에픽 조회 또는 전체 에픽 조회
    let epics;
    if (projectId) {
      epics = await prisma.epic.findMany({
        where: {
          projectId: projectId
        },
        include: {
          tasks: true,
        },
        orderBy: {
          createdAt: "asc"
        }
      });
    } else {
      // 모든 에픽 조회 (개발 편의를 위해 사용자 체크 없이)
      epics = await prisma.epic.findMany({
        include: {
          tasks: true,
        },
        orderBy: {
          createdAt: "asc"
        }
      });
    }

    return NextResponse.json(epics);
  } catch (error) {
    console.error("에픽 조회 중 오류 발생:", error);
    return NextResponse.json({ error: "에픽 조회에 실패했습니다." }, { status: 500 });
  }
}

// 에픽 생성 (POST)
export async function POST(req: NextRequest) {
  try {
    // 개발 중 인증 체크 임시 우회
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    // }
    
    // 임시 세션 정보
    const session = { user: { id: "temp-user-id" } };

    const body = await req.json();
    const { title, description, projectId, color } = body;

    if (!title) {
      return NextResponse.json({ error: "제목은 필수 항목입니다." }, { status: 400 });
    }

    // 에픽 생성
    const newEpic = await prisma.epic.create({
      data: {
        title,
        description,
        projectId,
        color: color || "#4F46E5" // 기본 색상 설정
      }
    });

    return NextResponse.json(newEpic);
  } catch (error) {
    console.error("에픽 생성 중 오류 발생:", error);
    return NextResponse.json({ error: "에픽 생성에 실패했습니다." }, { status: 500 });
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