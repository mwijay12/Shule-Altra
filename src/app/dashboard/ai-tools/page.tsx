'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bot, ArrowRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { answerGuide, GUIDE_PROMPTS, type GuideAnswer } from '@/lib/assistant/guide';

export default function AiToolsPage() {
  const { canAccess } = useAuth();
  const [question, setQuestion] = React.useState('');
  const [answer, setAnswer] = React.useState<GuideAnswer | null>(null);
  const [asked, setAsked] = React.useState('');
  const ask = (value: string) => {
    const text = value.trim().slice(0, 500);
    if (!text) return;
    setAsked(text);
    setAnswer(answerGuide(text, canAccess));
    setQuestion('');
  };
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <header className="space-y-2">
        <h1 className="flex items-center gap-3 text-3xl font-headline font-semibold"><Bot className="h-7 w-7 text-primary" /> Shule Guide</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">Ask about Shule Altra, its workflows or Altraware Technology. This local guide uses predefined answers, not an AI model; it does not send questions to a server.</p>
      </header>
      <Card>
        <CardHeader><CardTitle>Ask a question</CardTitle><CardDescription>English or Kiswahili keywords · works locally once the page is loaded. It can open pages, but cannot change records for you.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={event => { event.preventDefault(); ask(question); }}>
            <label className="sr-only" htmlFor="guide-question">Your question</label>
            <Input id="guide-question" value={question} maxLength={500} onChange={event => setQuestion(event.target.value)} placeholder="How do I mark attendance?" className="h-12" />
            <Button type="submit" disabled={!question.trim()} className="h-12 gap-2"><Send className="h-4 w-4" /> Ask</Button>
          </form>
          <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
            {GUIDE_PROMPTS.map(prompt => <Button key={prompt} type="button" variant="outline" size="sm" className="h-auto whitespace-normal text-left" onClick={() => ask(prompt)}>{prompt}</Button>)}
          </div>
          <div aria-live="polite" aria-atomic="true">
            {answer && <div className="space-y-4 rounded-2xl border bg-muted/30 p-5">
              <p className="text-xs font-semibold text-muted-foreground">You asked: {asked}</p>
              <p className="text-sm leading-relaxed">{answer.text}</p>
              {answer.actions.length > 0 && <div className="flex flex-wrap gap-2">{answer.actions.map(action => action.external ?
                <Button key={action.href} variant="outline" size="sm" asChild><a href={action.href} {...(action.href.startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{action.label}<ArrowRight className="ml-2 h-3 w-3" /></a></Button> :
                <Button key={action.href} variant="outline" size="sm" asChild><Link href={action.href}>{action.label}<ArrowRight className="ml-2 h-3 w-3" /></Link></Button>)}</div>}
            </div>}
          </div>
          <p className="text-xs text-muted-foreground">Page loading, login, live data and external links may still need internet. Do not include sensitive student information in questions.</p>
        </CardContent>
      </Card>
    </div>
  );
}
