import './dom';
import React, { act } from 'react';
import assert from 'node:assert/strict';
import { createRoot } from 'react-dom/client';
import { PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { Packer } from 'docx';
import JSZip from 'jszip';
import { doc, setDoc } from 'firebase/firestore';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { ThemeProvider, useTheme } from '@/components/admin/theme-provider';
import { SchoolBrandProvider } from '@/components/admin/brand-provider';
import { getActiveBrand, hslToRgb } from '@/lib/brand/identity';
import { PALETTES } from '@/lib/theme/palettes';
import { buildBrandSample } from '@/lib/pdf/brand-sample';
import { buildReportCardWordDocument, wordBrandColour } from '@/lib/export-utils';
import type { ReportCardData } from '@/types/report';

(globalThis as any).EventTarget = window.EventTarget;
const services = initializeFirebase();
const root = createRoot(document.getElementById('root')!);
let controls: ReturnType<typeof useTheme>;
function Probe() { controls = useTheme(); return null; }
const flush = async () => act(async () => { await new Promise(resolve => setTimeout(resolve, 160)); });
const sample: ReportCardData = {
  school: { name: 'Sample School', logoUrl: null, academicYear: '2026', type: 'secondary' },
  student: { id: 'S1', name: 'Sample Student', class: 'Form 1', type: 'Day' },
  results: [{ subject: 'English', score: 70, grade: 'B', points: 2, remark: 'Good' }],
  summary: { totalPoints: 2, division: 'I', classification: 'Pass', position: 1, totalInClass: 2, averageScore: 70 },
  term: 'Term 1', examType: 'Annual', generatedAt: new Date('2026-01-01'),
};
async function documentStream(bytes: Uint8Array) {
  const pdf = await PDFDocument.load(bytes);
  const page = pdf.getPage(0);
  const contents = page.node.Contents();
  const streams = contents instanceof PDFArray ? contents.asArray().map(ref => pdf.context.lookup(ref)) : [pdf.context.lookup(contents)];
  return streams.map(stream => stream instanceof PDFRawStream ? Buffer.from(decodePDFRawStream(stream).decode()).toString('utf8') : '').join('\n');
}
async function main() {
  await act(async () => root.render(<FirebaseProvider firebaseApp={services.firebaseApp} auth={services.auth} firestore={services.firestore}><ThemeProvider><SchoolBrandProvider><Probe /></SchoolBrandProvider></ThemeProvider></FirebaseProvider>));
  await flush();
  await act(async () => controls.setPaletteId('terracotta'));
  await flush();
  assert.equal(controls.paletteId, 'terracotta');
  assert.equal(getActiveBrand().primaryHsl, PALETTES.terracotta.light.primary, 'preview updates export brand');
  await act(async () => controls.setTheme('dark'));
  await flush();
  assert.equal(getActiveBrand().primaryHsl, PALETTES.terracotta.light.primary, 'dark screens still print light palette');
  for (const palette of Object.values(PALETTES)) {
    await act(async () => controls.setPaletteId(palette.id));
    await flush();
    assert.equal(getActiveBrand().primaryHsl, palette.light.primary);
    const stream = await documentStream(await buildBrandSample());
    const rgb = hslToRgb(palette.light.primary);
    const expected = rgb.map(n => String(n)).join(' ') + ' rg';
    assert.ok(stream.includes(expected), `${palette.id} generated PDF uses its primary`);
    const colour = wordBrandColour();
    const zip = await JSZip.loadAsync(await Packer.toBuffer(await buildReportCardWordDocument(sample)));
    const xml = await zip.file('word/document.xml')!.async('string');
    assert.ok(xml.includes(`w:fill="${colour}"`), `${palette.id} Word table header uses theme`);
    assert.ok(xml.includes(`w:val="${colour}"`), `${palette.id} Word heading uses theme`);
  }
  await act(async () => controls.resetToPublished());
  await flush();
  assert.equal(getActiveBrand().paletteId, controls.published.paletteId, 'reset restores published brand');
  await act(async () => { await setDoc(doc(services.firestore, 'schools', 'school-001', 'config', 'branding'), { paletteId: 'emerald', fontId: 'inter' }); });
  await flush();
  assert.equal(controls.paletteId, 'emerald', 'published palette reaches screen');
  assert.equal(getActiveBrand().primaryHsl, PALETTES.emerald.light.primary, 'published palette reaches documents');
  await act(async () => root.unmount());
  console.log('PRINT THEME REGRESSIONS PASSED');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
