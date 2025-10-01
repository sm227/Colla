const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

// 인증 미들웨어 적용 (선택적으로 주석 처리 가능)
// router.use(authMiddleware);

/**
 * 모든 회의 목록 조회
 * GET /api/meetings
 */
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;

    const where = {};
    if (projectId) {
      where.projectId = projectId;
    }

    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: {
        startTime: 'desc'
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: meetings
    });
  } catch (error) {
    console.error('회의 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '회의 목록을 불러오는데 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * 특정 회의 상세 조회
 * GET /api/meetings/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const meeting = await prisma.meeting.findUnique({
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

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: '회의를 찾을 수 없습니다.'
      });
    }

    return res.status(200).json({
      success: true,
      data: meeting
    });
  } catch (error) {
    console.error('회의 상세 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '회의 상세 정보를 불러오는데 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * 새 회의 생성/저장
 * POST /api/meetings
 */
router.post('/', async (req, res) => {
  try {
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
    } = req.body;

    // 필수 필드 검증
    if (!title) {
      return res.status(400).json({
        success: false,
        message: '회의 제목은 필수입니다.'
      });
    }

    const meeting = await prisma.meeting.create({
      data: {
        title,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : null,
        transcript,
        mainPoints,
        decisions,
        actionItems,
        participants, // JSON 형태로 저장
        projectId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: '회의가 성공적으로 저장되었습니다.',
      data: meeting
    });
  } catch (error) {
    console.error('회의 저장 오류:', error);
    return res.status(500).json({
      success: false,
      message: '회의 저장에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * 회의 정보 업데이트
 * PUT /api/meetings/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      endTime,
      transcript,
      mainPoints,
      decisions,
      actionItems,
      participants
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null;
    if (transcript !== undefined) updateData.transcript = transcript;
    if (mainPoints !== undefined) updateData.mainPoints = mainPoints;
    if (decisions !== undefined) updateData.decisions = decisions;
    if (actionItems !== undefined) updateData.actionItems = actionItems;
    if (participants !== undefined) updateData.participants = participants;

    const meeting = await prisma.meeting.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: '회의 정보가 업데이트되었습니다.',
      data: meeting
    });
  } catch (error) {
    console.error('회의 업데이트 오류:', error);
    return res.status(500).json({
      success: false,
      message: '회의 업데이트에 실패했습니다.',
      error: error.message
    });
  }
});

/**
 * 회의 삭제
 * DELETE /api/meetings/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.meeting.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: '회의가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('회의 삭제 오류:', error);
    return res.status(500).json({
      success: false,
      message: '회의 삭제에 실패했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
