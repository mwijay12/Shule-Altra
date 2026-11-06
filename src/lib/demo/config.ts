/**
 * @fileOverview Demo-mode flags shared by UI components.
 *
 * Demo mode is the default so the hub can be demonstrated with zero cloud
 * setup. Set NEXT_PUBLIC_DEMO_MODE=false to run against real Firebase.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export const DEMO_SCHOOL_NAME = 'MWALIMU NYERERE SECONDARY SCHOOL';

export const DEMO_HIGHLIGHTS = [
  '150 students across Standard 7 → Form 4',
  '2,700+ NECTA-aligned assessment records',
  '140 forensic fee transactions with control numbers',
  'Boarding, fleet, canteen & inventory nodes',
];
