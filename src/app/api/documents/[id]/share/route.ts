import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// 공유 링크 생성 또는 토글
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { enable } = body; // true: 공유 활성화, false: 공유 비활성화

    // 문서 조회
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // TODO: 프로젝트 멤버인지 확인 (현재는 스킵)
    // 실제 구현시 user 정보를 세션이나 토큰에서 가져와서 확인 필요

    let shareToken = document.shareToken;

    if (enable) {
      // 공유 활성화: 토큰이 없으면 생성
      if (!shareToken) {
        shareToken = crypto.randomBytes(32).toString('hex');
      }

      await prisma.document.update({
        where: { id },
        data: {
          shareToken,
          isShareEnabled: true,
        },
      });

      // 공유 링크 생성
      const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/documents/${id}?share=${shareToken}`;

      return NextResponse.json({
        success: true,
        shareUrl,
        shareToken,
        isShareEnabled: true,
      });
    } else {
      // 공유 비활성화
      await prisma.document.update({
        where: { id },
        data: {
          isShareEnabled: false,
        },
      });

      return NextResponse.json({
        success: true,
        isShareEnabled: false,
      });
    }
  } catch (error) {
    console.error('공유 설정 중 오류:', error);
    return NextResponse.json(
      { error: '공유 설정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 현재 공유 상태 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        shareToken: true,
        isShareEnabled: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    let shareUrl = null;
    if (document.isShareEnabled && document.shareToken) {
      shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/documents/${id}?share=${document.shareToken}`;
    }

    return NextResponse.json({
      isShareEnabled: document.isShareEnabled,
      shareUrl,
      shareToken: document.shareToken,
    });
  } catch (error) {
    console.error('공유 상태 조회 중 오류:', error);
    return NextResponse.json(
      { error: '공유 상태 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
