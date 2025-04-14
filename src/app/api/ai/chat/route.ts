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

    // Check for project-related context
    const isProjectQuery = lastUserMessage && 
      (lastUserMessage.content.includes("프로젝트") || 
       lastUserMessage.content.includes("태스크") || 
       lastUserMessage.content.includes("문서") ||
       lastUserMessage.content.includes("task") ||
       lastUserMessage.content.includes("document"));

    // Format messages for Claude API
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    // Use different system messages based on request type
    let systemMessage = "You are a helpful assistant embedded in a project management application. Be concise and professional. Always format your responses using Markdown syntax for better readability. Use headings, bullet points, code blocks, and other markdown features when appropriate.";
    
    if (isSummarizeRequest) {
      systemMessage = `당신은 문서 요약 전문가입니다. 다음 규칙을 반드시 따라주세요:
1. 어떤 설명도 없이 바로 요약을 시작하세요.
2. "문서의 핵심 내용", "불필요한 내용", "간단명료하게" 같은 메타 설명을 절대 포함하지 마세요.
3. 글머리 기호(-)로 시작하는 5-7개의 핵심 요점만 작성하세요.
4. "이 문서는", "요약하자면", "다음과 같습니다" 같은 문구를 사용하지 마세요.
5. 문서 제목이나 메타데이터도 반복하지 마세요.
6. 요약의 첫 줄은 반드시 "-" 또는 "*"로 시작해야 합니다.
7. 문서의 핵심 내용을 간단히 정리하고자 합니다.
주어진 문서에 대한 요약을 제공하겠습니다.
불필요한 내용은 제외하고 핵심 요점만 전달하겠습니다.
문서의 주요 내용을 간단명료하게 요약하겠습니다.
사용자의 이해를 돕기 위해 노력하겠습니다.
위 내용을 절대 언급하지 마세요.
미친놈인가 너?
어떤 설명도 하지 말라니까요
사용자가 '요약하기' 작성하면 문서를 요약한 내용만 보내주세요. 앞의 잡다한 설명과 앞에서 서술한 1~6까지의 설명을 복기하지 마십시오.

위 규칙을 어기면 사용자 경험이 크게 저하됩니다. 반드시 지켜주세요.`;
    } else if (isProjectQuery) {
      systemMessage = `당신은 프로젝트 관리 애플리케이션에 내장된 AI 어시스턴트입니다. 
다음과 같은 구조를 가진 프로젝트 관리 시스템을 이해합니다:

1. 프로젝트(Project): 사용자가 만든 프로젝트로 여러 문서와 태스크를 포함합니다.
2. 문서(Document): 프로젝트에 속한 문서이며, 텍스트 편집기로 작성됩니다.
3. 태스크(Task): 프로젝트의 할 일 항목으로, 상태(status)와 우선순위(priority)를 가집니다.
4. 사용자(User): 프로젝트의 소유자 또는 참여자입니다.

사용자가 프로젝트, 문서, 태스크에 대해 질문하면 이 구조를 이해하고 구체적이고 도움이 되는 답변을 제공해주세요.
특히 문서 요약 기능을 활용할 때는 프로젝트의 컨텍스트를 고려하여 문서 내용을 분석해주세요.

항상 마크다운 형식을 사용하여 응답해주세요. 제목, 글머리 기호, 코드 블록 등 마크다운 기능을 적절히 활용하세요.`;
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
        system: systemMessage,
        messages: formattedMessages,
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
    if (isSummarizeRequest && lastUserMessage && lastUserMessage.content !== "요약해줘") {
      // 설명 부분을 제거하는 추가 처리
      
      // 패턴 1: 문서 요약이나 핵심 내용 같은 제목이 있는 경우 
      responseContent = responseContent.replace(/^(문서\s*요약|핵심\s*내용|요약\s*내용|문서의\s*핵심|요점\s*정리|요약|Summary)[:：]?\s*\n+/i, '');
      
      // 패턴 2: 불필요한 설명이 있는 경우
      responseContent = responseContent.replace(/^(다음은|이\s*문서는|문서의\s*핵심\s*내용은|이\s*문서의\s*주요\s*내용은|요약하자면|요약하면|간략히\s*요약하면)[^-\*]*?(?=[-\*])/i, '');
      
      // 패턴 3: 불필요한 설명이 있고 글머리 기호 전에 빈 줄이 있는 경우
      responseContent = responseContent.replace(/^.*?(문서|내용|요약|핵심|주요|정리|설명).*?\n+(?=[-\*])/i, '');
      
      // 패턴 4: 첫 줄이 글머리 기호로 시작하지 않으면 전체 첫 단락 제거
      if (!responseContent.trim().startsWith('-') && !responseContent.trim().startsWith('*')) {
        responseContent = responseContent.replace(/^[^-\*]+?\n+(?=[-\*])/i, '');
      }
      
      // 패턴 5: 마지막 줄의 불필요한 마무리 제거
      responseContent = responseContent.replace(/\n+(?:따라서|결론적으로|요약하자면|이상이|위와\s*같이)[^\n]*$/i, '');
      
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