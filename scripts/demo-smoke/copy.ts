/**
 * @fileOverview Copy guard.
 *
 * The demo grew a layer of meaningless techno-jargon ("Student Node", "Male
 * Node", "Sovereign Verification Gateway") and a few claims about capabilities
 * that were never built (SMS delivery, an immutable audit log). This suite fails
 * the build if that language comes back.
 *
 * Only string literals and JSX text are inspected, so code identifiers such as
 * `node.current`, `NodeList` or the `nodemailer` import are never flagged.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
function check(label: string, run: () => void) {
  try { run(); console.log(`OK   ${label}`); }
  catch (error: any) { failures += 1; console.log(`FAIL ${label}: ${String(error?.message).slice(0, 3000)}`); }
}

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

/** Pull out anything a person can actually read on screen or in a document. */
function displayStrings(source: string): string[] {
  const out: string[] = [];
  const literals = source.match(/"([^"\n]{2,})"|'([^'\n]{2,})'|`([^`]{2,})`/g) ?? [];
  out.push(...literals.map((s) => s.slice(1, -1)).filter((s) => !s.startsWith('node:') && !/^https?:\/\//.test(s) && !s.startsWith('/')));
  const jsxText = source.match(/>([^<>{}\n]{3,})</g) ?? [];
  out.push(...jsxText.map((s) => s.slice(1, -1)));
  // Bare JSX labels sitting on their own line, e.g. "  Certify Inspection Node"
  const bareLines = source.match(/^\s{6,}([A-Z][A-Za-z0-9 &·’'.,:/()–—-]{3,})$/gm) ?? [];
  out.push(...bareLines.map((s) => s.trim()));
  return out;
}

const FILES = sources('src');

// Jargon glued onto ordinary school nouns.
// "Altraware" was on this list when it appeared as decorative filler. It is now
// the studio's actual name in the credit and the legal pages, which is exactly
// where a company name belongs — so it is no longer treated as jargon.
const JARGON = /\b(node|nodes|sovereign|synthesis|omnichannel)\b/i;
// Capabilities the code does not implement.
const FALSE_CLAIMS: Array<[RegExp, string]> = [
  [/immutable audit/i, 'there is no append-only audit log'],
  [/audit trail/i, 'no audit-log writer exists'],
  [/national gateways?/i, 'alerts go through an optional n8n webhook'],
  [/SMS (alerts? )?(sent|via Beem)/i, 'no SMS provider is implemented'],
  [/Every export (written )?to the log/i, 'exports are not logged'],
  [/Male Node|Female Node|Boarder Node/i, 'gender and status are not "nodes"'],
];

check('no techno-jargon in user-facing strings', () => {
  const hits: string[] = [];
  for (const file of FILES) {
    for (const text of displayStrings(readFileSync(file, 'utf8'))) {
      if (JARGON.test(text)) hits.push(`${file}: ${text.slice(0, 90)}`);
    }
  }
  assert.deepEqual(hits, [], `jargon returned:\n${hits.join('\n')}`);
});

check('no claims about unimplemented capabilities', () => {
  const hits: string[] = [];
  for (const file of FILES) {
    const source = readFileSync(file, 'utf8');
    for (const text of displayStrings(source)) {
      for (const [pattern, why] of FALSE_CLAIMS) {
        if (pattern.test(text)) hits.push(`${file}: "${text.slice(0, 80)}" — ${why}`);
      }
    }
  }
  assert.deepEqual(hits, [], `unsupported claims:\n${hits.join('\n')}`);
});

check('gender and boarding options read as plain words', () => {
  const source = readFileSync('src/app/dashboard/students/page.tsx', 'utf8');
  assert.match(source, /value="Male">Male</);
  assert.match(source, /value="Female">Female</);
  assert.match(source, /value="Boarder">Boarder</);
});

check('absence alerts report what the webhook actually did', () => {
  const source = readFileSync('src/app/dashboard/attendance/page.tsx', 'utf8');
  assert.match(source, /const forwarded = await triggerN8nWebhook/);
  assert.match(source, /Automation is off, so no alert was sent/);
});

check('hostel inspections are confirmed, never pre-verified', () => {
  const source = readFileSync('src/app/dashboard/hostel/page.tsx', 'utf8');
  assert.match(source, /Not checked/);
  assert.match(source, /Record inspection/);
  assert.ok(!/status: "Verified"|status: "Stable"|status: "Normal"/.test(source));
});

console.log(failures === 0 ? '\nCOPY GUARD PASSED' : `\n${failures} COPY GUARD FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
