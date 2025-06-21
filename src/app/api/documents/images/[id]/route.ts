import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const imageId = params.id;
    
    // 데이터베이스에서 이미지 조회
    const image = await prisma.image.findUnique({
      where: {
        id: imageId,
      },
    });

    if (!image) {
      return new NextResponse('이미지를 찾을 수 없습니다.', { status: 404 });
    }

    // 이미지 데이터를 Response로 반환
    return new NextResponse(image.data, {
      status: 200,
      headers: {
        'Content-Type': image.mimeType,
        'Content-Length': image.size.toString(),
        'Cache-Control': 'public, max-age=31536000', // 1년 캐시
      },
    });

  } catch (error) {
    console.error('이미지 조회 오류:', error);
    return new NextResponse('이미지 조회 중 오류가 발생했습니다.', { status: 500 });
  }
} 