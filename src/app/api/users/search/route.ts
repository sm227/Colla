import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 사용자 검색 API (이름으로 검색)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json(
        { error: '검색어를 입력해주세요.' },
        { status: 400 }
      );
    }
    
    // 이름으로 사용자 검색 (대소문자 구분 없이)
    const users = await prisma.user.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive' // 대소문자 구분 없음
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      take: 10 // 최대 10명까지만 반환
    });
    
    // 정확히 이름이 일치하는 사용자를 먼저 정렬
    const sortedUsers = [...users].sort((a, b) => {
      const aExactMatch = a.name.toLowerCase() === name.toLowerCase();
      const bExactMatch = b.name.toLowerCase() === name.toLowerCase();
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      return 0;
    });
    
    return NextResponse.json(sortedUsers);
  } catch (error) {
    console.error('사용자 검색 오류:', error);
    return NextResponse.json(
      { error: '사용자 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 