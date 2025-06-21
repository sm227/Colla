import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateTaskDescriptions() {
  try {
    // 모든 작업 조회
    const tasks = await prisma.task.findMany({
      where: {
        description: {
          not: null
        }
      }
    });

    console.log(`총 ${tasks.length}개의 작업 마이그레이션 시작`);

    // 각 작업의 description을 JSON 형식으로 변환
    for (const task of tasks) {
      if (typeof task.description === 'string') {
        const jsonDescription = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: task.description ? [{ type: 'text', text: task.description }] : []
            }
          ]
        };

        await prisma.task.update({
          where: { id: task.id },
          data: { description: jsonDescription }
        });

        console.log(`작업 ${task.id} 마이그레이션 완료`);
      }
    }

    console.log('모든 작업 마이그레이션 완료');
  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateTaskDescriptions(); 