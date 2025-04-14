import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: '문서 내용이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_AI_KEY || '',
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `다음 문서의 내용을 간결하게 요약해 주세요. 핵심 내용과 중요한 포인트를 포함하여 문서의 전체 맥락을 잘 전달하는 요약을 작성해 주세요:

${content}`,
        },
      ],
    });

    let summary = '';
    if (response.content[0].type === 'text') {
      summary = response.content[0].text;
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('문서 요약 중 오류:', error);
    return NextResponse.json(
      { error: '문서 요약 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 