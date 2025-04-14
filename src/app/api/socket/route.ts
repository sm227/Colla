import { NextRequest } from 'next/server';
import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { PrismaClient } from '@prisma/client';

// Prisma 클라이언트 인스턴스
const prisma = new PrismaClient();

// Hocuspocus 서버 인스턴스 생성
const server = Server.configure({
  extensions: [
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

// 데이터베이스에 ycontent 컬럼이 없는 경우 추가
try {
  prisma.$executeRaw`
    ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "ycontent" BYTEA;
  `.then(() => console.log('ycontent 컬럼이 추가되었거나 이미 존재합니다.'));
} catch (error) {
  console.error('ycontent 컬럼 추가 중 오류:', error);
}

export async function GET(request: NextRequest) {
  try {
    // Next.js의 요청을 WebSocket 연결로 업그레이드
    const upgrade = request.headers.get('upgrade');
    if (upgrade?.toLowerCase() !== 'websocket') {
      return new Response('WebSocket 연결이 필요합니다', { status: 426 });
    }

    const { socket, response } = (Reflect.get(request, 'socket') as any)();
    
    // 헤더 정보 로깅 및 처리
    console.log('[WebSocket] 연결 시도:', request.url);

    // Hocuspocus 서버에서 웹소켓 요청 처리
    server.handleConnection(socket, request, response);

    return response;
  } catch (error) {
    console.error('[WebSocket] 오류:', error);
    return new Response('서버 오류', { status: 500 });
  }
}