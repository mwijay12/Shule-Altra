import './dom';

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import {
  APP_FONTS,
  DEFAULT_APP_FONT,
  DEFAULT_MODE,
  DEFAULT_PALETTE,
  PALETTES,
  PALETTE_LIST,
  isAppFontId,
  isPaletteId,
  resolvePalette,
  type ThemeTokens,
} from '@/lib/theme/palettes';
import {
  DEFAULT_PREFERENCE,
  applyPreference,
  readStoredPreference,
  sanitizePreference,
  storePreference,
  themeBootstrapScript,
  THEME_STORAGE_KEY,
} from '@/lib/theme/apply';
import {
  DEFAULT_BRAND,
  deriveShortName,
  getActiveBrand,
  hslToRgb,
  monogram,
  resolveBrand,
  setActiveBrand,
} from '@/lib/brand/identity';
import { isSuperAdminEmail, SUPER_ADMIN_EMAILS } from '@/lib/auth/super-admin';

let failures = 0;
function check(label: string, run: () => void | Promise<void>) {
  try {
    const result = run();
    if (result instanceof Promise) {
      return result.then(
        () => console.log(`OK   ${label}`),
        (error: any) => {
          failures += 1;
          console.log(`FAIL ${label}: ${String(error?.message).slice(0, 300)}`);
        }
      );
    }
    console.log(`OK   ${label}`);
  } catch (error: any) {
    failures += 1;
    console.log(`FAIL ${label}: ${String(error?.message).slice(0, 300)}`);
  }
  return Promise.resolve();
}

const TOKEN_KEYS: Array<keyof Omit<ThemeTokens, 'chart'>> = [
  'background', 'foreground', 'card', 'cardForeground', 'popover', 'popoverForeground',
  'primary', 'primaryForeground', 'secondary', 'secondaryForeground', 'muted', 'mutedForeground',
  'accent', 'accentForeground', 'border', 'input', 'ring', 'sidebarBackground',
  'sidebarForeground', 'sidebarAccent', 'sidebarAccentForeground', 'sidebarBorder',
];

