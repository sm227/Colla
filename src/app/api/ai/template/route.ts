import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const { templateType, participants } = await request.json();

    // 템플릿 타입 검증
    if (!templateType) {
      return NextResponse.json({ error: "템플릿 타입이 필요합니다." }, { status: 400 });
    }

    // 템플릿 내용 생성 (각 템플릿 타입에 맞는 내용)
    let content = "";
    switch (templateType) {
      case "meeting":
        content = `
        <p style="color: #37352f; margin-bottom: 1em; padding-bottom: 0.5em; border-bottom: 1px solid #e9e9e9;">📅 <strong>날짜:</strong> ${new Date().toLocaleDateString()}</p>
        <p style="color: #37352f; margin-bottom: 1.5em;">👥 <strong>참석자:</strong> ${participants || '참석자를 입력하세요'}</p>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">📋 회의 안건</h2>
        <ul style="padding-left: 1.5em; margin-bottom: 1.5em;">
          <li style="margin-bottom: 0.5em;">안건 1</li>
          <li style="margin-bottom: 0.5em;">안건 2</li>
        </ul>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">💬 논의 내용</h2>
        <p style="color: #37352f; margin-bottom: 1.5em; padding: 0.75em; background-color: #f7f6f3; border-radius: 4px;">회의에서 논의된 주요 내용을 기록하세요.</p>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">✅ 결정 사항</h2>
        <ul class="task-list" style="padding-left: 1.5em; margin-bottom: 1.5em;">
          <li data-type="taskItem" data-checked="false" style="margin-bottom: 0.5em;">할 일 1</li>
          <li data-type="taskItem" data-checked="false" style="margin-bottom: 0.5em;">할 일 2</li>
        </ul>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">📆 다음 회의</h2>
        <p style="color: #37352f; padding: 0.75em; background-color: #f7f6f3; border-radius: 4px; border-left: 3px solid #2382de;">다음 회의 일정 및 준비사항</p>`;
        break;
      case "weekly":
        content = `
        <p style="color: #37352f; margin-bottom: 1em; padding-bottom: 0.5em; border-bottom: 1px solid #e9e9e9;">📆 <strong>기간:</strong> ${new Date().toLocaleDateString()} ~ ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">🏆 주요 성과</h2>
        <ul style="padding-left: 1.5em; margin-bottom: 1.5em;">
          <li style="margin-bottom: 0.5em;">성과 1</li>
          <li style="margin-bottom: 0.5em;">성과 2</li>
        </ul>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">⏳ 진행 중인 작업</h2>
        <ul class="task-list" style="padding-left: 1.5em; margin-bottom: 1.5em;">
          <li data-type="taskItem" data-checked="true" style="margin-bottom: 0.5em; text-decoration: line-through; color: #989898;">완료된 작업</li>
          <li data-type="taskItem" data-checked="false" style="margin-bottom: 0.5em;">진행 중인 작업</li>
        </ul>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">⚠️ 이슈 및 해결방안</h2>
        <p style="color: #37352f; margin-bottom: 1.5em; padding: 0.75em; background-color: #fff3e0; border-radius: 4px; border-left: 3px solid #ffab40;">발생한 이슈와 해결책을 기록하세요.</p>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">📌 다음 주 계획</h2>
        <ul style="padding-left: 1.5em; margin-bottom: 1.5em;">
          <li style="margin-bottom: 0.5em;">계획 1</li>
          <li style="margin-bottom: 0.5em;">계획 2</li>
        </ul>`;
        break;
      case "project":
        content = `
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 0.5em; margin-bottom: 0.75em; padding-bottom: 0.5em; border-bottom: 1px solid #e9e9e9;">📝 프로젝트 개요</h2>
        <p style="color: #37352f; margin-bottom: 1.5em; padding: 0.75em; background-color: #f7f6f3; border-radius: 4px;">이 프로젝트의 목적과 배경을 설명합니다.</p>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">🎯 목표</h2>
        <ul style="padding-left: 1.5em; margin-bottom: 1.5em;">
          <li style="margin-bottom: 0.5em;">목표 1</li>
          <li style="margin-bottom: 0.5em;">목표 2</li>
        </ul>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">⏱️ 일정</h2>
        <div style="padding: 1em; background-color: #f7f6f3; border-radius: 4px; margin-bottom: 1.5em;">
          <p style="margin-bottom: 0.5em; font-weight: 600;">1단계: 기획 및 요구사항 분석</p>
          <p style="margin-bottom: 0.5em; font-weight: 600;">2단계: 설계 및 개발</p>
          <p style="margin-bottom: 0.5em; font-weight: 600;">3단계: 테스트 및 배포</p>
        </div>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">👤 담당자 및 역할</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5em;">
          <tr style="background-color: #f7f6f3;">
            <th style="padding: 0.5em; text-align: left; border: 1px solid #e9e9e9;">담당자</th>
            <th style="padding: 0.5em; text-align: left; border: 1px solid #e9e9e9;">역할</th>
          </tr>
          <tr>
            <td style="padding: 0.5em; border: 1px solid #e9e9e9;">담당자 1</td>
            <td style="padding: 0.5em; border: 1px solid #e9e9e9;">역할 설명</td>
          </tr>
          <tr>
            <td style="padding: 0.5em; border: 1px solid #e9e9e9;">담당자 2</td>
            <td style="padding: 0.5em; border: 1px solid #e9e9e9;">역할 설명</td>
          </tr>
        </table>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">💰 예산</h2>
        <p style="color: #37352f; padding: 0.75em; background-color: #f0f7ff; border-radius: 4px; border-left: 3px solid #3291ff;">예산 관련 정보를 작성하세요.</p>`;
        break;
      case "research":
        content = `
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 0.5em; margin-bottom: 0.75em; padding-bottom: 0.5em; border-bottom: 1px solid #e9e9e9;">🔍 연구 목적</h2>
        <p style="color: #37352f; margin-bottom: 1.5em; padding: 0.75em; background-color: #f7f6f3; border-radius: 4px;">이 연구의 목적과 배경을 설명합니다.</p>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">📊 연구 방법</h2>
        <ul style="padding-left: 1.5em; margin-bottom: 1.5em;">
          <li style="margin-bottom: 0.5em;">방법 1</li>
          <li style="margin-bottom: 0.5em;">방법 2</li>
        </ul>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">📁 자료 수집</h2>
        <p style="color: #37352f; margin-bottom: 1.5em;">수집한 자료와 출처를 기록하세요.</p>
        <div style="padding: 1em; background-color: #f7f6f3; border-radius: 4px; margin-bottom: 1.5em;">
          <p style="margin-bottom: 0.5em; color: #6b6b6b;"><em>여기에 주요 자료 목록과 출처를 작성하세요</em></p>
        </div>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">📈 분석 결과</h2>
        <p style="color: #37352f; margin-bottom: 1.5em; padding: 0.75em; background-color: #f0f7ff; border-radius: 4px;">분석한 결과를 작성하세요.</p>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">📝 결론</h2>
        <p style="color: #37352f; padding: 0.75em; background-color: #f7f6f3; border-radius: 4px; border-left: 3px solid #4caf50; margin-bottom: 1.5em;">연구를 통해 얻은 결론을 정리하세요.</p>
        
        <h2 style="font-size: 1.5em; font-weight: 600; color: #37352f; margin-top: 1.5em; margin-bottom: 0.75em;">📚 참고 문헌</h2>
        <ol style="padding-left: 1.5em; margin-bottom: 1.5em;">
          <li style="margin-bottom: 0.5em;">참고자료 1</li>
          <li style="margin-bottom: 0.5em;">참고자료 2</li>
        </ol>`;
        break;
      default:
        content = `<p style="color: #37352f; font-size: 1.1em; line-height: 1.5;">내용을 입력하세요.</p>`;
    }

    // 응답 반환
    return NextResponse.json({ content });
  } catch (error) {
    console.error("템플릿 생성 중 오류:", error);
    return NextResponse.json(
      { error: "템플릿을 생성하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 