import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { content, title = '문서' } = await request.json();

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: '문서 내용이 제공되지 않았습니다.', summary: '' },
        { status: 400 }
      );
    }
    
    // 내용이 너무 짧으면 요약할 필요가 없음
    if (content.length < 100) {
      return NextResponse.json({ 
        summary: `- ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`
      });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_AI_KEY || '',
    });

    const systemMessage = `당신은 강력한 문서 요약 AI입니다. 
다음 문서 내용을 "핵심"만 간결하게 요약해주세요.

제목은 "📝 **[문서 주제] 요약**" 형식으로 시작하세요.

항상 마크다운 형식으로 응답하며, 다음 요소를 적절히 활용하세요:
1. 제목과 소제목
2. 숫자 목록 (번호를 사용하고, 글머리 기호는 사용하지 마세요)
3. 강조와 굵게 표시
4. 이모티콘을 적절히 사용해 주세요

답변 스타일:
- 제목으로 시작해 문서의 핵심 주제를 나타내세요
- 친근하고 생동감 있는 톤을 유지하세요
- 원본 내용의 핵심을 3-5개 정도의 주요 포인트로 정리하세요
- 요약은 숫자로 된 목록 형태로 제공하세요

주어진 문서/코드를 읽기 전에 답변하지 마세요.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.3,
      system: systemMessage,
      messages: [
        {
          role: 'user',
          content: `다음 "${title}" 내용을 요약해 주세요. 내용을 모두 읽고 이해한 후 응답해 주세요:

${content}`,
        },
      ],
    });

    let summary = '';
    if (response.content[0].type === 'text') {
      summary = response.content[0].text;
      
      // 부가 설명이나 마크다운 헤더 등 불필요한 요소 제거
      summary = summary.replace(/^(문서\s*요약|핵심\s*내용|요약\s*내용|문서의\s*핵심|요점\s*정리|요약|Summary)[:：]?\s*\n+/i, '');
      summary = summary.replace(/^(다음은|이\s*문서는|문서의\s*핵심\s*내용은|이\s*문서의\s*주요\s*내용은|요약하자면|요약하면|간략히\s*요약하면)[^-\*]*?(?=[-\*])/i, '');
      summary = summary.replace(/^.*?(문서|내용|요약|핵심|주요|정리|설명).*?\n+(?=[-\*])/i, '');
      summary = summary.replace(/\n+(?:따라서|결론적으로|요약하자면|이상이|위와\s*같이)[^\n]*$/i, '');
      
      // 모든 서식과 마크다운 헤더 제거
      summary = summary.replace(/^#+ .*\n+/gm, '');
      
      // 줄 시작 부분의 글머리 기호가 아닌 경우 제거하고, 글머리 기호로 시작하도록 변환
      const lines = summary.split('\n');
      summary = lines
        .filter(line => line.trim() !== '')
        .map(line => {
          // 이미 글머리 기호로 시작하면 그대로 사용
          if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
            return line;
          }
          // 아니면 글머리 기호 추가
          return `- ${line.trim()}`;
        })
        .join('\n');
      
      // 앞뒤 공백 제거
      summary = summary.trim();
      
      // 요약이 비어있으면 간단한 메시지 생성
      if (!summary.trim()) {
        summary = `- ${title}에 대한 요약입니다.`;
      }
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('문서 요약 중 오류:', error);
    return NextResponse.json(
      { error: '문서 요약 중 오류가 발생했습니다.', summary: '- 문서 요약 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 