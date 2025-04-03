import { Server } from '@hocuspocus/server';
import { Logger } from '@hocuspocus/extension-logger';
import { Database } from '@hocuspocus/extension-database';
import { PrismaClient } from '@prisma/client';

// Prisma 클라이언트 인스턴스
const prisma = new PrismaClient();

export type YDocData = {
  documentId: string;
  data: Uint8Array;
};

// Hocuspocus 서버 인스턴스 생성
export const server = Server.configure({
  port: 1234, // WebSocket 서버 포트
  extensions: [
    new Logger({
      onConnect: true, // 연결 이벤트 로깅 활성화
      onChange: true,  // 변경 이벤트 로깅 활성화
      onDisconnect: true // 연결 종료 이벤트 로깅 활성화
    }),
    new Database({
      // 문서 로드 함수 - Y.js 바이너리 데이터 로드
      async fetch(data: any) {
        const { documentName } = data;
        try {
          // Y.js 콘텐츠 존재 여부 확인
          const document = await prisma.$queryRaw`
            SELECT "id", "ycontent" FROM "Document" WHERE "id" = ${documentName};
          `;

          // 타입스크립트를 위한 구조
          const doc = document as any;
          
          if (!doc || !doc[0] || !doc[0].ycontent) {
            console.log(`[불러오기] 문서를 찾을 수 없거나 Y.js 내용이 없습니다: ${documentName}`);
            return null;
          }

          console.log(`[불러오기] 문서를 성공적으로 불러왔습니다: ${documentName}`);
          return doc[0].ycontent;
        } catch (error) {
          console.error(`[에러] 문서 불러오기 실패: ${documentName}`, error);
          return null;
        }
      },

      // 문서 저장 함수 - Y.js 바이너리 데이터 저장
      async store(data: any) {
        const { documentName, state } = data;
        try {
          // 직접 SQL 쿼리로 업데이트
          await prisma.$executeRaw`
            UPDATE "Document" 
            SET "ycontent" = ${Buffer.from(state)}
            WHERE "id" = ${documentName};
          `;
          
          console.log(`[저장] 문서가 성공적으로 저장되었습니다: ${documentName}`);
        } catch (error) {
          console.error(`[에러] 문서 저장 실패: ${documentName}`, error);
        }
      },
    }),
  ],
});

// 서버 시작 함수
export async function startHocuspocusServer() {
  try {
    // 데이터베이스에 ycontent 컬럼이 없는 경우 추가 (첫 실행 시)
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "ycontent" BYTEA;
      `;
      console.log('ycontent 컬럼이 추가되었거나 이미 존재합니다.');
    } catch (error) {
      console.error('ycontent 컬럼 추가 중 오류:', error);
    }
    
    await server.listen();
    console.log(`Hocuspocus 서버가 포트 ${server.configuration.port}에서 실행 중입니다.`);
  } catch (error) {
    console.error('Hocuspocus 서버 시작 중 오류가 발생했습니다:', error);
  }
}

// 프로덕션 환경에서 분리된 프로세스로 실행할 수 있도록 직접 실행 코드 추가
if (require.main === module) {
  startHocuspocusServer();
} 