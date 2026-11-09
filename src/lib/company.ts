/**
 * @fileOverview Who builds and stands behind this product.
 *
 * One place for the company facts, so the footer, the legal pages, the proposal
 * and the PDF colophon can never disagree. Every value here is published on
 * https://altra.tanzaniareach.com/, nothing is invented, and nothing claims a
 * certification or a client we do not have.
 */

export const COMPANY = {
  name: 'Altraware Technology',
  legalName: 'Altraware Technology',
  tagline: 'Rooted at home. Engineered for the world.',
  description:
    'A Tanzanian software studio in Dar es Salaam. We build websites, web and mobile apps, and management systems for businesses, schools, care centres and NGOs — in Kiswahili and English.',
  website: 'https://altra.tanzaniareach.com/',
  email: 'altrawaretechnology@gmail.com',
  phone: '+255 792 867 427',
  phoneHref: 'tel:+255792867427',
  whatsapp: 'https://wa.me/255792867427',
  city: 'Dar es Salaam',
  country: 'Tanzania',
  hours: 'Mon–Sat · 8:00–18:00 EAT',
  timezone: 'Africa/Dar_es_Salaam',
  /** Languages we work in, not languages the software has been translated into. */
  workingLanguages: ['Kiswahili', 'English'],
  contactPage: 'https://altra.tanzaniareach.com/contact',
} as const

export const PRODUCT = {
  name: 'Shule Altra',
  fullName: 'Shule Altra',
  version: '3.26',
  /** What it is, stated plainly. */
  summary:
    'A school management system for secondary schools: learners, fees, attendance, NECTA-aligned results and the documents a school signs.',
  by: COMPANY.name,
} as const

/** Where a school reaches a human. Used by the footer, legal pages and proposals. */
export const SUPPORT = {
  email: COMPANY.email,
  phone: COMPANY.phone,
  whatsapp: COMPANY.whatsapp,
  hours: COMPANY.hours,
  /** Honest wording: a response aim, not a contractual SLA. */
  responseAim: 'We reply within one business day, in English or Kiswahili.',
} as const

export const LEGAL_UPDATED = '2026-11-09'
