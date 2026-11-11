"use client";

/**
 * @fileOverview Communications, the school's outbound mail room.
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
  Users,
  ShieldCheck,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { StatCard } from "@/components/admin/stat-card";
import { ChartPanel, DeliveryRuns } from "@/components/admin/module-charts";
import { useToast } from "@/hooks/use-toast";
import { GuardianEmail } from "@/components/students/guardian-email";

type Template = {
  id: string;
  title: string;
  audience: string;
  audienceSize: number;
  /** how many would really go today, once the mailbox ceiling applies */
  sendable: number;
  sample: string | null;
  allowed: boolean;
  reason: string;
  roles: string[];
};

type Capabilities = {
  provider: "smtp" | "resend" | "dry-run";
  from: string;
  host: string | null;
  note: string;
  limits: { maxPerSend: number; dailyLimit?: number; dailyRemaining?: number };
  copyTo: string | null;
  replyTo: string | null;
  testMode: { enabled: boolean; recipients: string[] };
  mailbox: { ok: boolean; message: string } | null;
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
  audienceSize?: number;
  delivered: number;
  failed: number;
  provider: string;
  auditId: string;
  subject?: string;
  copyTo?: string | null;
  testMode?: string[] | null;
  sentTo?: string[];
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
  const [probing, setProbing] = React.useState(false);

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

  // "Does the mailbox actually work?", logs in, sends nothing.
  const probe = React.useCallback(async () => {
    setProbing(true);
    try {
      const response = await fetch("/api/notifications/email?probe=1", { cache: "no-store" });
      const body = (await response.json()) as Capabilities;
      setCaps(body);
      const mailbox = body.mailbox;
      toast({
        variant: mailbox?.ok ? "default" : "destructive",
        title: mailbox?.ok ? "Mailbox answered" : "Mailbox refused the login",
        description: mailbox?.message ?? "The provider cannot be probed without SMTP credentials.",
      });
    } catch {
      toast({ variant: "destructive", title: "Could not reach the mail server" });
    } finally {
      setProbing(false);
    }
  }, [toast]);

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
      const where = record.provider === "smtp" ? "SMTP" : record.provider === "resend" ? "Resend" : "dry run";
      toast({
        variant: record.failed > 0 || record.error ? "destructive" : "default",
        title:
          record.provider === "dry-run"
            ? `Rendered ${record.attempted} emails (dry run)`
            : record.failed > 0
              ? `Sent ${record.delivered} of ${record.attempted} · ${record.failed} failed`
              : `Sent ${record.delivered} of ${record.attempted}`,
        description:
          record.provider === "dry-run"
            ? "Add SMTP_HOST/SMTP_USER/SMTP_PASS (or RESEND_API_KEY) to deliver them for real."
            : record.error ??
              `${where}${record.testMode ? " · test inboxes only" : ""} · audit ${record.auditId.slice(0, 8)}${
                record.copyTo ? ` · office copy to ${record.copyTo}` : ""
              }`,
      });
    } catch {
      toast({ variant: "destructive", title: "Network error", description: "Nothing was sent." });
    } finally {
      setBusy(null);
    }
  };

  const totalDelivered = sent.reduce((sum, run) => sum + Number(run.delivered || 0), 0);
  const totalFailed = sent.reduce((sum, run) => sum + Number(run.failed || 0), 0);
  const permitted = (caps?.templates ?? []).filter((t) => t.allowed);
  // Guardians reachable today: the largest permitted audience, not a sum , 
  // the same guardian appears on several templates and would be counted twice.
  const reachable = permitted.reduce((max, t) => Math.max(max, Number(t.audienceSize || 0)), 0);

  return (
    <div className="space-y-8 pb-16 font-body">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-muted-foreground">
            <MailCheck className="h-3.5 w-3.5 text-primary" />
            Institutional communications · {caps?.school ?? "school register"}
          </div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Mail room
          </h1>
          <p className="max-w-2xl text-[14px] font-medium leading-relaxed text-muted-foreground">
            Send individual finance messages from recorded learner details. The older bulk templates below are sample previews only and cannot be sent.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {caps?.testMode?.enabled ? (
          <Badge
            variant="outline"
            className="h-7 rounded-full border-sky-500/30 bg-sky-500/10 px-3 text-[11px] font-semibold text-sky-700"
            title={caps.testMode.recipients.join(", ")}
          >
            Test mode · {caps.testMode.recipients.length} inbox{caps.testMode.recipients.length === 1 ? "" : "es"}
          </Badge>
        ) : null}
        <Badge
          variant="outline"
          className={
            caps && caps.provider !== "dry-run"
              ? "h-7 rounded-full border-emerald-500/30 bg-emerald-500/10 px-3 text-[11px] font-black uppercase tracking-widest text-emerald-600"
              : "h-7 rounded-full border-amber-500/30 bg-amber-500/10 px-3 text-[11px] font-black uppercase tracking-widest text-amber-600"
          }
        >
          {caps?.provider === "smtp"
            ? `SMTP live${caps.host ? ` · ${caps.host}` : ""}`
            : caps?.provider === "resend"
              ? "Resend connected"
              : "Dry run"}
        </Badge>
        </div>
      </header>

      <GuardianEmail />
      <p className="text-sm text-muted-foreground">Sample bulk previews below use example data, not the live register. Bulk sending remains disabled.</p>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Delivered this session" value={totalDelivered} icon={MailCheck} tone="emerald" sub="Sample bulk sends this session" />
        <StatCard index={1} label="Failed" value={totalFailed} icon={AlertTriangle} tone={totalFailed > 0 ? 'rose' : 'slate'} sub={totalFailed > 0 ? 'Check the addresses on the register' : 'Nothing bounced'} />
        <StatCard index={2} label="Sample audience" value={reachable} icon={Users} tone="primary" sub={`${permitted.length} of ${caps?.templates?.length ?? 0} templates permitted for your role`} />
        <StatCard index={3} label="Per click" value={caps?.limits?.maxPerSend ?? 0} icon={Send} tone="accent" sub={caps?.limits?.dailyRemaining !== undefined ? `${caps.limits.dailyRemaining} left today` : 'Provider send limit'} />
      </div>

      {sent.length > 0 ? (
        <ChartPanel title="What each send reached" hint="Delivered against attempted, most recent first." data-reveal>
          <DeliveryRuns runs={sent} />
        </ChartPanel>
      ) : null}

      <Card className="glass-panel border-border/60">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              {caps && caps.provider !== "dry-run" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
            </span>
            <div>
              <p className="text-[12px] font-semibold text-foreground">
                Sending as {caps?.from ?? "—"}
              </p>
              <p className="mt-1 max-w-xl text-[13px] font-medium leading-relaxed text-muted-foreground">
                {caps?.note ?? "Checking the provider…"}
              </p>
              {caps ? (
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-muted-foreground">
                  <span>Max {caps.limits.maxPerSend} per click</span>
                  {caps.limits.dailyRemaining !== undefined ? (
                    <span>
                      {caps.limits.dailyRemaining} of {caps.limits.dailyLimit} left today
                    </span>
                  ) : null}
                  {caps.copyTo ? <span>Office copy · {caps.copyTo}</span> : null}
                  {caps.replyTo ? <span>Reply-to · {caps.replyTo}</span> : null}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {caps?.provider === "smtp" ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full px-3 text-[11px] font-semibold"
                onClick={() => void probe()}
                disabled={probing}
              >
                {probing ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3 w-3" />}
                Test mailbox
              </Button>
            ) : null}
            <p className="text-[11px] font-semibold text-muted-foreground">
              Signed in as {caps?.roleLabel ?? "guest"}
            </p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
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
                    <h2 className="text-[15px] font-semibold text-foreground">
                      {template.title}
                    </h2>
                    <p className="mt-1 text-[13px] font-medium leading-relaxed text-muted-foreground">
                      {AUDIENCE_LABEL[template.audience] ?? template.audience} ·{" "}
                      <AnimatedNumber value={template.audienceSize} className="text-foreground" /> recipients
                      {template.sendable < template.audienceSize ? (
                        <span className="text-amber-600"> · <AnimatedNumber value={template.sendable} /> per click</span>
                      ) : null}
                    </p>
                    <p className="mt-1 font-mono text-[12px] text-muted-foreground/80">
                      {template.sample ?? "no addresses on file"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 rounded-full border-border/70 text-[10px] font-semibold"
                  >
                    {template.allowed ? "Permitted" : "Restricted"}
                  </Badge>
                </div>

                {!template.allowed && (
                  <p className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-[12px] font-medium leading-relaxed text-muted-foreground">
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
                    className="h-8 rounded-full text-[11px] font-semibold"
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
                    disabled
                    onClick={() => run(template, "send")}
                    className="h-8 rounded-full colorful-gradient text-[11px] font-semibold text-white"
                  >
                    {busy === `${template.id}:send` ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="mr-1.5 h-3 w-3" />
                    )}
                    Sending unavailable
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sent.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[12px] font-semibold text-muted-foreground">
            This session
          </h2>
          <div className="space-y-2">
            {sent.map((record) => (
              <div
                key={record.auditId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3"
              >
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    {record.title}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium text-muted-foreground">
                    {AUDIENCE_LABEL[record.audience] ?? record.audience} · {record.attempted} recipients
                    {record.failed > 0 ? ` · ${record.failed} failed` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[12px] text-muted-foreground">
                    {record.provider} · {record.auditId.slice(0, 8)}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      record.provider === "dry-run"
                        ? "rounded-full border-amber-500/30 bg-amber-500/10 text-[10px] font-black uppercase tracking-widest text-amber-600"
                        : "rounded-full border-emerald-500/30 bg-emerald-500/10 text-[10px] font-black uppercase tracking-widest text-emerald-600"
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
                <p className="text-[12px] font-semibold text-muted-foreground">
                  Preview · {preview.recipients} recipients · to {preview.to}
                </p>
                <p className="mt-1 text-[14px] font-semibold text-foreground">
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
