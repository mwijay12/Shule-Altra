/** Local, deterministic guidance. No model, network calls or student data. */
import { COMPANY, SUPPORT } from '@/lib/company';

export type GuideAction = { label: string; href: string; module?: string; external?: boolean };
export type GuideAnswer = { text: string; actions: GuideAction[] };
type Topic = GuideAnswer & { match: RegExp };

const topics: Topic[] = [
  { match: /\b(contact|support|help|email|phone|whatsapp|mawasiliano|namba|msaada)\b/i,
    text: `Altraware Technology support: ${SUPPORT.phone}, ${SUPPORT.email}. Hours: ${SUPPORT.hours}.`,
    actions: [{ label: 'Open Help', href: '/dashboard/help', module: 'help' }, { label: 'Email support', href: `mailto:${SUPPORT.email}`, external: true }, { label: 'WhatsApp support', href: SUPPORT.whatsapp, external: true }] },
  { match: /\b(altraware|developer|developers|company|kampuni|tengeneza|ametengeneza|nani)\b/i,
    text: `${COMPANY.name} is a Tanzanian software studio in ${COMPANY.city}. It builds websites, web and mobile apps, and management systems. Shule Altra is its school management product.`,
    actions: [{ label: 'Visit Altraware', href: COMPANY.website, external: true }, { label: 'Contact support', href: '/dashboard/help', module: 'help' }] },
  { match: /\b(offline|internet|mtandao|sync|synchroni[sz]e|sawazisha)\b/i,
    text: 'The local guide works without an AI service once this page is loaded. Demo records stay in this browser and do not sync across devices. Live data, login, page loading and integrations may require a connection; offline operation is not guaranteed.',
    actions: [{ label: 'Open Help', href: '/dashboard/help', module: 'help' }] },
  { match: /\b(attendance|absen\w*|presence|register|mahudhurio|hudhurio|hajafika|watoro)\b/i,
    text: 'In Attendance, search or filter by recorded class and stream, then choose Present, Late or Absent. The register shows the latest status, not a dated attendance history. Bulk marking asks for confirmation.',
    actions: [{ label: 'Open Attendance', href: '/dashboard/attendance', module: 'attendance' }] },
  { match: /\b(student\w*|learner\w*|enrol\w*|admission\w*|mwanafunzi|wanafunzi|sajili|usajili)\b/i,
    text: 'Use Students to search the register, open a student profile, enrol a learner or generate an ID card. Review the details before saving.',
    actions: [{ label: 'Open Students', href: '/dashboard/students', module: 'students' }] },
  { match: /\b(fee\w*|finance|payment\w*|balance\w*|malipo|ada|fedha|deni|lipia)\b/i,
    text: 'Finance contains the fee ledger and payment tools. Confirm the learner and amount before recording a payment; the guide does not make payments.',
    actions: [{ label: 'Open Finance', href: '/dashboard/finance', module: 'finance' }] },
  { match: /\b(academic\w*|grade\w*|mark\w*|exam\w*|results?|matokeo|alama|mitihani)\b/i,
    text: 'Use Academics to work with recorded assessments and grades. Check the selected class, term and exam before entering or exporting results.',
    actions: [{ label: 'Open Academics', href: '/dashboard/academics', module: 'academics' }] },
  { match: /\b(report\w*|print\w*|pdf|ripoti|chapisha|printout\w*)\b/i,
    text: 'Reports provides generated documents according to your role. Generate a new document to use the current school branding; pre-generated reference samples do not change with the theme.',
    actions: [{ label: 'Open Reports', href: '/dashboard/reports', module: 'reports' }] },
  { match: /\b(theme\w*|colour\w*|color\w*|branding|rangi|mandhari)\b/i,
    text: 'Administrators can change the palette in Theme Studio. In demo mode the choice stays in this browser; a configured live Firebase school can share branding across connected devices. Light and dark mode are personal.',
    actions: [{ label: 'Open Theme Studio', href: '/dashboard/theme-studio', module: 'themeStudio' }] },
  { match: /\b(timetable|ratiba|schedule)\b/i,
    text: 'The timetable page displays a generated example; it is not a saved school timetable and cross-class clashes are not checked.',
    actions: [{ label: 'Open Timetable', href: '/dashboard/timetable', module: 'timetable' }] },
  { match: /\b(shule|system|mfumo|product|software)\b/i,
    text: 'Shule Altra is a school management system by Altraware Technology. It includes student records, attendance, academics, fees and printable documents. Available functions depend on setup and your role.',
    actions: [{ label: 'Open dashboard', href: '/dashboard', module: 'dashboard' }, { label: 'Open Help', href: '/dashboard/help', module: 'help' }] },
];

export const GUIDE_PROMPTS = ['What is Shule Altra?', 'Who is Altraware?', 'How do I mark attendance?', 'How do I print reports?', 'Je, offline inafanya kazi?', 'Support contacts'];

export function answerGuide(question: string, canAccess: (module: string) => boolean): GuideAnswer {
  const topic = topics.find(item => item.match.test(question.trim()));
  if (!topic) return { text: 'Sijaelewa hilo. Try asking about students, attendance, fees, reports, themes, offline use or Altraware. This guide only answers supported topics.', actions: [] };
  const actions = topic.actions.filter(action => !action.module || canAccess(action.module));
  return { text: topic.actions.some(action => action.module && !canAccess(action.module)) ? `${topic.text} Some pages require a different role.` : topic.text, actions };
}
