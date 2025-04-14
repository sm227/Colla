import { NextRequest, NextResponse } from 'next/server';

// Set API timeout to 30 seconds
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Remove edge runtime directive as it might be causing issues
// export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages are required and must be an array' },
        { status: 400 }
      );
    }

    // Make sure we have the API key
    const apiKey = process.env.CLAUDE_AI_KEY;
    if (!apiKey) {
      console.error('Missing Claude API key');
      return NextResponse.json(
        { error: 'API key configuration error' },
        { status: 500 }
      );
    }

    // Check if this is a document summarization request
    const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
    const isSummarizeRequest = lastUserMessage && 
      (lastUserMessage.content === "요약해줘" || lastUserMessage.content.includes("문서를 요약해주세요"));

    // 사용자가 "요약해줘"만 보냈을 때 이전 메시지에 코드가 있는지 확인
    let hasPreviousContent = false;
    let previousUserContent = '';
    if (lastUserMessage && lastUserMessage.content === "요약해줘") {
      // 이전 메시지 확인
      const previousMessages = messages.filter(msg => msg.role === 'user' && msg !== lastUserMessage);
      hasPreviousContent = previousMessages.length > 0;
      
      // 이전 메시지의 내용 저장 (처리를 위해)
      if (previousMessages.length > 0) {
        previousUserContent = previousMessages[previousMessages.length - 1].content;
      }
    }

    // Check for project-related context
    const isProjectQuery = lastUserMessage && 
      (lastUserMessage.content.includes("프로젝트") || 
       lastUserMessage.content.includes("태스크") || 
       lastUserMessage.content.includes("문서") ||
       lastUserMessage.content.includes("task") ||
       lastUserMessage.content.includes("document"));

    // 일정 관련 질문인지 체크 (이미 클라이언트에서 처리됨)
    const isTaskRelatedQuery = lastUserMessage && (
      lastUserMessage.content.includes('새로 추가된 일정') || 
      lastUserMessage.content.includes('새 일정') || 
      lastUserMessage.content.includes('새로운 일정') ||
      lastUserMessage.content.includes('최근 일정') ||
      lastUserMessage.content.includes('최근 추가된 일정') ||
      lastUserMessage.content.includes('새로 생긴 일정') ||
      lastUserMessage.content.includes('일정 있어') ||
      lastUserMessage.content.includes('일정 있나') ||
      lastUserMessage.content.includes('일정 추가됐어') ||
      lastUserMessage.content.includes('일정 생겼어') ||
      lastUserMessage.content.includes('일정 알려') ||
      lastUserMessage.content.includes('일정 좀') ||
      lastUserMessage.content.includes('일정 보여') ||
      lastUserMessage.content.includes('일정 확인') ||
      lastUserMessage.content.includes('현재 일정') ||
      lastUserMessage.content.includes('칸반') ||
      lastUserMessage.content.includes('칸반보드') ||
      lastUserMessage.content.includes('kanban') ||
      lastUserMessage.content.includes('할 일') ||
      lastUserMessage.content.includes('할일') ||
      lastUserMessage.content.includes('투두') ||
      // 추가 질문 패턴
      lastUserMessage.content.includes('일정표') ||
      lastUserMessage.content.includes('업무 목록') ||
      lastUserMessage.content.includes('작업 목록') ||
      lastUserMessage.content.includes('오늘 해야 할') ||
      lastUserMessage.content.includes('오늘 일정') ||
      lastUserMessage.content.includes('이번 주 일정') ||
      lastUserMessage.content.includes('이번주 일정') ||
      lastUserMessage.content.includes('이번 달 일정') ||
      lastUserMessage.content.includes('이번달 일정') ||
      lastUserMessage.content.includes('다음 일정') ||
      lastUserMessage.content.includes('다가오는 일정') ||
      lastUserMessage.content.includes('업무 현황') ||
      lastUserMessage.content.includes('작업 현황') ||
      lastUserMessage.content.includes('일정 순서') ||
      lastUserMessage.content.includes('일정 진행상황') ||
      lastUserMessage.content.includes('작업 진행상황') ||
      lastUserMessage.content.includes('칸반 상태') ||
      lastUserMessage.content.includes('보드 현황') ||
      lastUserMessage.content.includes('일정 관리') ||
      lastUserMessage.content.includes('스케줄') ||
      lastUserMessage.content.includes('진행 중인 작업')
    );

    // 마감일 관련 질문 패턴 (클라이언트에서 처리)
    const isDueDateQuery = lastUserMessage && (
      lastUserMessage.content.includes('마감일') || 
      lastUserMessage.content.includes('기한') || 
      lastUserMessage.content.includes('데드라인') ||
      lastUserMessage.content.includes('언제까지') ||
      lastUserMessage.content.includes('일정 마감') ||
      lastUserMessage.content.includes('마감 날짜') ||
      // 추가 질문 패턴
      lastUserMessage.content.includes('기간') ||
      lastUserMessage.content.includes('마감 시간') ||
      lastUserMessage.content.includes('종료일') ||
      lastUserMessage.content.includes('끝나는 날짜') ||
      lastUserMessage.content.includes('일정 끝') ||
      lastUserMessage.content.includes('마감 예정') ||
      lastUserMessage.content.includes('남은 시간') ||
      lastUserMessage.content.includes('얼마나 남았') ||
      lastUserMessage.content.includes('지난 마감일') ||
      lastUserMessage.content.includes('다음 마감일') ||
      lastUserMessage.content.includes('기한이 가까운') ||
      lastUserMessage.content.includes('곧 마감되는')
    );

    // 특정 일정명 검색 질문 패턴 (클라이언트에서 처리)
    const specificTaskKeywords = [
      '회의', '미팅', '프로젝트', '팀', '주간', '월간', '디자인',
      // 추가 키워드
      '발표', '세미나', '워크샵', '브리핑', '리뷰', '피드백',
      '계획', '스프린트', '출시', '개발', '테스트', '교육', '훈련',
      '보고서', '문서', '분석', '연구', '조사', '인터뷰', '평가',
      '일일', '격주', '분기', '연간'
    ];
    const isSpecificTaskQuery = lastUserMessage && 
      specificTaskKeywords.some(keyword => lastUserMessage.content.includes(keyword));

    // 상태별 일정 검색 패턴 (클라이언트에서 처리)
    const statusKeywords = [
      '할 일', '예정', '대기', '진행', '진행중', '작업중', '검토', '리뷰', '완료', '끝', '종료', '마침',
      // 추가 키워드
      '시작 전', '시작전', '시작안한', '시작 안 한', '준비 중', '준비중',
      '처리중', '작업 중', '진행 중', '개발중', '개발 중', '테스트중', '테스트 중',
      '검토중', '검토 중', '승인 대기', '승인대기', '검증 중', '검증중',
      '완료된', '종료된', '끝난', '마친', '처리완료', '처리 완료',
      '보류', '보류중', '보류 중', '일시중지', '일시 중지', '중단된',
      '긴급', '우선', '중요'
    ];
    const isStatusQuery = lastUserMessage && 
      statusKeywords.some(keyword => lastUserMessage.content.includes(keyword));

    // 담당자 관련 질문 패턴 (클라이언트에서 처리)
    const assigneeKeywords = [
      '담당자', '담당', '맡은 사람', '책임자', '누가 맡', '누구 담당', '누가 담당',
      // 추가 키워드
      '담당하는', '담당하고 있는', '작업자', '작업하는 사람', '일하는 사람',
      '배정된 사람', '배정자', '할당된', '할당받은', '맡은', '맡고 있는',
      '담당팀', '담당 팀', '담당 부서', '담당부서', '책임팀', '책임 팀',
      '누가 하고 있', '누가 진행', '담당은 누구'
    ];
    const isAssigneeQuery = lastUserMessage && 
      assigneeKeywords.some(keyword => lastUserMessage.content.includes(keyword));

    // 일정 관련 질문은 클라이언트에서 처리하므로 여기서는 특별한 처리 없이 그대로 진행
    // (클라이언트에서 이미 일정 관련 질문은 필터링되어 여기로 오지 않음)

    // 혹시 일정 관련 질문이 이 API에 도달한 경우 (중복 처리 방지)
    if (isTaskRelatedQuery || isDueDateQuery || isSpecificTaskQuery || isStatusQuery || isAssigneeQuery) {
      console.log('일정 관련 질문이 API까지 도달함 - 중복 처리 방지');
      return NextResponse.json({
        content: "일정 정보는 클라이언트에서 직접 처리됩니다."
      });
    }

    // Format messages for Claude API
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    // 요약 요청 메시지에 대한 특별 처리
    if (isSummarizeRequest && lastUserMessage.content === "요약해줘" && hasPreviousContent) {
      // 기존 메시지를 하나로 통합
      const combinedMessages = [];
      
      // 마지막 요약 요청 이전의 모든 메시지를 포함
      for (let i = 0; i < formattedMessages.length - 1; i++) {
        combinedMessages.push(formattedMessages[i]);
      }
      
      // 마지막 요청을 명확하게 수정
      combinedMessages.push({
        role: 'user',
        content: `다음 내용을 요약해 주세요. 내용을 모두 읽고 이해한 후 응답해 주세요:\n\n${previousUserContent}`
      });
      
      // 수정된 메시지로 대체
      formattedMessages.splice(0, formattedMessages.length, ...combinedMessages);
    }

    // Use different system messages based on request type
    const systemMessage = {
      role: "system",
      content: `당신은 프로젝트 관리 시스템의 AI 챗봇입니다. 항상 마크다운 형식으로 답변하고, 번호 리스트를 사용하세요.

프로젝트 관련 질문에는 다음 정보 구조에 맞춰 답변하세요:
- 프로젝트: 이름, 설명, 생성일, 소유자, 멤버
- 태스크: 제목, 상태, 우선순위, 담당자, 마감일
- 문서: 제목, 내용, 프로젝트 연결

간결하고 핵심적인 답변을 제공하세요.`
    };

    if (isSummarizeRequest) {
      systemMessage.content = `당신은 문서 요약 전문가입니다. 주어진 문서나 코드를 간결하게 요약하세요.
항상 번호 목록(1. 2. 3.)을 사용하고, 핵심 내용을 3-5개 항목으로 정리하세요.
설명문 없이 바로 요점을 나열하세요.`;
    }

    // Use direct fetch with Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',  // Using a different model that might be more reliable
        max_tokens: 1000,
        system: systemMessage.content,
        messages: formattedMessages
      }),
    });

    if (!response.ok) {
      let errorMessage = `Claude API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        console.error('Claude API error details:', errorData);
        if (errorData.error && errorData.error.message) {
          errorMessage = `Claude API error: ${errorData.error.message}`;
        }
      } catch (e) {
        const errorText = await response.text();
        console.error('Claude API error text:', errorText);
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Extract text content from the response
    let responseContent = 'Unable to process response';
    
    if (data.content && Array.isArray(data.content) && data.content.length > 0) {
      const firstContent = data.content[0];
      if (firstContent.type === 'text') {
        responseContent = firstContent.text;
      }
    }

    // 요약 요청인 경우 추가 처리
    if (isSummarizeRequest) {
      // "요약해줘"만 입력했고 이전 메시지에 내용이 없는 경우에 대한 처리 제거
      // 클라이언트에서 페이지 콘텐츠를 직접 가져오는 방식으로 변경
      
      // 설명 부분을 제거하는 추가 처리
      
      // 패턴 1: 문서 요약이나 핵심 내용 같은 제목이 있는 경우 
      responseContent = responseContent.replace(/^(문서\s*요약|핵심\s*내용|요약\s*내용|문서의\s*핵심|요점\s*정리|요약|Summary)[:：]?\s*\n+/i, '');
      
      // 패턴 2: 불필요한 설명이 있는 경우
      responseContent = responseContent.replace(/^(다음은|이\s*문서는|문서의\s*핵심\s*내용은|이\s*문서의\s*주요\s*내용은|요약하자면|요약하면|간략히\s*요약하면)[^\d\-\*]*?(?=[\d\.\-\*])/i, '');
      
      // 패턴 3: 불필요한 설명이 있고 글머리 기호나 숫자 목록 전에 빈 줄이 있는 경우
      responseContent = responseContent.replace(/^.*?(문서|내용|요약|핵심|주요|정리|설명).*?\n+(?=[\d\.\-\*])/i, '');
      
      // 패턴 4: 첫 줄이 글머리 기호나 숫자로 시작하지 않으면 전체 첫 단락 제거
      if (!responseContent.trim().startsWith('-') && !responseContent.trim().startsWith('*') && !/^\d+\./.test(responseContent.trim())) {
        responseContent = responseContent.replace(/^[^\d\-\*]+?\n+(?=[\d\.\-\*])/i, '');
      }
      
      // 패턴 5: 마지막 줄의 불필요한 마무리 제거
      responseContent = responseContent.replace(/\n+(?:따라서|결론적으로|요약하자면|이상이|위와\s*같이)[^\n]*$/i, '');
      
      // "요약해줘" 요청에 대해 더 엄격한 처리: 모든 텍스트 형식 제거하고 숫자 목록으로 시작하는 항목만 남김
      if (lastUserMessage.content === "요약해줘") {
        // 모든 서식과 마크다운 헤더 제거
        responseContent = responseContent.replace(/^#+ .*\n+/gm, '');
        
        // 필요없는 설명이나 가이드 제거
        responseContent = responseContent.replace(/^(?![.\d\-*]).*\n*/gm, '');
        
        // 글머리 기호를 숫자 목록으로 변환
        const lines = responseContent.split('\n');
        let numberedLines = [];
        let itemNumber = 1;
        
        for (let line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
            // 글머리 기호를 숫자로 변환
            numberedLines.push(`${itemNumber}. ${trimmedLine.substring(1).trim()}`);
            itemNumber++;
          } else if (/^\d+\./.test(trimmedLine)) {
            // 이미 숫자인 경우 그대로 유지하고 번호만 수정
            numberedLines.push(`${itemNumber}. ${trimmedLine.replace(/^\d+\./, '').trim()}`);
            itemNumber++;
          }
        }
        
        responseContent = numberedLines.join('\n');
        
        // 혹시 항목이 없는 경우 빈 응답이 되는 것을 방지
        if (!responseContent.trim()) {
          // 원본 응답에서 어떤 내용이든 추출해서 숫자 목록 형태로 변환
          const originalLines = data.content[0].text.split('\n');
          const contentLines = originalLines
            .filter((line: string) => line.trim() && !line.trim().startsWith('#'))
            .map((line: string, index: number) => `${index + 1}. ${line.trim().replace(/^[-\*\d]\.\s*/, '')}`)
            .slice(0, 5);  // 최대 5개 항목으로 제한
            
          responseContent = contentLines.join('\n');
        }
      } else {
        // 글머리 기호를 숫자 목록으로 변환 (일반 요약 요청)
        const lines = responseContent.split('\n');
        let numberedLines = [];
        let itemNumber = 1;
        
        for (let line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
            // 글머리 기호를 숫자로 변환
            numberedLines.push(`${itemNumber}. ${trimmedLine.substring(1).trim()}`);
            itemNumber++;
          } else if (/^\d+\./.test(trimmedLine)) {
            // 이미 숫자인 경우 그대로 유지
            numberedLines.push(trimmedLine);
            // 다음 번호 업데이트 시도
            const match = trimmedLine.match(/^(\d+)\./);
            if (match && match[1]) {
              itemNumber = parseInt(match[1]) + 1;
            } else {
              itemNumber++;
            }
          } else {
            // 다른 내용은 그대로 유지
            numberedLines.push(trimmedLine);
          }
        }
        
        responseContent = numberedLines.join('\n');
      }
      
      // 최종 정리: 앞뒤 공백 제거 및 불필요한 빈 줄 정리
      responseContent = responseContent.trim();
    }

    // For summarization requests, add a helpful prefix (제거)
    if (isSummarizeRequest && lastUserMessage && lastUserMessage.content !== "요약해줘") {
      // 접두사 제거: 바로 요약 내용만 표시
      // responseContent = "📝 문서 요약:\n\n" + responseContent;
    }

    return NextResponse.json({
      content: responseContent,
    });
  } catch (error: any) {
    console.error('Error in AI chat endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
} 