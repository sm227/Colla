import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripHtmlTags } from '@/lib/utils';

const prisma = new PrismaClient();

// 작업 목록 조회 (GET)
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
    const epicId = url.searchParams.get("epicId");
    
    // 필터링 조건 구성
    const where: any = {};
    if (projectId) {
      where.projectId = projectId;
    }
    
    if (epicId) {
      where.epicId = epicId;
    }
    
    // 모든 작업 조회 (개발 편의를 위해 사용자 체크 없이)
    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("작업 조회 중 오류 발생:", error);
    return NextResponse.json({ error: "작업 조회에 실패했습니다." }, { status: 500 });
  }
}

// 작업 생성 (POST)
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
    const { title, description, status, priority, epicId, projectId, assignee, startDate, endDate, dueDate } = body;

    if (!title || !status) {
      return NextResponse.json({ error: "제목과 상태는 필수 항목입니다." }, { status: 400 });
    }

    // 날짜 처리
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;
    const parsedDueDate = dueDate ? new Date(dueDate) : undefined;

    // 작업 생성
    const newTask = await prisma.task.create({
      data: {
        title,
        description,
        status,
        priority: priority || "medium",
        epicId,
        projectId,
        assignee,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        dueDate: parsedDueDate
      }
    });

    return NextResponse.json(newTask);
  } catch (error) {
    console.error("작업 생성 중 오류 발생:", error);
    return NextResponse.json({ error: "작업 생성에 실패했습니다." }, { status: 500 });
  }
}

// 작업 수정 (PUT)
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
    const { id, title, description, status, priority, assignee, projectId, epicId, dueDate, startDate, endDate } = body;

    if (!id) {
      return NextResponse.json({ error: "작업 ID가 필요합니다." }, { status: 400 });
    }

    // 작업 업데이트
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        status,
        priority,
        assignee,
        projectId,
        epicId,
        dueDate: dueDate ? new Date(dueDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("작업 업데이트 중 오류 발생:", error);
    return NextResponse.json({ error: "작업 업데이트에 실패했습니다." }, { status: 500 });
  }
}

// 작업 삭제 (DELETE)
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
      return NextResponse.json({ error: "작업 ID가 필요합니다." }, { status: 400 });
    }

    // 작업 삭제 (연결된 댓글도 CASCADE로 삭제됨)
    await prisma.task.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("작업 삭제 중 오류 발생:", error);
    return NextResponse.json({ error: "작업 삭제에 실패했습니다." }, { status: 500 });
  }
} 