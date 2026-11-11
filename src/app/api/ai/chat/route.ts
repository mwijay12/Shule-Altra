import { NextResponse } from 'next/server'
import { serverSession } from '@/lib/auth/server-session'
import { DEMO_MODE } from '@/lib/demo/config'
import { groqChatCompletion, GROQ_MODELS, type ChatMessage } from '@/lib/ai/groq-client'

export async function POST(req: Request) {
  // Demo role cookies are intentionally forgeable; never expose paid AI to them.
  if (DEMO_MODE) return NextResponse.json({ error: 'Online AI is unavailable in demo mode.' }, { status: 403 })
  const session = await serverSession()
  if (!session) return NextResponse.json({ error: 'Sign in to use online AI.' }, { status: 401 })
  try {
    const { messages, model, temperature, jsonMode } = await req.json()
    const allowedModels: string[] = Object.values(GROQ_MODELS)
    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 20 || messages.some((m: any) => !m || !['user', 'assistant', 'system'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 4000) || (model && !allowedModels.includes(model)) || (temperature != null && (typeof temperature !== 'number' || temperature < 0 || temperature > 1))) {
      return NextResponse.json({ error: 'Invalid chat request.' }, { status: 400 })
    }
    const result = await groqChatCompletion(messages as ChatMessage[], { model, temperature, jsonMode: jsonMode === true })
    return NextResponse.json({ success: true, content: result.text, model: result.modelUsed })
  } catch {
    return NextResponse.json({ error: 'AI generation failed. Try again later.' }, { status: 503 })
  }
}
