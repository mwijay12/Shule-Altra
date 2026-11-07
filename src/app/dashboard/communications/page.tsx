"use client";

/**
 * @fileOverview Communications — the school's outbound mail room.
 *
 * The page never holds an address list. It asks the server what this role may
 * send and to how many people, previews the exact email that would go out, and
 * lets a human press send. Everything else (recipients, HTML, policy) is
 * resolved in /api/notifications/email.
 */

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Loader2,
  MailCheck,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Template = {
  id: string;
  title: string;
  audience: string;
  audienceSize: number;
  sample: string | null;
  allowed: boolean;
  reason: string;
  roles: string[];
};

type Capabilities = {
  provider: "resend" | "dry-run";
  from: string;
  note: string;
  role: string | null;
  roleLabel: string | null;
  school: string;
  templates: Template[];
};

type Preview = {
  title: string;
  subject: string;
  to: string;
  recipients: number;
  html: string;
  text: string;
};

type Sent = {
  title: string;
  audience: string;
  attempted: number;
  delivered: number;
  failed: number;
  provider: string;
  auditId: string;
  subject?: string;
  error?: string;
};

const AUDIENCE_LABEL: Record<string, string> = {
  "fee-defaulters": "Guardians with an open balance",
  "absent-today": "Guardians of learners absent today",
  "term-results": "Guardians of learners with results",
  "all-teachers": "Every teacher on the establishment",
  "all-staff": "Every member of staff",
};

export default function CommunicationsPage() {
  const { toast } = useToast();
  const [caps, setCaps] = React.useState<Capabilities | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [sent, setSent] = React.useState<Sent[]>([]);

  const load = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/email", { cache: "no-store" });
      const body = (await response.json()) as Capabilities;
      setCaps(body);
    } catch {
      toast({ variant: "destructive", title: "Could not read the mail room" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const run = async (template: Template, mode: "preview" | "send") => {
    setBusy(`${template.id}:${mode}`);
    try {
      const response = await fetch("/api/notifications/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ template: template.id, mode }),
      });
      const body = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Refused",
          description: body?.error ?? "The mail room said no.",
        });
        return;
      }

      if (mode === "preview") {
        setPreview(body as Preview);
        return;
      }

      const record = body as Sent;
      setSent((previous) => [record, ...previous].slice(0, 6));
      toast({
        title:
          record.provider === "dry-run"
            ? `Rendered ${record.attempted} emails (dry run)`
            : `Sent ${record.delivered} of ${record.attempted}`,
        description:
          record.provider === "dry-run"
            ? "Add RESEND_API_KEY to deliver them for real."
            : `Audit ${record.auditId.slice(0, 8)} · ${record.provider}`,
      });
    } catch {
      toast({ variant: "destructive", title: "Network error", description: "Nothing was sent." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8 pb-16 font-body">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.28em] text-muted-foreground">
            <MailCheck className="h-3.5 w-3.5 text-primary" />
            Institutional communications · {caps?.school ?? "school register"}
          </div>
          <h1 className="font-headline text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
            Mail room
          </h1>
          <p className="max-w-2xl text-[11px] font-medium leading-relaxed text-muted-foreground">
            Branded email to guardians and staff, rendered from the school’s own register. Recipients
            are resolved on the server, so what you send is exactly who the record says.
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            caps?.provider === "resend"
              ? "h-7 rounded-full border-emerald-500/30 bg-emerald-500/10 px-3 text-[8px] font-black uppercase tracking-widest text-emerald-600"
              : "h-7 rounded-full border-amber-500/30 bg-amber-500/10 px-3 text-[8px] font-black uppercase tracking-widest text-amber-600"
          }
        >
          {caps?.provider === "resend" ? "Resend connected" : "Dry run"}
        </Badge>
      </header>

      <Card className="glass-panel border-border/60">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              {caps?.provider === "resend" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
            </span>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground">
                Sending as {caps?.from ?? "—"}
              </p>
              <p className="mt-1 max-w-xl text-[10px] font-medium leading-relaxed text-muted-foreground">
                {caps?.note ?? "Checking the provider…"}
              </p>
            </div>
          </div>
          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            Signed in as {caps?.roleLabel ?? "guest"}
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the register…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(caps?.templates ?? []).map((template) => (
            <Card
              key={template.id}
              className={`glass-panel border-border/60 ${template.allowed ? "" : "opacity-70"}`}
            >
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[12px] font-black uppercase tracking-widest text-foreground">
                      {template.title}
                    </h2>
                    <p className="mt-1 text-[10px] font-medium leading-relaxed text-muted-foreground">
                      {AUDIENCE_LABEL[template.audience] ?? template.audience} ·{" "}
                      <span className="text-foreground">{template.audienceSize}</span> recipients
                    </p>
                    <p className="mt-1 font-mono text-[9px] text-muted-foreground/80">
                      {template.sample ?? "no addresses on file"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 rounded-full border-border/70 text-[7px] font-black uppercase tracking-[0.14em]"
                  >
                    {template.allowed ? "Permitted" : "Restricted"}
                  </Badge>
                </div>

                {!template.allowed && (
                  <p className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-[9px] font-medium leading-relaxed text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    {template.reason} — {template.roles.join(", ")} only.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!template.allowed || busy !== null}
                    onClick={() => run(template, "preview")}
                    className="h-8 rounded-full text-[8px] font-black uppercase tracking-widest"
                  >
                    {busy === `${template.id}:preview` ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <Eye className="mr-1.5 h-3 w-3" />
                    )}
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    disabled={!template.allowed || busy !== null || template.audienceSize === 0}
                    onClick={() => run(template, "send")}
                    className="h-8 rounded-full colorful-gradient text-[8px] font-black uppercase tracking-widest text-white"
                  >
                    {busy === `${template.id}:send` ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="mr-1.5 h-3 w-3" />
                    )}
                    Send to {template.audienceSize}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sent.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground">
            This session
          </h2>
          <div className="space-y-2">
            {sent.map((record) => (
              <div
                key={record.auditId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3"
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground">
                    {record.title}
                  </p>
                  <p className="mt-0.5 text-[9px] font-medium text-muted-foreground">
                    {AUDIENCE_LABEL[record.audience] ?? record.audience} · {record.attempted} recipients
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {record.provider} · {record.auditId.slice(0, 8)}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      record.provider === "dry-run"
                        ? "rounded-full border-amber-500/30 bg-amber-500/10 text-[7px] font-black uppercase tracking-widest text-amber-600"
                        : "rounded-full border-emerald-500/30 bg-emerald-500/10 text-[7px] font-black uppercase tracking-widest text-emerald-600"
                    }
                  >
                    {record.provider === "dry-run" ? "Rendered" : `${record.delivered} sent`}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border/60 bg-background shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Preview · {preview.recipients} recipients · to {preview.to}
                </p>
                <p className="mt-1 text-[11px] font-black uppercase tracking-widest text-foreground">
                  {preview.subject}
                </p>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="roundedfull grid h-8 w-8 place-items-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe
              title="Email preview"
              srcDoc={preview.html}
              className="h-[60vh] w-full bg-white"
              sandbox=""
            />
          </div>
        </div>
      )}
    </div>
  );
}
