import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('이미지 업로드 요청 시작');
    
    const data = await request.formData();
    console.log('FormData 파싱 완료');
    
    const file: File | null = data.get('file') as unknown as File;
    console.log('파일 정보:', file ? { 
      name: file.name, 
      type: file.type, 
      size: file.size 
    } : 'null');

    if (!file) {
      console.log('파일이 없음');
      return NextResponse.json({ error: '파일이 업로드되지 않았습니다.' }, { status: 400 });
    }

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      console.log('잘못된 파일 타입:', file.type);
      return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다.' }, { status: 400 });
    }

    // 파일 크기 검증 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      console.log('파일 크기 초과:', file.size);
      return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 400 });
    }

    console.log('파일 데이터 읽기 시작');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('파일 데이터 읽기 완료, 크기:', buffer.length);

    // 파일 확장자 추출
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${randomUUID()}.${fileExtension}`;
    console.log('생성된 파일명:', fileName);

    // 데이터베이스에 이미지 저장
    console.log('데이터베이스에 이미지 저장 시작');
    const savedImage = await prisma.image.create({
      data: {
        fileName: fileName,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        data: buffer,
      },
    });
    console.log('데이터베이스에 이미지 저장 완료, ID:', savedImage.id);

    // 이미지 URL 반환 (API 엔드포인트를 통해 이미지를 서빙)
    const imageUrl = `/api/documents/images/${savedImage.id}`;

    return NextResponse.json({ 
      success: true, 
      url: imageUrl,
      fileName: file.name,
      size: file.size,
      imageId: savedImage.id
    });

  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    console.error('오류 스택:', error instanceof Error ? error.stack : '스택 없음');
    return NextResponse.json({ 
      error: '이미지 업로드 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
} 