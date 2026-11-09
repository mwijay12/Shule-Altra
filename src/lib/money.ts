/**
 * @fileOverview The currency a school works in.
 *
 * The formatter used to hard-code `TZS` and the `en-TZ` locale, which quietly
 * limits the product to one country. A school in Nairobi bills in KES, one in
 * Kigali in RWF, an international school in USD. The amount is the same number;
 * only the label and the grouping change.
 *
 * Default stays TZS so existing deployments are unchanged. A school sets
 * NEXT_PUBLIC_CURRENCY (and optionally NEXT_PUBLIC_LOCALE) at deployment.
 */

export type CurrencySpec = {
  code: string
  /** What sits before the number, e.g. "TZS" or "$". */
  label: string
  /** Decimal places this currency is normally written with. */
  decimals: number
}

const KNOWN: Record<string, CurrencySpec> = {
  TZS: { code: 'TZS', label: 'TZS', decimals: 0 },
  KES: { code: 'KES', label: 'KSh', decimals: 0 },
  UGX: { code: 'UGX', label: 'USh', decimals: 0 },
  RWF: { code: 'RWF', label: 'FRw', decimals: 0 },
  ZAR: { code: 'ZAR', label: 'R', decimals: 2 },
  NGN: { code: 'NGN', label: '₦', decimals: 2 },
  GHS: { code: 'GHS', label: 'GH₵', decimals: 2 },
  USD: { code: 'USD', label: '$', decimals: 2 },
  EUR: { code: 'EUR', label: '€', decimals: 2 },
  GBP: { code: 'GBP', label: '£', decimals: 2 },
}

export const DEFAULT_CURRENCY: CurrencySpec = KNOWN.TZS

export function currencySpec(
  env: Record<string, string | undefined> = process.env
): CurrencySpec {
  const code = (env.NEXT_PUBLIC_CURRENCY ?? '').trim().toUpperCase()
  if (KNOWN[code]) return KNOWN[code]
  // An unknown but well-formed code is still usable: show the code itself.
  if (/^[A-Z]{3}$/.test(code)) return { code, label: code, decimals: 2 }
  return DEFAULT_CURRENCY
}

export function activeLocale(
  env: Record<string, string | undefined> = process.env
): string {
  const locale = (env.NEXT_PUBLIC_LOCALE ?? '').trim()
  if (!locale) return 'en-TZ'
  try {
    // Intl does not throw for a structurally valid but unsupported tag such as
    // "not-a-locale", it silently falls back. Check the resolved language
    // actually matches what was asked for, so a typo cannot change grouping
    // without anyone noticing.
    const requested = new Intl.NumberFormat(locale).resolvedOptions().locale
    const askedFor = locale.split('-')[0].toLowerCase()
    const resolved = requested.split('-')[0].toLowerCase()
    return askedFor === resolved ? locale : 'en-TZ'
  } catch {
    return 'en-TZ'
  }
}
