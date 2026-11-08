import assert from 'node:assert/strict';
import {
  DEFAULT_LANDING_CONTENT,
  LANDING_FONTS,
  LANDING_IMAGE_SLOTS,
  mergeLandingContent,
} from '@/lib/landing/content';
import { DEMO_MEDIA_SCHEME, demoMediaKey, demoMediaRef, isDemoMediaRef, landingMediaKey } from '@/lib/demo/media-store';

let failures = 0;
function check(label: string, run: () => void) {
  try { run(); console.log(`OK   ${label}`); }
  catch (error: any) { failures += 1; console.log(`FAIL ${label}: ${String(error?.message).slice(0, 200)}`); }
}

check('defaults are O-level and use current demo totals', () => {
  assert.equal(DEFAULT_LANDING_CONTENT.stats[0].target, 150);
  assert.equal(DEFAULT_LANDING_CONTENT.stats[1].target, 2932);
  assert.match(DEFAULT_LANDING_CONTENT.hero.kicker, /O-level/);
  assert.match(DEFAULT_LANDING_CONTENT.sections.register.note, /demo school/);
});
check('every photography slot has a default src and alt', () => {
  for (const slot of LANDING_IMAGE_SLOTS) {
    const image = DEFAULT_LANDING_CONTENT.images[slot.id];
    assert.ok(image.src.startsWith('/'), slot.id);
    assert.ok(image.alt.length > 5, slot.id);
  }
});
check('malformed stored content falls back safely', () => {
  const merged = mergeLandingContent({ font: 'comic-sans', hero: { titleLines: 'broken' }, stats: [ { target: 'NaN' } ], images: { heroClassroom: { src: 42 } } });
  assert.equal(merged.font, 'register');
  assert.deepEqual(merged.hero.titleLines, DEFAULT_LANDING_CONTENT.hero.titleLines);
  assert.equal(merged.stats[0].target, 150);
  assert.equal(merged.images.heroClassroom.src, DEFAULT_LANDING_CONTENT.images.heroClassroom.src);
});
check('administrator overrides merge without deleting other slots', () => {
  const merged = mergeLandingContent({
    font: 'gazette',
    schoolName: 'Shule Yetu',
    hero: { titleLines: ['Mambo,', 'mwanafunzi,', 'kila siku.'] },
    images: { heroClassroom: { src: 'https://cdn.example/hero.jpg', alt: 'Our Form 1 class' } },
    sections: { campus: { note: 'Picha za shule yetu.' } },
  });
  assert.equal(merged.font, 'gazette');
  assert.equal(merged.schoolName, 'Shule Yetu');
  assert.deepEqual(merged.hero.titleLines, ['Mambo,', 'mwanafunzi,', 'kila siku.']);
  assert.equal(merged.images.heroClassroom.src, 'https://cdn.example/hero.jpg');
  assert.equal(merged.images.schoolFacade.src, DEFAULT_LANDING_CONTENT.images.schoolFacade.src);
  assert.equal(merged.sections.campus.note, 'Picha za shule yetu.');
  assert.equal(merged.sections.campus.title, DEFAULT_LANDING_CONTENT.sections.campus.title);
});
check('font choices are curated and self-hosted', () => {
  assert.deepEqual(LANDING_FONTS.map((font) => font.id), ['register', 'gazette', 'signal']);
});

check('demo media references round-trip and stay small', () => {
  const key = landingMediaKey('school-001', 'heroClassroom');
  const ref = demoMediaRef(key);
  assert.equal(key, 'landing/school-001/heroClassroom');
  assert.equal(ref, `${DEMO_MEDIA_SCHEME}landing/school-001/heroClassroom`);
  assert.ok(isDemoMediaRef(ref));
  assert.equal(demoMediaKey(ref), key);
  // The whole point: the document must not carry the photograph itself.
  assert.ok(ref.length < 64, `reference is ${ref.length} chars`);
});
check('non-demo sources are never treated as demo media', () => {
  for (const src of ['/landing/hero-classroom.jpg', 'https://cdn.example/a.jpg', 'data:image/jpeg;base64,AAA', '', null, undefined, 42]) {
    assert.equal(isDemoMediaRef(src), false, String(src));
  }
});
check('uploaded photograph references survive the content merge', () => {
  const ref = demoMediaRef(landingMediaKey('school-001', 'library'));
  const merged = mergeLandingContent({ images: { library: { src: ref, alt: 'Our library' } } });
  assert.equal(merged.images.library.src, ref);
  assert.equal(merged.images.library.alt, 'Our library');
  assert.equal(merged.images.dormitory.src, DEFAULT_LANDING_CONTENT.images.dormitory.src);
});
check('document copy does not overstate what is public', () => {
  const note = DEFAULT_LANDING_CONTENT.sections.documents.note;
  assert.match(note, /notice-board/);
  assert.ok(!/or a staff member sits behind/.test(note));
});

console.log(failures === 0 ? '\nLANDING CONTENT REGRESSIONS PASSED' : `\n${failures} LANDING REGRESSION(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
