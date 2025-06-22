import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    // 폼데이터에서 이미지 추출
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });
    }

    // 이미지 유효성 검사
    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다.' }, { status: 400 });
    }

    // 고유한 파일명 생성
    const filename = `${uuidv4()}_${image.name}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');
    const filepath = path.join(uploadDir, filename);

    // 디렉토리 생성 (필요한 경우)
    await import('fs').then(fs => {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    });

    // 이미지 저장
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // 공개 URL 생성
    const imageUrl = `/uploads/images/${filename}`;

    return NextResponse.json({ 
      message: '이미지 업로드 성공', 
      imageUrl 
    });

  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    return NextResponse.json({ 
      error: '이미지 업로드 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 