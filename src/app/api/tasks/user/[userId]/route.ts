import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

// 현재 로그인한 사용자 정보 가져오기
async function getCurrentUser(request: NextRequest) {
  // 쿠키에서 토큰 가져오기
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;
  
  // 쿠키에 토큰이 없으면 헤더에서 확인
  const authHeader = request.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : null;
    
  // 둘 중 하나의 토큰 사용
  const finalToken = token || headerToken;

  if (!finalToken) {
    return null;
  }

  try {
    const JWT_SECRET = new TextEncoder().encode(
      process.env.JWT_SECRET || "your-secret-key"
    );
    const { payload } = await jwtVerify(finalToken, JWT_SECRET);
    return payload.user as { id: string; name: string; email: string };
  } catch (error) {
    console.error("토큰 검증 오류:", error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 현재 사용자 확인 (request 전달)
    const currentUser = await getCurrentUser(request);
    
    // 개발 목적으로 인증 체크 비활성화 (운영 환경에서는 다시 활성화 필요)
    // if (!currentUser) {
    //   return NextResponse.json(
    //     { error: "인증되지 않은 사용자입니다." },
    //     { status: 401 }
    //   );
    // }
    
    // URL에서 userId 가져오기
    const { userId } = params;
    
    // URL 쿼리 파라미터에서 projectId 가져오기 (있는 경우)
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    
    console.log(`사용자 ${userId}의 작업을 조회합니다. 프로젝트 ID: ${projectId || '전체'}`);
    console.log(`인증 상태: ${currentUser ? '인증됨' : '인증되지 않음'} (인증 체크 비활성화됨)`);
    
    // 사용자에게 할당된 작업 가져오기 (프로젝트 ID로 필터링)
    const whereClause: any = {
      assignee: userId,
    };
    
    // projectId가 있는 경우 조건에 추가
    if (projectId) {
      whereClause.projectId = projectId;
    }
    
    // 사용자에게 할당된 작업 가져오기
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 3, // 최근 댓글 3개만 가져오기
        },
      },
      orderBy: {
        updatedAt: "desc", // 최신 업데이트 순으로 정렬
      },
    });
    
    console.log(`총 ${tasks.length}개의 작업을 찾았습니다.`);
    
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("사용자별 작업 조회 오류:", error);
    return NextResponse.json(
      { error: "작업을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 