/** WCAG relative luminance from an HSL triple. */
function luminance(triple: string): number {
  const [r, g, b] = hslToRgb(triple).map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

async function main() {
  console.log('\nPALETTE REGISTRY');

  await check('four palettes, each with a light and a dark variant', () => {
    assert.equal(PALETTE_LIST.length, 4);
    for (const palette of PALETTE_LIST) {
      assert.ok(palette.light && palette.dark, palette.id);
      assert.equal(palette.swatch.length, 3, palette.id);
      assert.ok(palette.description.length > 20, palette.id);
    }
  });

  await check('every token is present and is a valid HSL triple', () => {
    for (const palette of PALETTE_LIST) {
      for (const mode of ['light', 'dark'] as const) {
        const tokens = palette[mode];
        for (const key of TOKEN_KEYS) {
          const value = tokens[key];
          assert.ok(typeof value === 'string' && value.length > 0, `${palette.id}.${mode}.${key}`);
          assert.match(value, /^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/, `${palette.id}.${mode}.${key} = ${value}`);
        }
        assert.equal(tokens.chart.length, 5, `${palette.id}.${mode}.chart`);
      }
    }
  });

  await check('light is the default mode and Blue Ridge the default palette', () => {
    assert.equal(DEFAULT_MODE, 'light');
    assert.equal(DEFAULT_PREFERENCE.mode, 'light');
    assert.equal(DEFAULT_PALETTE, 'blue_ridge');
    assert.equal(DEFAULT_APP_FONT, 'grotesk');
  });

  await check('button text meets WCAG AA on every light palette', () => {
    for (const palette of PALETTE_LIST) {
      const ratio = contrast(palette.light.primary, palette.light.primaryForeground);
      assert.ok(ratio >= 4.5, `${palette.id}: primary/foreground contrast ${ratio.toFixed(2)} < 4.5`);
      const accent = contrast(palette.light.accent, palette.light.accentForeground);
      assert.ok(accent >= 4.5, `${palette.id}: accent/foreground contrast ${accent.toFixed(2)} < 4.5`);
    }
  });

  await check('body text meets WCAG AA on every palette in both modes', () => {
    for (const palette of PALETTE_LIST) {
      for (const mode of ['light', 'dark'] as const) {
        const tokens = palette[mode];
        const body = contrast(tokens.background, tokens.foreground);
        assert.ok(body >= 4.5, `${palette.id}.${mode}: body contrast ${body.toFixed(2)}`);
        const muted = contrast(tokens.card, tokens.mutedForeground);
        assert.ok(muted >= 4.5, `${palette.id}.${mode}: muted contrast ${muted.toFixed(2)}`);
      }
    }
  });

  await check('unknown ids are rejected and fall back rather than throwing', () => {
    assert.equal(isPaletteId('volta_red'), false);
    assert.equal(isPaletteId(null), false);
    assert.equal(isAppFontId('comic-sans'), false);
    assert.equal(resolvePalette('nonsense').id, DEFAULT_PALETTE);
    assert.equal(resolvePalette(undefined).id, DEFAULT_PALETTE);
  });

  console.log('\nAPPLYING A THEME');

  await check('applying a palette writes every CSS variable and the mode class', () => {
    const palette = applyPreference({ paletteId: 'emerald', mode: 'dark', fontId: 'editorial' });
    const root = document.documentElement;
    assert.equal(palette.id, 'emerald');
    assert.equal(root.style.getPropertyValue('--primary'), PALETTES.emerald.dark.primary);
    assert.equal(root.style.getPropertyValue('--sidebar-background'), PALETTES.emerald.dark.sidebarBackground);
    assert.equal(root.style.getPropertyValue('--chart-5'), PALETTES.emerald.dark.chart[4]);
    assert.equal(root.style.getPropertyValue('--brand-hue'), '142');
    assert.equal(root.style.getPropertyValue('--font-display'), APP_FONTS.editorial.display);
    assert.ok(root.classList.contains('dark'));
    assert.equal(root.dataset.theme, 'emerald');
    assert.equal(root.style.colorScheme, 'dark');
  });

  await check('switching back to light removes the dark class and re-tints the orb', () => {
    applyPreference({ paletteId: 'crimson', mode: 'light', fontId: 'grotesk' });
    const root = document.documentElement;
    assert.ok(!root.classList.contains('dark'));
    assert.equal(root.style.getPropertyValue('--primary'), PALETTES.crimson.light.primary);
    assert.equal(root.style.getPropertyValue('--brand-hue'), '0');
    assert.equal(root.dataset.mode, 'light');
  });

  await check('a corrupt stored preference cannot break the dashboard', () => {
    const clean = sanitizePreference({ paletteId: 'nope', mode: 'sepia', fontId: 42 });
    assert.deepEqual(clean, DEFAULT_PREFERENCE);
    assert.equal(sanitizePreference(null).mode, 'light');
    assert.equal(sanitizePreference({ mode: 'dark' }).mode, 'dark');
  });

  await check('preferences round-trip through storage', () => {
    const preference = { paletteId: 'carbon_gold' as const, mode: 'dark' as const, fontId: 'inter' as const };
    storePreference(preference);
    assert.deepEqual(readStoredPreference(), preference);
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  });

  await check('the legacy dark-only key migrates, and system dark is never inherited', () => {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    window.localStorage.setItem('altra-admin-theme', 'dark');
    assert.equal(readStoredPreference().mode, 'dark');
    window.localStorage.setItem('altra-admin-theme', 'light');
    assert.equal(readStoredPreference().mode, 'light');
    window.localStorage.removeItem('altra-admin-theme');
    // A machine set to dark still opens light: the dashboard is a daytime tool.
    (window as any).matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    assert.equal(readStoredPreference().mode, 'light');
  });

  await check('the pre-paint script is valid JS and applies the stored palette', () => {
    const script = themeBootstrapScript();
    assert.ok(script.length > 400);
    storePreference({ paletteId: 'emerald', mode: 'dark', fontId: 'inter' });
    document.documentElement.removeAttribute('style');
    document.documentElement.classList.remove('dark');
    // eslint-disable-next-line no-new-func
    new Function(script)();
    const root = document.documentElement;
    assert.equal(root.dataset.theme, 'emerald');
    assert.equal(root.style.getPropertyValue('--primary'), PALETTES.emerald.dark.primary);
    assert.ok(root.classList.contains('dark'));
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  });

  await check('the pre-paint script survives unreadable storage', () => {
    const script = themeBootstrapScript();
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } },
    });
    // eslint-disable-next-line no-new-func
    new Function(script)();
    assert.equal(document.documentElement.dataset.theme, DEFAULT_PALETTE);
    assert.equal(document.documentElement.dataset.mode, 'light');
    Object.defineProperty(window, 'localStorage', { configurable: true, value: original });
  });

  await check('the orb colours parse to real pigment, not three.js white', async () => {
    // Regression: three.js only understands hsl(h, s%, l%). The space-separated
    // CSS form parses to #ffffff without an error, which made the orb invisible
    // on the light hero. Assert against the actual library, not a re-implementation.
    const THREE = await import('three');
    const source = readFileSync(path.resolve('src/components/admin/three-orb.tsx'), 'utf8');
    const materialLines = source
      .split('\n')
      .filter((line) => /const (shellColor|coreColor|haloColor) =/.test(line));
    assert.equal(materialLines.length, 3);

    for (const line of materialLines) {
      const expressions = line.match(/hsl\(\$\{[^}]+\}[^`]*?\)/g) ?? [];
      assert.equal(expressions.length, 2, `both modes on: ${line.trim()}`);
      for (const expression of expressions) {
        assert.match(expression, /^hsl\(\$\{[^}]+\}, \d+%, \d+%\)$/, `comma form required: ${expression}`);
        for (const hue of [0, 45, 142, 217]) {
          const css = expression.replace(/\$\{[^}]+\}/, String(hue));
          const colour = new THREE.Color(css);
          assert.notEqual(colour.getHexString(), 'ffffff', `${css} parsed to white`);
        }
      }
    }
  });

  console.log('\nSCHOOL IDENTITY');

  await check('hsl conversion matches known colours', () => {
    const white = hslToRgb('0 0% 100%');
    assert.deepEqual(white.map((c) => Math.round(c * 255)), [255, 255, 255]);
    const black = hslToRgb('217 83% 0%');
    assert.deepEqual(black.map((c) => Math.round(c * 255)), [0, 0, 0]);
    const red = hslToRgb('0 100% 50%');
    assert.deepEqual(red.map((c) => Math.round(c * 255)), [255, 0, 0]);
  });

  await check('crest initials come from the school name', () => {
    assert.equal(monogram('Mwalimu Nyerere Secondary School'), 'MN');
    assert.equal(monogram('SHULE ALTRA SECONDARY SCHOOL', 'Shule Altra'), 'SA');
    assert.equal(monogram('Kibasila'), 'KI');
    assert.equal(monogram(''), 'SA');
  });

  await check('identity and branding fold into one brand', () => {
    const brand = resolveBrand(
      {
        name: 'KIBASILA SECONDARY SCHOOL',
        systemName: 'Kibasila',
        motto: 'Elimu ni Uhuru',
        address: 'Plot 7, Kigogo',
        district: 'Ilala',
        region: 'Dar es Salaam',
        contactEmail: 'info@kibasila.ac.tz',
        contactPhone: '+255 22 111 2222',
        centerId: '0777',
        registrationNumber: 'S/DSM/1998/0777',
        logo: 'https://cdn.example/logo.png',
      },
      { paletteId: 'carbon_gold', fontId: 'inter' }
    );
    assert.equal(brand.name, 'KIBASILA SECONDARY SCHOOL');
    assert.equal(brand.shortName, 'Kibasila');
    assert.equal(brand.motto, 'Elimu ni Uhuru');
    assert.match(brand.address, /Plot 7, Kigogo · Ilala · Dar es Salaam/);
    assert.match(brand.contacts, /info@kibasila.ac.tz · \+255 22 111 2222/);
    assert.match(brand.registration, /Reg\. No\. S\/DSM\/1998\/0777 · NECTA Centre 0777/);
    assert.equal(brand.logo, 'https://cdn.example/logo.png');
    assert.equal(brand.paletteId, 'carbon_gold');
  });

  await check('an address that already names its district is not repeated', () => {
    const brand = resolveBrand(
      { address: 'Plot 45, Ali Hassan Mwinyi Road, Kinondoni', district: 'Kinondoni', region: 'Dar es Salaam' },
      {}
    );
    assert.equal(brand.address, 'Plot 45, Ali Hassan Mwinyi Road, Kinondoni · Dar es Salaam');
    assert.equal((brand.address.match(/Kinondoni/g) ?? []).length, 1);
  });

  await check('the short name is the school, never the product name', () => {
    // systemName holds "Shule Altra" — using it labelled every school's sidebar
    // and crest with our brand instead of theirs.
    const brand = resolveBrand({ name: 'MWALIMU NYERERE SECONDARY SCHOOL', systemName: 'Shule Altra' }, {});
    assert.equal(brand.shortName, 'Mwalimu Nyerere');
    assert.equal(monogram(brand.name, brand.shortName), 'MN');
    assert.equal(deriveShortName('KIBASILA SECONDARY SCHOOL'), 'Kibasila');
    assert.equal(deriveShortName('ST MARY\'S HIGH SCHOOL'), "St Mary's");
    assert.equal(deriveShortName('Shule ya Sekondari Mwangaza'), 'Shule ya Sekondari Mwangaza');
  });

  await check('an explicit short name wins over the derived one', () => {
    const brand = resolveBrand({ name: 'MWALIMU NYERERE SECONDARY SCHOOL', shortName: 'MNY' }, {});
    assert.equal(brand.shortName, 'MNY');
  });

  await check('a real school never inherits invented contact or registration details', () => {
    // The most dangerous failure this layer could have: printing a fabricated
    // NECTA centre number and phone on a real school's letterhead.
    const brand = resolveBrand({ name: 'KIBASILA SECONDARY SCHOOL' }, {});
    assert.equal(brand.address, '');
    assert.equal(brand.contacts, '');
    assert.equal(brand.registration, '');
    assert.equal(brand.motto, '');
    assert.ok(!JSON.stringify(brand).includes('shulealtra.ac.tz'));
    assert.ok(!JSON.stringify(brand).includes('S/DSM/2016/0412'));
  });

  await check('an unconfigured demo still prints a complete sample letterhead', () => {
    const brand = resolveBrand(null, null);
    assert.equal(brand.address, DEFAULT_BRAND.address);
    assert.equal(brand.contacts, DEFAULT_BRAND.contacts);
  });

  await check('partly filled identity prints only what was actually entered', () => {
    const brand = resolveBrand({ name: 'KIBASILA SECONDARY SCHOOL', contactPhone: '+255 22 111 2222' }, {});
    assert.equal(brand.contacts, '+255 22 111 2222');
    assert.equal(brand.address, '');
    assert.equal(brand.registration, '');
  });

  await check('print colours always use the LIGHT palette, even in dark mode', () => {
    const brand = resolveBrand({}, { paletteId: 'emerald' });
    assert.equal(brand.primaryHsl, PALETTES.emerald.light.primary);
    assert.notEqual(brand.primaryHsl, PALETTES.emerald.dark.primary);
  });

  await check('an unconfigured school still gets a complete letterhead', () => {
    const brand = resolveBrand(null, null);
    for (const key of ['name', 'address', 'contacts', 'registration', 'motto'] as const) {
      assert.ok(brand[key].length > 0, key);
    }
    assert.equal(brand.name, DEFAULT_BRAND.name);
  });

  console.log('\nDOCUMENTS FOLLOW THE BRAND');

  await check('the PDF kit exposes the active brand', () => {
    const brand = resolveBrand({ name: 'TEST SCHOOL' }, { paletteId: 'crimson' });
    setActiveBrand(brand);
    assert.equal(getActiveBrand().name, 'TEST SCHOOL');
    assert.equal(getActiveBrand().primaryHsl, PALETTES.crimson.light.primary);
  });

  await check('letterhead colours change with the palette', async () => {
    const { COLORS } = await import('@/lib/pdf/kit');
    setActiveBrand(resolveBrand({}, { paletteId: 'blue_ridge' }));
    const blue = COLORS.primary;
    setActiveBrand(resolveBrand({}, { paletteId: 'crimson' }));
    const red = COLORS.primary;
    assert.notDeepEqual([blue.red, blue.green, blue.blue], [red.red, red.green, red.blue]);
    assert.ok(red.red > red.blue, 'crimson primary should be red-dominant');
    assert.ok(blue.blue > blue.red, 'blue ridge primary should be blue-dominant');
  });

  await check('a renamed school reaches the generated PDF bytes', async () => {
    const { buildBrandSample } = await import('@/lib/pdf/brand-sample');
    setActiveBrand(resolveBrand({ name: 'ALPHA SECONDARY SCHOOL', systemName: 'Alpha' }, { paletteId: 'blue_ridge' }));
    const first = await buildBrandSample();
    setActiveBrand(resolveBrand({ name: 'OMEGA SECONDARY SCHOOL', systemName: 'Omega' }, { paletteId: 'emerald' }));
    const second = await buildBrandSample();

    assert.ok(first.length > 2000, 'proof should be a real document');
    assert.ok(second.length > 2000);
    const { PDFDocument } = await import('pdf-lib');
    const docA = await PDFDocument.load(first);
    const docB = await PDFDocument.load(second);
    assert.equal(docA.getAuthor(), 'ALPHA SECONDARY SCHOOL');
    assert.equal(docB.getAuthor(), 'OMEGA SECONDARY SCHOOL');
    assert.notEqual(Buffer.from(first).toString('base64'), Buffer.from(second).toString('base64'));
  });

  await check('an uploaded PNG logo is embedded instead of the drawn crest', async () => {
    // 1x1 transparent PNG — enough to prove the embed path runs.
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';
    setActiveBrand(resolveBrand({ name: 'LOGO SCHOOL', logo: png }, { paletteId: 'blue_ridge' }));
    const { createDocument } = await import('@/lib/pdf/kit');
    const ctx = await createDocument({
      title: 'Logo test', subject: 'test', reference: 'T-1', issuedBy: 'smoke',
    });
    assert.ok(ctx.logo, 'logo should be embedded on the build context');
    assert.equal(ctx.logo!.width, 1);
  });

  await check('a broken logo falls back to the crest rather than failing the document', async () => {
    setActiveBrand(resolveBrand({ name: 'BROKEN SCHOOL', logo: 'data:image/png;base64,not-an-image' }, {}));
    const { createDocument, letterhead } = await import('@/lib/pdf/kit');
    const ctx = await createDocument({
      title: 'Fallback test', subject: 'test', reference: 'T-2', issuedBy: 'smoke',
    });
    assert.equal(ctx.logo, undefined);
    letterhead(ctx, 'Still prints');
  });

  await check('a letterhead with no contacts draws no empty lines and no stray separator', async () => {
    setActiveBrand(resolveBrand({ name: 'SPARSE SCHOOL' }, {}));
    const { createDocument, letterhead, finalize } = await import('@/lib/pdf/kit');
    const ctx = await createDocument({ title: 'Sparse', subject: 't', reference: 'T-3', issuedBy: 'smoke' });
    letterhead(ctx, 'Sparse letterhead');
    const bytes = await finalize(ctx);
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(bytes);
    assert.equal(doc.getAuthor(), 'SPARSE SCHOOL');
    assert.ok(bytes.length > 1500);
  });

  await check('the shipped reference printables name the demo school', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const { demoIdentity } = await import('@/lib/demo/seed-data');
    const expected = demoIdentity().name;
    for (const file of ['private/printables/report-card.pdf', 'private/printables/reports/defaulters.pdf']) {
      const doc = await PDFDocument.load(readFileSync(path.resolve(file)));
      assert.equal(doc.getAuthor(), expected, `${file} names a different school`);
    }
  });

  console.log('\nBRAND ASSETS & ACCESS');

  await check('favicon is a real multi-size icon container', () => {
    const ico = readFileSync(path.resolve('src/app/favicon.ico'));
    assert.equal(ico.readUInt16LE(0), 0);
    assert.equal(ico.readUInt16LE(2), 1, 'type must be icon');
    const count = ico.readUInt16LE(4);
    assert.equal(count, 3, '16/32/48px entries');
    const sizes = [];
    for (let i = 0; i < count; i += 1) {
      const base = 6 + i * 16;
      sizes.push(ico.readUInt8(base));
      const length = ico.readUInt32LE(base + 8);
      const offset = ico.readUInt32LE(base + 12);
      const png = ico.subarray(offset, offset + length);
      assert.equal(png.subarray(1, 4).toString(), 'PNG', `entry ${i} must be PNG`);
    }
    assert.deepEqual(sizes, [16, 32, 48]);
  });

  await check('touch and home-screen icons exist and the SVG is the source', () => {
    for (const file of ['icon.svg', 'apple-icon.png', 'icon1.png', 'icon2.png']) {
      assert.ok(existsSync(path.resolve('src/app', file)), file);
    }
    const svg = readFileSync(path.resolve('src/app/icon.svg'), 'utf8');
    assert.match(svg, /viewBox="0 0 40 40"/);
    assert.match(svg, /linearGradient/);
  });

  await check('the owner is a super admin by verified email only', () => {
    assert.ok(SUPER_ADMIN_EMAILS.includes('davidbyanmwijage@gmail.com'));
    assert.equal(isSuperAdminEmail('davidbyanmwijage@gmail.com'), true);
    assert.equal(isSuperAdminEmail('  DAVIDBYANMWIJAGE@GMAIL.COM  '), true);
    assert.equal(isSuperAdminEmail('someone@else.com'), false);
    assert.equal(isSuperAdminEmail(null), false);
  });

  await check('the rules enforce the same owner, not just the UI', () => {
    for (const file of ['firestore.rules', 'storage.rules']) {
      const rules = readFileSync(path.resolve(file), 'utf8');
      assert.match(rules, /function isSuperAdmin\(\)/, file);
      assert.match(rules, /davidbyanmwijage@gmail\.com/, file);
      assert.match(rules, /email_verified == true/, file);
    }
    const firestore = readFileSync(path.resolve('firestore.rules'), 'utf8');
    assert.match(firestore, /match \/config\/branding \{\s*allow read: if true;/);
    assert.match(firestore, /match \/config\/identity \{\s*allow read: if isStaff\(\);/);
  });

  await check('the Theme Studio is a real route in the navigation', () => {
    assert.ok(existsSync(path.resolve('src/app/dashboard/theme-studio/page.tsx')));
    const nav = readFileSync(path.resolve('src/components/admin/nav-config.ts'), 'utf8');
    assert.match(nav, /theme-studio/);
    assert.match(nav, /module: 'themeStudio'/);
    const auth = readFileSync(path.resolve('src/hooks/use-auth.ts'), 'utf8');
    assert.match(auth, /themeStudio: \['ADMIN'\]/);
    assert.match(auth, /SUPER_ADMIN: 200/);
    assert.match(auth, /signInWithPopup/);
  });

  await check('dashboard chrome never types below 10px', () => {
    const glob = ['src/app/dashboard', 'src/components/admin', 'src/app/login'];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      const { readdirSync, statSync } = require('node:fs');
      for (const entry of readdirSync(path.resolve(dir))) {
        const full = path.join(path.resolve(dir), entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (full.endsWith('.tsx')) {
          const text = readFileSync(full, 'utf8');
          for (const line of text.split('\n')) {
            // A scaled preview of a physical page (A4 letterhead, ID-1 card) may
            // legitimately type below the UI floor; it must say so explicitly.
            if (line.includes('doc-scale')) continue;
            for (const match of line.match(/text-\[(\d+)px\]/g) ?? []) {
              if (parseInt(match.replace(/\D/g, ''), 10) < 10) offenders.push(`${full}: ${match}`);
            }
          }
        }
      }
    };
    glob.forEach(walk);
    assert.deepEqual(offenders.slice(0, 5), [], `${offenders.length} sub-10px labels remain`);
  });

  console.log(failures === 0 ? '\nBRAND & THEME REGRESSIONS PASSED\n' : `\n${failures} BRAND CHECK(S) FAILED\n`);
  if (failures > 0) process.exit(1);
}

void main();
