const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');
const { validateTaskData, parseDate } = require('../utils/validation');

// 모든 라우트에 인증 미들웨어 적용
router.use(authMiddleware);

// Epic 목록 조회 (GET /api/epics)
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;

    // 필터링 조건 구성 - projectId는 선택적
    const where = {};
    if (projectId) {
      where.projectId = projectId;
    }

    // Epic과 포함된 Tasks 모두 조회
    const epics = await prisma.epic.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        tasks: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json(epics);
  } catch (error) {
    console.error("Epic 조회 중 오류 발생:", error);
    res.status(500).json({ error: "Epic 조회에 실패했습니다." });
  }
});

// Epic 생성 (POST /api/epics)
router.post('/', async (req, res) => {
  try {
    const { title, description, startDate, endDate, projectId, color } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ error: "제목과 프로젝트 ID는 필수 항목입니다." });
    }

    // 날짜 처리
    const parsedStartDate = parseDate(startDate);
    const parsedEndDate = parseDate(endDate);

    // Epic 생성
    const newEpic = await prisma.epic.create({
      data: {
        title,
        description,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        projectId,
        color: color || '#4F46E5'
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        tasks: true
      }
    });

    res.status(201).json(newEpic);
  } catch (error) {
    console.error("Epic 생성 중 오류 발생:", error);
    res.status(500).json({ error: "Epic 생성에 실패했습니다." });
  }
});

// 개별 Epic 조회 (GET /api/epics/:id)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const epic = await prisma.epic.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        tasks: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!epic) {
      return res.status(404).json({ error: "Epic을 찾을 수 없습니다." });
    }

    res.json(epic);
  } catch (error) {
    console.error("Epic 조회 중 오류 발생:", error);
    res.status(500).json({ error: "Epic 조회에 실패했습니다." });
  }
});

// Epic 전체 업데이트 (PUT /api/epics/:id)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, color, projectId, startDate, endDate } = req.body;

    if (!title) {
      return res.status(400).json({ error: "제목은 필수 항목입니다." });
    }

    // 날짜 처리
    const parsedStartDate = parseDate(startDate);
    const parsedEndDate = parseDate(endDate);

    // Epic 업데이트
    const updatedEpic = await prisma.epic.update({
      where: { id },
      data: {
        title,
        description,
        color,
        projectId,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        updatedAt: new Date()
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        tasks: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    res.json(updatedEpic);
  } catch (error) {
    console.error("Epic 업데이트 중 오류 발생:", error);
    res.status(500).json({ error: "Epic 업데이트에 실패했습니다." });
  }
});

// Epic 부분 업데이트 (PATCH /api/epics/:id)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: "제목은 필수 항목입니다." });
    }

    // Epic 부분 업데이트 (제목만)
    const updatedEpic = await prisma.epic.update({
      where: { id },
      data: {
        title,
        updatedAt: new Date()
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        tasks: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    res.json(updatedEpic);
  } catch (error) {
    console.error("Epic 부분 업데이트 중 오류 발생:", error);
    res.status(500).json({ error: "Epic 부분 업데이트에 실패했습니다." });
  }
});

// Epic 삭제 (DELETE /api/epics/:id)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Epic 삭제 전 연결된 작업들의 epicId를 null로 설정
    await prisma.task.updateMany({
      where: {
        epicId: id
      },
      data: {
        epicId: null
      }
    });

    // Epic 삭제
    await prisma.epic.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Epic 삭제 중 오류 발생:", error);
    res.status(500).json({ error: "Epic 삭제에 실패했습니다." });
  }
});

module.exports = router;