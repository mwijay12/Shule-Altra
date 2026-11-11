/**
 * @fileOverview Seed a real Firestore project with the demo school.
 *
 *   npm run firebase:seed -- --dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *     npm run firebase:seed -- --project studio-2181801796-1fa72 --confirm
 *
 * The dataset builder is shared with the offline demo, so what lands in
 * Firestore is exactly what the demo shows — same 150 O-level learners, same
 * grades, same fee ledger. Two things have to be translated on the way out:
 * the demo's lightweight Timestamp becomes a real Firestore Timestamp, and the
 * demo's sentinel objects become Admin SDK FieldValue sentinels.
 *
 * Dry run needs no credentials and writes nothing; it is safe to run anywhere
 * and is what CI checks.
 */

import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type WriteBatch } from 'firebase-admin/firestore';
import { Timestamp, FieldValue, Firestore } from '@google-cloud/firestore';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildDemoDataset, DEMO_SCHOOL_ID, DEMO_SCHEMA_VERSION } from '@/lib/demo/seed-data';
import { DemoTimestamp } from '@/lib/demo/timestamp';
import { DEFAULT_PALETTE, DEFAULT_APP_FONT } from '@/lib/theme/palettes';
import { DEFAULT_LANDING_CONTENT } from '@/lib/landing/content';

const DEFAULT_PROJECT = 'studio-2181801796-1fa72';
const CHUNK = 400; // Firestore caps a batch at 500 writes.

type Args = { dryRun: boolean; confirm: boolean; project: string; school: string };

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, confirm: false, project: DEFAULT_PROJECT, school: DEMO_SCHOOL_ID };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--confirm') args.confirm = true;
    else if (token === '--project') args.project = argv[++i] ?? args.project;
    else if (token === '--school') args.school = argv[++i] ?? args.school;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

const conversionStats = { timestamps: 0, sentinels: 0 };

/** Translate demo values into something the Admin SDK will accept. */
function convert(value: any): any {
  if (value instanceof DemoTimestamp) {
    conversionStats.timestamps += 1;
    return Timestamp.fromMillis(value.toMillis());
  }
  if (value instanceof Date) {
    conversionStats.timestamps += 1;
    return Timestamp.fromDate(value);
  }
  if (Array.isArray(value)) {
    return value.map(convert);
  }
  if (value && typeof value === 'object') {
    // Demo sentinels: { __type: 'serverTimestamp' } and friends.
    if (typeof value.__type === 'string') {
      conversionStats.sentinels += 1;
      switch (value.__type) {
        case 'serverTimestamp':
          return FieldValue.serverTimestamp();
        case 'increment':
          return FieldValue.increment(value.value ?? 0);
        case 'arrayUnion':
          return FieldValue.arrayUnion(...(value.values ?? []).map(convert));
        case 'deleteField':
          return FieldValue.delete();
        case 'timestamp':
          return Timestamp.fromMillis(value.ms ?? 0);
        default:
          throw new Error(`Unsupported demo sentinel: ${value.__type}`);
      }
    }
    const out: Record<string, any> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (nested === undefined) continue; // Firestore rejects undefined.
      out[key] = convert(nested);
    }
    return out;
  }
  return value;
}

/** A document path must be an even number of non-empty segments under the school. */
function assertPath(path: string, school: string): void {
  const segments = path.split('/');
  if (segments.length % 2 !== 0) throw new Error(`Not a document path: ${path}`);
  if (segments.some((segment) => segment.length === 0)) throw new Error(`Empty segment in: ${path}`);
  if (segments[0] !== 'schools' || segments[1] !== school) {
    throw new Error(`Path escapes the target school (${school}): ${path}`);
  }
}

