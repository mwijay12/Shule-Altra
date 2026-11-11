import { NextResponse } from 'next/server';
import { groqChatCompletion, GROQ_MODELS, type ChatMessage } from '@/lib/ai/groq-client';

export async function POST(req: Request) {
  try {
    const { messages, model, temperature, jsonMode } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const result = await groqChatCompletion(messages as ChatMessage[], {
      model,
      temperature,
      jsonMode,
    });

    return NextResponse.json({
      success: true,
      content: result.text,
      model: result.modelUsed,
      key: result.keyUsed,
    });
  } catch (error: any) {
    console.error('[API /api/ai/chat] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'AI generation failed' },
      { status: 500 }
    );
  }
}
