import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    
    // 공공데이터포털 API 키 (환경변수에서 가져오기)
    const serviceKey = process.env.PUBLIC_DATA_API_KEY;
    
    if (!serviceKey) {
      return NextResponse.json(
        { error: '공공데이터포털 API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 공공데이터포털 공휴일 API 호출
    const apiUrl = `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo`;
    const params = new URLSearchParams({
      ServiceKey: serviceKey,
      solYear: year,
      numOfRows: '100',
      _type: 'json'
    });

    const response = await fetch(`${apiUrl}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답 구조 확인 및 에러 처리
    if (data.response?.header?.resultCode !== '00') {
      throw new Error(`API 에러: ${data.response?.header?.resultMsg || '알 수 없는 오류'}`);
    }

    // 공휴일 데이터 추출 및 포맷팅
    const holidays = [];
    const items = data.response?.body?.items;
    
    if (items) {
      // items가 배열인지 단일 객체인지 확인
      const itemArray = Array.isArray(items.item) ? items.item : [items.item];
      
      for (const item of itemArray) {
        if (item && item.locdate && item.dateName) {
          // 날짜 포맷팅 (YYYYMMDD -> YYYY-MM-DD)
          const dateStr = item.locdate.toString();
          const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
          
          holidays.push({
            id: `holiday-${item.locdate}`,
            title: item.dateName,
            description: `${item.dateName} (공휴일)`,
            date: formattedDate,
            locdate: item.locdate,
            isHoliday: true,
            isCalendarEvent: true,
            status: 'holiday',
            priority: 'medium'
          });
        }
      }
    }

    return NextResponse.json(holidays);
  } catch (error) {
    console.error('공휴일 API 호출 오류:', error);
    return NextResponse.json(
      { error: '공휴일 정보를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 