function collectionOf(path: string): string {
  const segments = path.split('/');
  return segments.slice(2, -1).join('/') || '(root)';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dataset = buildDemoDataset() as Record<string, any>;

  // Identity and branding are seeded too, so letterheads and the theme are right
  // from the first sign-in rather than falling back to placeholders.
  const prefix = `schools/${args.school}`;
  const entries: Array<[string, any]> = Object.entries(dataset).map(([path, data]) => {
    // The dataset is built for DEMO_SCHOOL_ID; retarget when --school is passed.
    const retargeted = args.school === DEMO_SCHOOL_ID ? path : path.replace(`schools/${DEMO_SCHOOL_ID}`, prefix);
    return [retargeted, data];
  });

  const identity = dataset[`schools/${DEMO_SCHOOL_ID}/config/identity`];
  if (!identity) {
    entries.push([
      `${prefix}/config/identity`,
      {
        name: 'MWALIMU NYERERE SECONDARY SCHOOL',
        shortName: 'Mwalimu Nyerere',
        motto: 'Elimu Bora, Maisha Bora',
        address: 'Plot 45, Ali Hassan Mwinyi Road',
        district: 'Kinondoni',
        region: 'Dar es Salaam',
        contactEmail: 'info@mnyerere.ac.tz',
        contactPhone: '+255 754 123 456',
        centerId: '0412',
        logo: '',
        tiers: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
      },
    ]);
  }
  entries.push([
    `${prefix}/config/branding`,
    { paletteId: DEFAULT_PALETTE, fontId: DEFAULT_APP_FONT, updatedBy: 'firebase:seed' },
  ]);
  entries.push([
    `${prefix}/config/landing`,
    { ...DEFAULT_LANDING_CONTENT, updatedBy: 'firebase:seed' },
  ]);

  for (const [path] of entries) assertPath(path, args.school);

  // ── report ───────────────────────────────────────────────────────────────
  const byCollection = new Map<string, number>();
  for (const path of new Map(entries).keys()) {
    const key = collectionOf(path);
    byCollection.set(key, (byCollection.get(key) ?? 0) + 1);
  }

  console.log(`\nShule Altra → Firestore seed`);
  console.log(`  project        ${args.project}`);
  console.log(`  school         ${args.school}`);
  console.log(`  schema version ${DEMO_SCHEMA_VERSION}`);
  console.log(`  documents      ${new Map(entries).size}`);
  console.log(`  batches        ${Math.ceil(new Map(entries).size / CHUNK)} (max ${CHUNK} writes each)\n`);
  for (const [collection, count] of [...byCollection.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(5)}  ${collection}`);
  }

  // Collapse duplicate paths (config docs are supplied both by the dataset and
  // explicitly above) so one document is never written twice in one run.
  const unique = [...new Map(entries).entries()];
  if (unique.length !== entries.length) {
    console.log(`\n  merged ${entries.length - unique.length} duplicate config path(s)`);
  }

  // Prove the conversion works before anyone points this at a live project.
  const converted = unique.map(([path, data]) => [path, convert(data)] as [string, any]);
  console.log(
    `  converted ${converted.length} documents · ${conversionStats.timestamps} timestamps · ${conversionStats.sentinels} sentinels`
  );
  if (conversionStats.timestamps === 0) {
    throw new Error('No timestamps were converted — the dataset shape changed; check convert().');
  }

  if (args.dryRun) {
    console.log('\nDRY RUN — nothing was written. Drop --dry-run and add --confirm to seed.\n');
    return;
  }

  if (!args.confirm) {
    console.error('\nRefusing to write without --confirm. This overwrites documents in the target school.\n');
    process.exit(1);
  }

  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let db: any;
  if (credentialPath) {
    if (!existsSync(credentialPath)) {
      throw new Error(`GOOGLE_APPLICATION_CREDENTIALS points at a missing file: ${credentialPath}`);
    }
    const app: App = initializeApp({ credential: cert(JSON.parse(readFileSync(credentialPath, 'utf8'))), projectId: args.project });
    db = getFirestore(app);
  } else {
    // Try loading Firebase CLI token first
    const homeConfig = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
    if (existsSync(homeConfig)) {
      try {
        const configJson = JSON.parse(readFileSync(homeConfig, 'utf8'));
        const accessToken = configJson?.tokens?.access_token;
        if (accessToken) {
          const { OAuth2Client } = await import('google-auth-library');
          const client = new OAuth2Client();
          client.setCredentials({ access_token: accessToken });
          db = new Firestore({ projectId: args.project, authClient: client });
          console.log(`\n  Authenticated via Firebase CLI session (${configJson.user?.email || 'CLI user'}).`);
        }
      } catch (e) {
        console.warn('Could not read firebase-tools.json:', e);
      }
    }
    if (!db) {
      // Application Default Credentials (gcloud auth application-default login).
      const app: App = initializeApp({ projectId: args.project });
      db = getFirestore(app);
    }
  }

  console.log(`\nWriting to ${args.project}…`);
  let written = 0;
  for (let index = 0; index < converted.length; index += CHUNK) {
    const chunk = converted.slice(index, index + CHUNK);
    const batch: WriteBatch = db.batch();
    for (const [path, data] of chunk) batch.set(db.doc(path), data, { merge: true });
    await batch.commit();
    written += chunk.length;
    process.stdout.write(`  ${written}/${converted.length}\r`);
  }

  console.log(`\n\nSeeded ${written} documents into ${args.project} / schools/${args.school}.`);
  console.log('Next: deploy the rules, then sign in with Google and open the Theme Studio.\n');
}

main().catch((error) => {
  console.error('\nSeed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
