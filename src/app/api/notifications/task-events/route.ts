import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from '../../../lib/prisma';

// 작업 이벤트 처리 API (작업 생성, 상태 변경 등)
export async function POST(req: NextRequest) {
  try {
    console.log("=== 작업 이벤트 처리 시작 ===");
    
    // 세션 확인 (향후 인증 시 주석 해제)
    // const session = await getServerSession(authOptions);
    // if (!session || !session.user) {
    //   return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    // }
    
    // 현재는 임시 세션 정보로 처리
    const session = { user: { id: "temp-user-id" } };
    
    // 이벤트 데이터 파싱
    const eventData = await req.json();
    console.log("받은 이벤트 데이터:", eventData);
    
    const { 
      eventType, 
      taskId, 
      projectId, 
      newStatus, 
      assigneeChanged, 
      previousAssignee, 
      newAssignee 
    } = eventData;
    
    if (!eventType || !taskId) {
      console.log("필수 필드 누락:", { eventType, taskId });
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다" }, 
        { status: 400 }
      );
    }
    
    // 관련 작업 정보 조회
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!task) {
      console.log("작업을 찾을 수 없음:", taskId);
      return NextResponse.json(
        { error: "작업을 찾을 수 없습니다" }, 
        { status: 404 }
      );
    }
    
    console.log("작업 정보:", { taskId: task.id, title: task.title, projectId: task.projectId });
    
    // 담당자 정보 조회 (이름 가져오기)
    let previousAssigneeName = null;
    let newAssigneeName = null;
    
    if (assigneeChanged) {
      console.log("담당자 변경 감지:", { previousAssignee, newAssignee });
      
      if (previousAssignee) {
        const prevUser = await prisma.user.findUnique({
          where: { id: previousAssignee },
          select: { name: true }
        });
        previousAssigneeName = prevUser?.name || "알 수 없는 사용자";
      }
      
      if (newAssignee) {
        const newUser = await prisma.user.findUnique({
          where: { id: newAssignee },
          select: { name: true }
        });
        newAssigneeName = newUser?.name || "알 수 없는 사용자";
      }
      
      console.log("담당자 이름:", { previousAssigneeName, newAssigneeName });
    }
    
    // 작업 생성 시 담당자도 설정된 경우 - 두 개의 개별 이벤트 생성
    if (eventType === 'task_created' && newAssignee) {
      console.log("작업 생성 + 담당자 설정 → 2개의 개별 이벤트 생성");
      
      // 1. 작업 생성 이벤트
      const taskCreatedEvent = await prisma.taskEvent.create({
        data: {
          eventType: "task_created",
          taskId,
          projectId: task.projectId || undefined,
          userId: session.user.id,
          previousAssignee: null,
          newAssignee: null,
          previousStatus: null,
          newStatus: newStatus || null,
          description: "작업이 생성되었습니다"
        }
      });
      
      console.log(`✅ 작업 생성 이벤트 저장: ${taskCreatedEvent.id}`);
      
      // 2. 담당자 설정 이벤트 (약간의 지연 후 생성)
      await new Promise(resolve => setTimeout(resolve, 100)); // 0.1초 지연
      
      const assigneeSetEvent = await prisma.taskEvent.create({
        data: {
          eventType: "assignee_changed",
          taskId,
          projectId: task.projectId || undefined,
          userId: session.user.id,
          previousAssignee: null,
          newAssignee,
          previousStatus: null,
          newStatus: newStatus || null,
          description: `담당자가 ${newAssigneeName}으로 설정되었습니다`
        }
      });
      
      console.log(`✅ 담당자 설정 이벤트 저장: ${assigneeSetEvent.id}`);
      
      return NextResponse.json({ 
        success: true,
        eventIds: [taskCreatedEvent.id, assigneeSetEvent.id]
      });
    }
    
    // 담당자 변경만 있는 경우
    else if (assigneeChanged) {
      let eventDescription = "";
      
      if (!previousAssignee && newAssignee) {
        eventDescription = `담당자가 ${newAssigneeName}으로 설정되었습니다`;
      } else if (previousAssignee && !newAssignee) {
        eventDescription = `담당자 ${previousAssigneeName}이 해제되었습니다`;
      } else if (previousAssignee && newAssignee) {
        eventDescription = `담당자가 ${previousAssigneeName}에서 ${newAssigneeName}으로 변경되었습니다`;
      }
      
      const taskEvent = await prisma.taskEvent.create({
        data: {
          eventType: "assignee_changed",
          taskId,
          projectId: task.projectId || undefined,
          userId: session.user.id,
          previousAssignee,
          newAssignee,
          previousStatus: null,
          newStatus: newStatus || null,
          description: eventDescription
        }
      });
      
      console.log(`✅ 담당자 변경 이벤트 저장: ${taskEvent.id}`, { eventDescription });
      
      return NextResponse.json({ 
        success: true,
        eventId: taskEvent.id
      });
    }
    
    // 일반 작업 생성 또는 업데이트
    else {
      const eventDescription = `작업이 ${eventType === 'task_created' ? '생성' : '업데이트'}되었습니다`;
      
      const taskEvent = await prisma.taskEvent.create({
        data: {
          eventType,
          taskId,
          projectId: task.projectId || undefined,
          userId: session.user.id,
          previousAssignee,
          newAssignee,
          previousStatus: null,
          newStatus: newStatus || null,
          description: eventDescription
        }
      });
      
      console.log(`✅ 작업 이벤트 저장: ${taskEvent.id}`, { eventType, eventDescription });
      
      return NextResponse.json({ 
        success: true,
        eventId: taskEvent.id
      });
    }
    
  } catch (error) {
    console.error("작업 이벤트 처리 중 오류 발생:", error);
    return NextResponse.json(
      { error: "작업 이벤트 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
} 