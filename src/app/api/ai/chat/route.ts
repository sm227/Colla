import { NextRequest, NextResponse } from 'next/server';

// Set API timeout to 30 seconds
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Remove edge runtime directive as it might be causing issues
// export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages, projectData, userDocuments, systemMessage: clientSystemMessage } = await req.json();

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

    // 혹시 일정 관련 질문이 이 API에 도달한 경우
    let taskSystemMessage = null;
    let shouldUseTaskMode = false;

    // 클라이언트에서 전달된 systemMessage가 '일정 생성 전문가'인 경우
    if (clientSystemMessage === '일정 생성 전문가') {
      shouldUseTaskMode = true;
      taskSystemMessage = `당신은 프로젝트 관리 시스템의 일정 생성 전문가입니다.
사용자가 일정 추가를 요청했습니다. 사용자 메시지에서 다음 정보를 추출하세요:

1. 일정 제목(title): 필수
2. 설명(description): 선택, 없으면 null
3. 마감일(dueDate): 가능하면 "YYYY-MM-DD" 형식으로 지정해주세요. 날짜가 명시되지 않았으나 "오늘", "내일" 등의 표현이 있으면 해당 날짜로 변환하세요. 날짜가 없으면 오늘 날짜를 사용하세요. 그 외에는 null로 설정하세요.
4. 상태(status): "todo", "in_progress", "review", "done" 중 하나, 없으면 "todo"
5. 우선순위(priority): "low", "medium", "high" 중 하나, 없으면 "medium"
6. 담당자(assignee): 사용자 이름을 입력하세요. 시스템이 자동으로 이름을 찾아 ID로 변환합니다. 없으면 null

매우 중요: 반드시 다음의 JSON 형식만 응답하세요. 그 외의 일반 대화나 설명은 포함하지 마세요:

{
  "action": "create_task",
  "data": {
    "title": "일정 제목",
    "description": "상세 설명",
    "dueDate": "YYYY-MM-DD",
    "status": "todo",
    "priority": "medium",
    "assignee": "사용자 이름"
  },
  "message": "새 일정을 추가했습니다: [일정 제목]"
}

정보가 불충분하면 다음과 같이 응답하세요:

{
  "action": "request_more_info",
  "message": "필요한 정보를 요청하는 메시지"
}

절대 코드 블록(\`\`\`)으로 감싸지 말고, 순수한 JSON 형식만 응답하세요.
절대 추가 설명이나 대화를 포함하지 마세요.
응답은 한국어로 작성하세요.`;
    }
    
    // 마지막 사용자 메시지에서 일정 데이터가 있는지 확인 (기존 로직)
    if (!shouldUseTaskMode && lastUserMessage) {
      const messageContent = lastUserMessage.content;
      
      // 일정 관련 키워드를 먼저 확인
      const hasScheduleKeywords = 
        messageContent.includes('일정') || 
        messageContent.includes('태스크') || 
        messageContent.includes('할일') || 
        messageContent.includes('task');
      const hasCreationKeywords = 
        messageContent.includes('추가') || 
        messageContent.includes('생성') || 
        messageContent.includes('만들') || 
        messageContent.includes('새로운') ||
        messageContent.includes('새 일정') || 
        messageContent.includes('등록') ||
        messageContent.includes('만들어') ||
        messageContent.includes('줘') ||
        messageContent.includes('해줘');
      
      // 일정 생성 요청 확인 (키워드 기반)
      const isSimpleCreationRequest = hasScheduleKeywords && hasCreationKeywords;
      
      if (isSimpleCreationRequest) {
        // 단순 일정 생성 요청이 감지된 경우
        console.log('간단한 일정 생성 요청 감지:', messageContent);
        shouldUseTaskMode = true;
        taskSystemMessage = `당신은 프로젝트 관리 시스템의 일정 생성 전문가입니다.
사용자가 일정 추가를 요청했습니다. 사용자 메시지에서 다음 정보를 추출하세요:

1. 일정 제목(title): 필수
2. 설명(description): 선택, 없으면 null
3. 마감일(dueDate): 가능하면 "YYYY-MM-DD" 형식으로 지정해주세요. 날짜가 명시되지 않았으나 "오늘", "내일" 등의 표현이 있으면 해당 날짜로 변환하세요. 날짜가 없으면 오늘 날짜를 사용하세요. 그 외에는 null로 설정하세요.
4. 상태(status): "todo", "in_progress", "review", "done" 중 하나, 없으면 "todo"
5. 우선순위(priority): "low", "medium", "high" 중 하나, 없으면 "medium"
6. 담당자(assignee): 사용자 이름을 입력하세요. 시스템이 자동으로 이름을 찾아 ID로 변환합니다. 없으면 null

매우 중요: 반드시 다음의 JSON 형식만 응답하세요. 그 외의 일반 대화나 설명은 포함하지 마세요:

{
  "action": "create_task",
  "data": {
    "title": "일정 제목",
    "description": "상세 설명",
    "dueDate": "YYYY-MM-DD",
    "status": "todo",
    "priority": "medium",
    "assignee": "사용자 이름"
  },
  "message": "새 일정을 추가했습니다: [일정 제목]"
}

정보가 불충분하면 다음과 같이 응답하세요:

{
  "action": "request_more_info",
  "message": "필요한 정보를 요청하는 메시지"
}

절대 코드 블록(\`\`\`)으로 감싸지 말고, 순수한 JSON 형식만 응답하세요.
절대 추가 설명이나 대화를 포함하지 마세요.
응답은 한국어로 작성하세요.`;
      }
      
      // 기존 데이터 섹션 로직
      const dataSections = messageContent.split('---\n');
      
      // 데이터 섹션이 포함된 경우
      if (dataSections.length > 1) {
        const dataSection = dataSections.slice(1).join('---\n');
        
        // 일정 데이터가 포함된 경우
        if (dataSection.includes('일정 데이터') || dataSection.includes('태스크 데이터') || dataSection.includes('task')) {
          // 일정 추가 요청인지 확인
          const userQuestion = dataSections[0].trim();
          const isTaskCreationRequest = 
            (userQuestion.includes('일정') || userQuestion.includes('태스크') || userQuestion.includes('task') || userQuestion.includes('할일')) && 
            (userQuestion.includes('추가') || userQuestion.includes('생성') || 
             userQuestion.includes('만들') || userQuestion.includes('새로운') ||
             userQuestion.includes('새 일정') || userQuestion.includes('등록') ||
             userQuestion.includes('만들어') || userQuestion.includes('줘') ||
             userQuestion.includes('해줘'));
          
          if (isTaskCreationRequest) {
            // 일정 생성을 위한 시스템 메시지
            taskSystemMessage = `당신은 프로젝트 관리 시스템의 일정 생성 전문가입니다.
사용자가 일정 추가를 요청했습니다. 사용자 메시지에서 다음 정보를 추출하세요:

1. 일정 제목(title): 필수
2. 설명(description): 선택, 없으면 null
3. 마감일(dueDate): 가능하면 "YYYY-MM-DD" 형식으로 지정해주세요. 날짜가 명시되지 않았으나 "오늘", "내일" 등의 표현이 있으면 해당 날짜로 변환하세요. 날짜가 없으면 오늘 날짜를 사용하세요. 그 외에는 null로 설정하세요.
4. 상태(status): "todo", "in_progress", "review", "done" 중 하나, 없으면 "todo"
5. 우선순위(priority): "low", "medium", "high" 중 하나, 없으면 "medium"
6. 담당자(assignee): 사용자 이름을 입력하세요. 시스템이 자동으로 이름을 찾아 ID로 변환합니다. 없으면 null

매우 중요: 반드시 다음의 JSON 형식만 응답하세요. 그 외의 일반 대화나 설명은 포함하지 마세요:

{
  "action": "create_task",
  "data": {
    "title": "일정 제목",
    "description": "상세 설명",
    "dueDate": "YYYY-MM-DD",
    "status": "todo",
    "priority": "medium",
    "assignee": "사용자 이름"
  },
  "message": "새 일정을 추가했습니다: [일정 제목]"
}

정보가 불충분하면 다음과 같이 응답하세요:

{
  "action": "request_more_info",
  "message": "필요한 정보를 요청하는 메시지"
}

절대 코드 블록(\`\`\`)으로 감싸지 말고, 순수한 JSON 형식만 응답하세요.
절대 추가 설명이나 대화를 포함하지 마세요.
응답은 한국어로 작성하세요.`;
          
            // 태스크 모드 활성화
            shouldUseTaskMode = true;
          } else {
            // 일반 일정 질문에 대한 시스템 메시지
            taskSystemMessage = `당신은 프로젝트 관리 시스템의 일정 관리 전문가입니다.
제공된 일정 데이터를 기반으로 사용자의 질문에 정확하게 답변하세요.

매우 중요: 오직 제공된 JSON 데이터에 있는 일정 정보만 사용하세요. 
데이터에 없는 일정은 절대로 만들어내지 마세요.
존재하지 않는 일정에 대해 질문하면 "해당 일정을 찾을 수 없습니다"라고 명확히 답변하세요.
실제 데이터에 기반한 사실만 말하고 없는 정보는 추측하지 마세요.

항상 마크다운 형식으로 답변하고, 일정 정보는 번호 목록(1. 2. 3.)을 사용하여 제시하세요.
응답은 공손하고 친절한 톤으로 작성하며, 한국어로 답변하세요.
상태별 일정 응답에는 이모지를 적절히 사용하여 시각적 구분을 돕습니다:
- 할 일(todo): 📋 또는 🔜
- 진행 중(in_progress): 🚧 또는 ⚙️
- 검토 중(review): 🔍 또는 👀
- 완료(done): ✅ 또는 🏆
담당자 정보와 마감일 정보를 명확히 표시하고, 사용자가 요청한 특정 일정 정보에 집중하세요.

만약 요청한 정보가 데이터에 없다면, "해당 정보는 제공된 데이터에 없습니다"라고 정직하게 답변하세요.`;
          
            // 태스크 모드 활성화
            shouldUseTaskMode = true;
          }
        }
      } else if (!isSimpleCreationRequest) {
        // 데이터 섹션이 없는 경우, 일정 추가 요청인지 확인
        const isTaskCreationRequest = 
          (messageContent.includes('일정') || messageContent.includes('태스크') || messageContent.includes('task') || messageContent.includes('할일')) && 
          (messageContent.includes('추가') || messageContent.includes('생성') || 
           messageContent.includes('만들') || messageContent.includes('새로운') ||
           messageContent.includes('새 일정') || messageContent.includes('등록') ||
           messageContent.includes('만들어') || messageContent.includes('줘') ||
           messageContent.includes('해줘'));
        
        if (isTaskCreationRequest) {
          // 일정 생성을 위한 시스템 메시지 (데이터 없는 경우)
          taskSystemMessage = `당신은 프로젝트 관리 시스템의 일정 생성 전문가입니다.
사용자가 일정 추가를 요청했습니다. 사용자 메시지에서 다음 정보를 추출하세요:

1. 일정 제목(title): 필수
2. 설명(description): 선택, 없으면 null
3. 마감일(dueDate): 가능하면 "YYYY-MM-DD" 형식으로 지정해주세요. 날짜가 명시되지 않았으나 "오늘", "내일" 등의 표현이 있으면 해당 날짜로 변환하세요. 날짜가 없으면 오늘 날짜를 사용하세요. 그 외에는 null로 설정하세요.
4. 상태(status): "todo", "in_progress", "review", "done" 중 하나, 없으면 "todo"
5. 우선순위(priority): "low", "medium", "high" 중 하나, 없으면 "medium"
6. 담당자(assignee): 사용자 이름을 입력하세요. 시스템이 자동으로 이름을 찾아 ID로 변환합니다. 없으면 null

매우 중요: 반드시 다음의 JSON 형식만 응답하세요. 그 외의 일반 대화나 설명은 포함하지 마세요:

{
  "action": "create_task",
  "data": {
    "title": "일정 제목",
    "description": "상세 설명",
    "dueDate": "YYYY-MM-DD",
    "status": "todo",
    "priority": "medium",
    "assignee": "사용자 이름"
  },
  "message": "새 일정을 추가했습니다: [일정 제목]"
}

정보가 불충분하면 다음과 같이 응답하세요:

{
  "action": "request_more_info",
  "message": "필요한 정보를 요청하는 메시지"
}

절대 코드 블록(\`\`\`)으로 감싸지 말고, 순수한 JSON 형식만 응답하세요.
절대 추가 설명이나 대화를 포함하지 마세요.
응답은 한국어로 작성하세요.`;
        
          // 태스크 모드 활성화
          shouldUseTaskMode = true;
        }
      }
    }

    // Format messages for Claude API
    let formattedMessages = messages.map((msg: any) => ({
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

    // 일정 관련 데이터가 포함된 경우 메시지 재구성
    if (shouldUseTaskMode && lastUserMessage) {
      const messageContent = lastUserMessage.content;
      const dataSections = messageContent.split('---\n');
      const userQuestion = dataSections[0].trim();
      const dataSection = dataSections.slice(1).join('---\n');
      
      // 메시지 배열 수정 - 마지막 메시지만 사용자 질문과 데이터로 대체
      formattedMessages = [
        {
          role: 'user',
          content: `${userQuestion}\n\n${dataSection}`
        }
      ];
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
        system: taskSystemMessage ? 
          // 태스크 시스템 메시지가 있는 경우 현재 날짜 정보를 추가
          `${taskSystemMessage.replace('YYYY-MM-DD', `${new Date().getFullYear()}-MM-DD`)}

현재 날짜: ${new Date().toISOString().split('T')[0]}
중요: 오늘은 ${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일입니다. 날짜와 관련된 모든 응답에서 반드시 현재 연도(${new Date().getFullYear()})를 사용하세요. 2023년이 아닌 ${new Date().getFullYear()}년을 사용해야 합니다.` 
          : (isSummarizeRequest ? 
          `당신은 문서 요약 전문가입니다. 주어진 콘텐츠를 명확하고 간결하게 요약하세요.
          
요약 규칙:
1. 핵심 포인트를 3-5개 정도 추출하여 번호가 매겨진 목록으로 표시하세요.
2. 각 포인트는 간결하게 한 문장으로 표현하세요.
3. 모든 중요한 정보를 포함시키되, 세부 사항은 생략하세요.
4. 원문의 맥락과 의도를 유지하세요.
5. 요약은 객관적이어야 합니다.
6. 번호가 매겨진 목록 외에 추가 설명이나 서론, 결론을 포함하지 마세요.` 
          : (clientSystemMessage || `당신은 친절하고 도움이 되는 AI 도우미입니다. 프로젝트 관리 시스템에서 사용자의 질문에 답변하는 역할을 합니다.

현재 날짜: ${new Date().toISOString().split('T')[0]}
중요: 오늘은 ${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일입니다. 날짜와 관련된 모든 응답에서 반드시 현재 연도(${new Date().getFullYear()})를 사용하세요. 2023년이 아닌 ${new Date().getFullYear()}년을 사용해야 합니다.`)),
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