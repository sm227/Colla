import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// API 라우트 설정 - 파일 업로드를 위한 크기 제한
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // 폼데이터에서 이미지 추출
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });
    }

    // 이미지 바이트 읽기
    const bytes = await image.arrayBuffer();
    const uint8Array = new Uint8Array(bytes);

    // 고유한 파일명 생성
    const ext = path.extname(image.name);
    const filename = `${uuidv4()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');
    const filepath = path.join(uploadDir, filename);

    // 디렉토리 생성 (필요한 경우)
    await fs.promises.mkdir(uploadDir, { recursive: true });

    // 파일 저장
    await writeFile(filepath, uint8Array);

    // 공개 URL 생성
    const imageUrl = `/uploads/images/${filename}`;

    return NextResponse.json({ imageUrl }, { status: 200 });
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    return NextResponse.json({ error: '이미지 업로드 실패' }, { status: 500 });
  }
} 