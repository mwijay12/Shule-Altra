/**
 * @fileOverview Deterministic "AI" fallbacks for offline demos.
 *
 * The production hub calls Genkit + Gemini 2.5 Flash. In demo mode (no API key
 * and no network) we generate a realistic narrative locally so stakeholder
 * demos never hit a dead end.
 */

export interface ProgressNarrativeInput {
  studentName: string;
  classLevel?: string;
  conductPoints?: number;
  attendanceRate?: number;
  subjects?: Array<{ subject: string; grade: string; comment?: string }>;
}

const DEFAULT_SUBJECTS = [
  { subject: 'Mathematics', grade: 'A' },
  { subject: 'English', grade: 'B' },
  { subject: 'Kiswahili', grade: 'A' },
  { subject: 'Civics', grade: 'B' },
  { subject: 'Physics', grade: 'C' },
  { subject: 'Chemistry', grade: 'B' },
];

const REMARKS: Record<string, string> = {
  A: 'shows a strong, consistent grasp of the subject',
  B: 'shows solid understanding with room for sharper accuracy',
  C: 'is developing steadily and benefits from guided practice',
  D: 'requires structured remedial support this term',
  F: 'needs urgent support and close teacher follow-up',
};

export function buildDemoNarrative(input: ProgressNarrativeInput): string {
  const subjects = input.subjects && input.subjects.length > 0 ? input.subjects : DEFAULT_SUBJECTS;
  const ranked = [...subjects].sort((a, b) => a.grade.localeCompare(b.grade));
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const attendance = (input.attendanceRate ?? 96.4).toFixed(1);
  const conduct = input.conductPoints ?? 94;
  const level = input.classLevel ? ` (${input.classLevel})` : '';

  return [
    `${input.studentName}${level} ${REMARKS[strongest.grade] || REMARKS.B} in ${strongest.subject}, the strongest result this term.`,
    `In ${weakest.subject} the learner ${REMARKS[weakest.grade] || REMARKS.C}; a focused remedial plan with weekly checkpoints is recommended.`,
    `Attendance is ${attendance}% and conduct is ${conduct}/100.`,
    `Next step: pair ${weakest.subject} practice sets with peer-led study sessions and review progress at the next assessment.`,
  ].join(' ');
}

export function buildDemoScanResult() {
  const samples = [
    { name: 'Hamisi Salum Kivuyo', id: 'S2026/0417', academicLevel: 'Form 1', gender: 'M' as const, parentContact: '+255 754 220 118' },
    { name: 'Zainab Ally Msuya', id: 'S2026/0418', academicLevel: 'Form 2', gender: 'F' as const, parentContact: '+255 713 908 442' },
    { name: 'Baraka Peter Mushi', id: 'S2026/0419', academicLevel: 'Form 3', gender: 'M' as const, parentContact: '+255 784 551 090' },
  ];
  return samples[Math.floor(Math.random() * samples.length)];
}
