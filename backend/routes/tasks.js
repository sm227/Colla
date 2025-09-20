const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');
const { stripHtmlTags, validateTaskData, parseDate } = require('../utils/validation');

// 모든 라우트에 인증 미들웨어 적용
router.use(authMiddleware);

// 작업 목록 조회 (GET /api/tasks)
router.get('/', async (req, res) => {
  try {
    const { projectId, epicId, noCalendarEvents, hasDueDate } = req.query;

    // 필터링 조건 구성
    const where = {};
    if (projectId) {
      where.projectId = projectId;
    }

    if (epicId) {
      where.epicId = epicId;
    }

    // noCalendarEvents가 true인 경우: dueDate가 null인 태스크만
    if (noCalendarEvents === 'true') {
      where.dueDate = null;
    }

    // hasDueDate가 true인 경우: dueDate가 있는 태스크만
    if (hasDueDate === 'true') {
      where.dueDate = {
        not: null
      };
    }

    // 모든 작업 조회
    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            name: true
          }
        },
        epic: {
          select: {
            id: true,
            title: true,
            color: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(tasks);
  } catch (error) {
    console.error("작업 조회 중 오류 발생:", error);
    res.status(500).json({ error: "작업 조회에 실패했습니다." });
  }
});

// 작업 생성 (POST /api/tasks)
router.post('/', async (req, res) => {
  try {
    const { title, description, status, priority, epicId, projectId, assignee, startDate, endDate, dueDate } = req.body;

    // 데이터 검증
    const validation = validateTaskData({ title, status });
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    // 날짜 처리
    const parsedStartDate = parseDate(startDate);
    const parsedEndDate = parseDate(endDate);
    const parsedDueDate = parseDate(dueDate);

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

    // 작업 생성 알림 이벤트 발생 (담당자 정보 포함)
    try {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/notifications/task-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'task_created',
          taskId: newTask.id,
          projectId: newTask.projectId,
          newAssignee: assignee,
        }),
      });
    } catch (notificationError) {
      console.error('작업 생성 알림 발생 중 오류:', notificationError);
    }

    res.json(newTask);
  } catch (error) {
    console.error("작업 생성 중 오류 발생:", error);
    res.status(500).json({ error: "작업 생성에 실패했습니다." });
  }
});

// 개별 작업 조회 (GET /api/tasks/:id)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            name: true
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: "작업을 찾을 수 없습니다." });
    }

    res.json(task);
  } catch (error) {
    console.error("작업 조회 중 오류 발생:", error);
    res.status(500).json({ error: "작업 조회에 실패했습니다." });
  }
});

// 개별 작업 업데이트 (PUT /api/tasks/:id)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔍 PUT 요청 받음 - ID:", id);

    const { title, description, status, priority, assignee, projectId, epicId, dueDate, startDate, endDate } = req.body;
    console.log("🔍 요청 본문:", JSON.stringify(req.body, null, 2));

    // 변경 전 작업 정보 조회 (담당자 변경 추적용)
    const previousTask = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!previousTask) {
      return res.status(404).json({ error: "작업을 찾을 수 없습니다." });
    }

    // description 처리: 문자열이면 JSON 형식으로 변환
    let processedDescription = description;
    if (typeof description === 'string') {
      processedDescription = {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: description }]
        }]
      };
    }

    // 작업 업데이트
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: processedDescription }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(assignee !== undefined && { assignee }),
        ...(projectId !== undefined && { projectId }),
        ...(epicId !== undefined && { epicId }),
        ...(dueDate !== undefined && { dueDate: parseDate(dueDate) }),
        ...(startDate !== undefined && { startDate: parseDate(startDate) }),
        ...(endDate !== undefined && { endDate: parseDate(endDate) }),
        updatedAt: new Date()
      }
    });

    console.log("✅ 작업 업데이트 성공:", updatedTask.id);

    // 담당자 변경 여부 확인
    const assigneeChanged = previousTask.assignee !== assignee;

    // 작업 업데이트 알림 이벤트 발생
    try {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/notifications/task-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'task_updated',
          taskId: updatedTask.id,
          projectId: updatedTask.projectId,
          newStatus: status,
          assigneeChanged,
          previousAssignee: previousTask.assignee,
          newAssignee: assignee,
        }),
      });
    } catch (notificationError) {
      console.error('작업 업데이트 알림 발생 중 오류:', notificationError);
    }

    res.json(updatedTask);
  } catch (error) {
    console.error("❌ PUT 에러 상세:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause
    });

    res.status(500).json({
      error: "작업 업데이트에 실패했습니다.",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// 개별 작업 상태 업데이트 (PATCH /api/tasks/:id)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔍 PATCH 요청 받음 - ID:", id);

    const { status } = req.body;
    console.log("🔍 PATCH 요청 본문:", JSON.stringify(req.body, null, 2));

    if (!status) {
      return res.status(400).json({ error: "상태 정보가 필요합니다." });
    }

    // 작업 상태 업데이트
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date()
      }
    });

    console.log("✅ 작업 상태 업데이트 성공:", updatedTask.id, "->", status);

    res.json(updatedTask);
  } catch (error) {
    console.error("❌ PATCH 에러 상세:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });

    res.status(500).json({
      error: "작업 상태 업데이트에 실패했습니다.",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// 개별 작업 삭제 (DELETE /api/tasks/:id)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 작업 삭제 (연결된 댓글도 CASCADE로 삭제됨)
    await prisma.task.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("작업 삭제 중 오류 발생:", error);
    res.status(500).json({ error: "작업 삭제에 실패했습니다." });
  }
});

module.exports = router;