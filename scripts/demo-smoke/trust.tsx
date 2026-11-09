/**
 * @fileOverview Trust-surface regressions.
 *
 * The things a school checks before it signs: who built this, how to reach them,
 * what the legal pages promise, whether money can leave Tanzania, and whether
 * the public site leaks anything it should not.
 *
 * These assertions read the shipped source, so a claim cannot drift away from
 * the code that is supposed to back it.
 */

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

let failures = 0;
async function check(label: string, run: () => void | Promise<void>) {
  try {
    await run();
    console.log(`OK   ${label}`);
  } catch (error: any) {
    failures += 1;
    console.log(`FAIL ${label}: ${String(error?.message).slice(0, 900)}`);
  }
}

const read = (file: string) => readFileSync(path.resolve(file), 'utf8');
/** Prose in JSX wraps across lines, so assertions read it as one line. */
const prose = (file: string) => read(file).replace(/\s+/g, ' ');

async function main() {
  const { COMPANY, PRODUCT, SUPPORT } = await import('@/lib/company');

  console.log('\nCOMPANY IDENTITY');

  await check('the studio is named with reachable, published contacts', () => {
    assert.equal(COMPANY.name, 'Altraware Technology');
    assert.match(COMPANY.website, /^https:\/\/altra\.tanzaniareach\.com\/?$/);
    assert.match(COMPANY.email, /^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    // The published number, in a form a phone can actually dial.
    assert.equal(COMPANY.phoneHref, 'tel:+255792867427');
    assert.equal(COMPANY.whatsapp, 'https://wa.me/255792867427');
    assert.equal(SUPPORT.email, COMPANY.email);
  });

  await check('the product credit names the studio, not an invented vendor', () => {
    assert.equal(PRODUCT.by, COMPANY.name);
    const footer = read('src/app/page.tsx');
    assert.match(footer, /COMPANY\.name/);
    assert.match(footer, /COMPANY\.phoneHref/);
    assert.match(footer, /COMPANY\.whatsapp/);
  });

  await check('every legal page is linked from the landing footer', () => {
    const footer = read('src/app/page.tsx');
    for (const route of ['/legal/privacy', '/legal/terms', '/legal/security', '/legal/dpa']) {
      assert.ok(footer.includes(route), `${route} is not linked`);
      assert.ok(existsSync(path.resolve(`src/app${route}/page.tsx`)), `${route} has no page`);
    }
  });

  console.log('\nLEGAL CLAIMS MATCH THE CODE');

  await check('the security page describes the session the code actually issues', async () => {
    const { SESSION_MAX_AGE, SESSION_ABSOLUTE_MAX_AGE } = await import('@/lib/session');
    const page = prose('src/app/legal/security/page.tsx');
    assert.equal(SESSION_MAX_AGE, 1800);
    assert.match(page, /30 minutes idle/);
    assert.equal(SESSION_ABSOLUTE_MAX_AGE, 8 * 3600);
    assert.match(page, /8 hours absolute/);
    assert.match(page, /HMAC-SHA256/);
  });

  await check('the security page admits what is not built', () => {
    const page = prose('src/app/legal/security/page.tsx');
    assert.match(page, /No formal certification/);
    assert.match(page, /ISO 27001/);
    assert.match(page, /No two-factor enforcement yet/);
    assert.match(page, /No penetration test/);
  });

  await check('the photo policy in the privacy page matches the three real modes', async () => {
    const { photoPolicy } = await import('@/lib/media/policy');
    assert.equal(photoPolicy({}), 'optional');
    assert.equal(photoPolicy({ NEXT_PUBLIC_PHOTO_POLICY: 'none' }), 'none');
    const page = prose('src/app/legal/privacy/page.tsx');
    for (const mode of ['None', 'Optional', 'Required']) {
      assert.ok(page.includes(`<strong>${mode}</strong>`), `${mode} missing from the policy`);
    }
  });

  await check('no page promises an SLA, certification or client we do not have', () => {
    const files = [
      'src/app/legal/privacy/page.tsx',
      'src/app/legal/terms/page.tsx',
      'src/app/legal/security/page.tsx',
      'src/app/legal/dpa/page.tsx',
      'src/lib/company.ts',
    ];
    const forbidden: Array<[RegExp, string]> = [
      [/99\.9\d*%\s*uptime/i, 'no measured uptime figure exists'],
      [/ISO 27001 certified|SOC 2 certified/i, 'we hold no certificate'],
      [/bank[- ]grade| military[- ]grade/i, 'meaningless marketing claim'],
      [/trusted by \d+|over \d+ schools/i, 'no client count has been verified'],
      [/guaranteed (uptime|availability)/i, 'no availability guarantee is offered'],
      [/we (are|hold) (fully )?(GDPR|PDPA) certified/i, 'compliance is not a certificate'],
    ];
    for (const file of files) {
      const source = prose(file);
      for (const [pattern, why] of forbidden) {
        assert.ok(!pattern.test(source), `${file}: ${why}`);
      }
    }
  });

  await check('the privacy page states the demo holds invented data', () => {
    assert.match(prose('src/app/legal/privacy/page.tsx'), /invented data/);
    assert.match(prose('src/app/legal/privacy/page.tsx'), /school is the data controller/);
  });

  console.log('\nINTERNATIONAL READINESS');

  await check('money is not locked to one country', async () => {
    const { currencySpec, activeLocale } = await import('@/lib/money');
    assert.equal(currencySpec({}).code, 'TZS', 'default must stay TZS for existing schools');
    assert.equal(currencySpec({ NEXT_PUBLIC_CURRENCY: 'KES' }).label, 'KSh');
    assert.equal(currencySpec({ NEXT_PUBLIC_CURRENCY: 'usd' }).label, '$');
    assert.equal(currencySpec({ NEXT_PUBLIC_CURRENCY: 'USD' }).decimals, 2);
    assert.equal(currencySpec({ NEXT_PUBLIC_CURRENCY: 'XYZ' }).label, 'XYZ', 'unknown code still usable');
    assert.equal(currencySpec({ NEXT_PUBLIC_CURRENCY: 'nonsense' }).code, 'TZS');
    assert.equal(activeLocale({ NEXT_PUBLIC_LOCALE: 'not-a-locale' }), 'en-TZ');
    assert.equal(activeLocale({ NEXT_PUBLIC_LOCALE: 'en-KE' }), 'en-KE');
  });

  await check('the formatter honours the configured currency', async () => {
    const { formatTZS, formatTZSCompact } = await import('@/lib/finance-engine');
    // Default deployment is unchanged.
    assert.match(formatTZS(1500), /^TZS 1,500$/);
    assert.match(formatTZSCompact(6_094_000), /^TZS 6\.09M$/);
    assert.ok(!formatTZS(Number.NaN).includes('NaN'), 'a bad number must not print NaN');
  });

  await check('terms cover international governing law and data export', () => {
    const terms = prose('src/app/legal/terms/page.tsx');
    assert.match(terms, /United Republic of Tanzania/);
    assert.match(terms, /international client specifies otherwise/);
    assert.match(terms, /never held hostage/);
  });

  console.log('\nPUBLIC SURFACE');

  await check('robots keeps the dashboard and documents out of search', () => {
    const robots = read('src/app/robots.ts');
    for (const blocked of ['/dashboard/', '/api/', '/printables/', '/login']) {
      assert.ok(robots.includes(blocked), `${blocked} must be disallowed`);
    }
    assert.match(robots, /sitemap/);
  });

  await check('the sitemap lists only public pages', () => {
    const sitemap = read('src/app/sitemap.ts');
    assert.ok(!sitemap.includes('/dashboard'), 'dashboard must not be in the sitemap');
    assert.ok(!sitemap.includes('/printables'), 'documents must not be in the sitemap');
    for (const page of ['/legal/privacy', '/legal/terms', '/legal/security']) {
      assert.ok(sitemap.includes(page), `${page} missing`);
    }
  });

  await check('baseline security headers are configured', () => {
    const config = read('next.config.ts');
    for (const header of [
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Strict-Transport-Security',
      'X-Frame-Options',
    ]) {
      assert.ok(config.includes(header), `${header} missing`);
    }
    // Google sign-in opens a popup; plain same-origin would break it.
    assert.match(config, /same-origin-allow-popups/);
  });

  await check('social metadata names the studio and sets a canonical origin', () => {
    const layout = read('src/app/layout.tsx');
    assert.match(layout, /metadataBase/);
    assert.match(layout, /openGraph/);
    assert.match(layout, /twitter/);
    assert.match(layout, /COMPANY\.name/);
    assert.ok(existsSync(path.resolve('src/app/not-found.tsx')), 'a real 404 page is required');
  });

  await check('PDFs carry a vendor credit that a white-label buyer can remove', () => {
    const kit = read('src/lib/pdf/kit.ts');
    assert.match(kit, /PRINT_VENDOR_CREDIT/);
    assert.match(kit, /COMPANY\.name/);
    assert.match(kit, /COMPANY\.phone/);
  });

  console.log(
    failures === 0 ? '\nTRUST SURFACE REGRESSIONS PASSED\n' : `\n${failures} TRUST CHECK(S) FAILED\n`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('HARNESS FAILURE', error);
  process.exit(1);
});
