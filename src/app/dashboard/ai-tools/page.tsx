'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bot, ArrowRight, Send, Sparkles, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { answerGuide, GUIDE_PROMPTS, type GuideAnswer } from '@/lib/assistant/guide';

export default function AiToolsPage() {
  const { canAccess } = useAuth();
  const [question, setQuestion] = React.useState('');
  const [answer, setAnswer] = React.useState<GuideAnswer | null>(null);
  const [aiAnswer, setAiAnswer] = React.useState<string | null>(null);
  const [asked, setAsked] = React.useState('');
  const [isLoadingAi, setIsLoadingAi] = React.useState(false);
  const [useOnlineAi, setUseOnlineAi] = React.useState(true);
  const [aiMeta, setAiMeta] = React.useState<{ model?: string; key?: string } | null>(null);

  const ask = async (value: string) => {
    const text = value.trim().slice(0, 500);
    if (!text) return;
    setAsked(text);
    setQuestion('');
    setAiAnswer(null);
    setAiMeta(null);

    const localResult = answerGuide(text, canAccess);
    setAnswer(localResult);

    // If local match was not found or user opted for High-Speed Groq AI:
    const isGenericFallback = localResult.text.startsWith('Sijaelewa hilo');
    if (useOnlineAi || isGenericFallback) {
      setIsLoadingAi(true);
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content:
                  'You are Shule Altra AI Assistant, engineered by Altraware Technology Ltd for Tanzanian schools. Answer questions regarding school administration, NECTA curriculum, attendance, grading, examinations, student welfare, or general pedagogical workflows. Support both English and Swahili fluently. Keep explanations concise, professional, and directly actionable.',
              },
              { role: 'user', content: text },
            ],
          }),
        });

        const data = await res.json();
        if (data.success && data.content) {
          setAiAnswer(data.content);
          setAiMeta({ model: data.model, key: data.key });
        } else if (isGenericFallback) {
          setAiAnswer('Unable to generate answer at the moment. Please try again.');
        }
      } catch (err) {
        console.error('AI error:', err);
      } finally {
        setIsLoadingAi(false);
      }
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <header className="space-y-2">
        <h1 className="flex items-center gap-3 text-3xl font-headline font-semibold">
          <Bot className="h-7 w-7 text-primary" /> Shule Guide &amp; High-Speed AI
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Ask questions about Shule Altra, Tanzanian school administration, NECTA curriculum, or pedagogical planning. Powered by Groq High-Speed inference with instant failover.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Ask a question</CardTitle>
              <CardDescription>
                English or Kiswahili keywords · Instant response across school systems &amp; education guidance.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-600 dark:text-emerald-400">
                <Zap className="h-3 w-3" /> Groq 16-Key Fallback Pool Active
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              ask(question);
            }}
          >
            <label className="sr-only" htmlFor="guide-question">
              Your question
            </label>
            <Input
              id="guide-question"
              value={question}
              maxLength={500}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="How do I calculate NECTA division scores, or mark attendance?"
              className="h-12"
            />
            <Button type="submit" disabled={!question.trim() || isLoadingAi} className="h-12 gap-2">
              {isLoadingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Ask
            </Button>
          </form>

          <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
            {GUIDE_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto whitespace-normal text-left"
                onClick={() => ask(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>

          <div aria-live="polite" aria-atomic="true">
            {(answer || aiAnswer || isLoadingAi) && (
              <div className="space-y-4 rounded-2xl border bg-muted/30 p-5">
                <p className="text-xs font-semibold text-muted-foreground">You asked: {asked}</p>

                {/* Local guide answer if available and not generic */}
                {answer && !answer.text.startsWith('Sijaelewa hilo') && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">System Guide</p>
                    <p className="text-sm leading-relaxed">{answer.text}</p>
                    {answer.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {answer.actions.map((action) =>
                          action.external ? (
                            <Button key={action.href} variant="outline" size="sm" asChild>
                              <a
                                href={action.href}
                                {...(action.href.startsWith('https:')
                                  ? { target: '_blank', rel: 'noopener noreferrer' }
                                  : {})}
                              >
                                {action.label}
                                <ArrowRight className="ml-2 h-3 w-3" />
                              </a>
                            </Button>
                          ) : (
                            <Button key={action.href} variant="outline" size="sm" asChild>
                              <Link href={action.href}>
                                {action.label}
                                <ArrowRight className="ml-2 h-3 w-3" />
                              </Link>
                            </Button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* AI generated answer */}
                {isLoadingAi && (
                  <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Consulting Shule Altra AI via Groq high-speed engine...</span>
                  </div>
                )}

                {aiAnswer && (
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                        <Sparkles className="h-3.5 w-3.5" /> High-Speed AI Insight
                      </span>
                      {aiMeta?.model && (
                        <span className="text-[11px] text-muted-foreground">
                          Model: {aiMeta.model} · Pool Key: {aiMeta.key}
                        </span>
                      )}
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                      {aiAnswer}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Inference is accelerated by Groq LPU with automatic key-pool rotation and fallback redundancy. Do not input confidential personal security credentials in prompts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
