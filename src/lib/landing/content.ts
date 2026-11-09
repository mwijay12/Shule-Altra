/**
 * Public landing-page content.
 *
 * Defaults live in code so the page works with no database. An administrator can
 * override copy, photography and the font pairing from Settings → Landing page;
 * overrides are stored at schools/school-001/config/landing and merged over these
 * defaults. Replace photography with the school's own consented images, the
 * bundled files are editorial placeholders, not proof of a real campus.
 */

export const LANDING_SCHOOL_ID = 'school-001';
export const LANDING_DOC_PATH = `schools/${LANDING_SCHOOL_ID}/config/landing`;

export type LandingFontId = 'register' | 'gazette' | 'signal';

export const LANDING_FONTS: Array<{
  id: LandingFontId;
  name: string;
  description: string;
  sample: string;
}> = [
  {
    id: 'register',
    name: 'Register',
    description: 'Space Grotesk headings · Inter body · Instrument Serif accent. The default institutional voice.',
    sample: 'One school day.',
  },
  {
    id: 'gazette',
    name: 'Gazette',
    description: 'Instrument Serif headings · Inter body. Calmer, editorial, closer to a printed prospectus.',
    sample: 'One school day.',
  },
  {
    id: 'signal',
    name: 'Signal',
    description: 'Inter throughout · JetBrains Mono labels. Crisp, product-forward, highly legible on phones.',
    sample: 'One school day.',
  },
];

export type LandingImageSlot =
  | 'heroClassroom'
  | 'teacherPortrait'
  | 'paperStack'
  | 'handsLedger'
  | 'schoolFacade'
  | 'learnerSenior'
  | 'learnerJunior'
  | 'learnerPortrait'
  | 'library'
  | 'scienceLab'
  | 'computerLab'
  | 'dormitory'
  | 'diningHall'
  | 'playingField';

export interface LandingImage {
  src: string;
  alt: string;
}

export interface LandingStat {
  target: number;
  label: string;
  note: string;
  suffix?: string;
  format?: 'integer' | 'decimal' | 'millions';
}

export interface LandingContent {
  font: LandingFontId;
  schoolName: string;
  brandTagline: string;
  hero: {
    kicker: string;
    titleLines: [string, string, string];
    lede: string;
    primaryCta: string;
    secondaryCta: string;
    captionTitle: string;
    captionNote: string;
  };
  stats: LandingStat[];
  sections: {
    register: { label: string; title: string; accent: string; note: string };
    timetable: { label: string; title: string; accent: string; note: string };
    day: { label: string; title: string; accent: string; note: string };
    documents: { label: string; title: string; accent: string; note: string };
    campus: { label: string; title: string; accent: string; note: string };
    compliance: { label: string; title: string; accent: string; note: string };
  };
  interlude: {
    label: string;
    line: string;
    accent: string;
    meta: string;
  };
  footer: {
    product: string;
    location: string;
  };
  images: Record<LandingImageSlot, LandingImage>;
}

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  font: 'register',
  schoolName: 'Mwalimu Nyerere Secondary School',
  brandTagline: 'School management · 2026',
  hero: {
    kicker: 'Tanzania · O-level secondary schools',
    titleLines: ['One school day.', 'Every register,', 'every shilling.'],
    lede:
      'Shule Altra is the institutional operating system for Tanzanian secondary schools. Learners, fees, NECTA matrices, attendance and the paper a school actually signs — kept on one timetable.',
    primaryCta: 'Enter the demo school',
    secondaryCta: 'Read the timetable',
    captionTitle: 'Form 2 · Alpha',
    captionNote: '38 learners · register closed',
  },
  stats: [
    { target: 150, label: 'Learners on the register', note: 'Form 1–4 · day and boarding', format: 'integer' },
    { target: 2932, label: 'Scores assessed this term', note: 'CSEE matrices · Form 1–4', format: 'integer' },
    { target: 90.1, suffix: '%', label: 'Presence across all streams', note: '900 register entries', format: 'decimal' },
    { target: 61043000, label: 'Fees reconciled · TZS', note: 'ClickPesa · Beem · bank · cash', format: 'millions' },
  ],
  sections: {
    register: {
      label: '07:40 — registration',
      title: 'The register is',
      accent: 'the school',
      note: 'Four numbers, true this minute in the demo school — not a marketing estimate. Every one of them comes from the same record the documents are printed from.',
    },
    timetable: {
      label: '09:10 — period two',
      title: 'Six periods,',
      accent: 'one timetable',
      note: 'The product, read the way a school reads it. Point at a period — it opens onto the photograph that belongs to it.',
    },
    day: { label: '11:20 — period four', title: 'One day becomes', accent: 'one record', note: '' },
    documents: {
      label: '14:00 — period six',
      title: 'The paper a school',
      accent: 'actually signs',
      note: 'Real exports from the demo school — set in vector type with pdf-lib, crest and all, not screenshots. The timetable is a notice-board document and stays public; anything that names a learner, a balance or a payment sits behind that person’s role, inside the demo.',
    },
    campus: {
      label: '12:40 — lunch',
      title: 'The rooms the record',
      accent: 'comes from',
      note: 'Replace these placeholders with photographs of your own campus, laboratories, boarding wings and playing field. Each room maps to the module that keeps it accountable.',
    },
    compliance: { label: '16:05 — the gate', title: 'Yours by default,', accent: 'auditable', note: '' },
  },
  interlude: {
    label: '16:20 — the ground',
    line: 'Built for the schools that keep',
    accent: 'Tanzania’s records',
    meta: 'Dar es Salaam · 06°48′S 39°17′E · O-level Form 1–4',
  },
  footer: {
    product:
      'A school management system built for Tanzanian secondary schools: one register, one ledger, one set of documents that hold up in front of a parent, a board or an auditor.',
    location: 'Dar es Salaam\nTanzania',
  },
  images: {
    heroClassroom: {
      src: '/landing/hero-classroom.jpg',
      alt: 'Learners writing at their desks during morning lessons',
    },
    teacherPortrait: {
      src: '/landing/teacher-portrait.jpg',
      alt: 'A teacher holding marked papers in the corridor',
    },
    paperStack: {
      src: '/landing/paper-stack.jpg',
      alt: 'Marked papers and chalk on a desk',
    },
    handsLedger: {
      src: '/landing/hands-ledger.jpg',
      alt: 'Hands writing a payment into the fee ledger',
    },
    schoolFacade: {
      src: '/landing/school-facade.jpg',
      alt: 'A school veranda in morning light',
    },
    learnerSenior: {
      src: '/media/students/learners-senior.jpg',
      alt: 'Two senior learners with backpacks',
    },
    learnerJunior: {
      src: '/media/students/learners-junior.jpg',
      alt: 'Two junior learners in school uniform',
    },
    learnerPortrait: {
      src: '/media/students/learner-portrait.jpg',
      alt: 'A learner holding textbooks',
    },
    library: { src: '/media/campus/library.jpg', alt: 'The school library reading room' },
    scienceLab: { src: '/media/campus/science-lab.jpg', alt: 'The chemistry laboratory' },
    computerLab: { src: '/media/campus/computer-lab.jpg', alt: 'The computer laboratory' },
    dormitory: { src: '/media/campus/dormitory.jpg', alt: 'A boarding wing' },
    diningHall: { src: '/media/campus/dining-hall.jpg', alt: 'The dining hall' },
    playingField: { src: '/media/campus/playing-field.jpg', alt: 'The school playing field' },
  },
};

export const LANDING_IMAGE_SLOTS: Array<{ id: LandingImageSlot; label: string; hint: string }> = [
  { id: 'heroClassroom', label: 'Hero · classroom', hint: 'Portrait or 4:5. Morning light, learners writing.' },
  { id: 'teacherPortrait', label: 'Attendance · teacher', hint: 'Portrait. A form teacher with the register.' },
  { id: 'paperStack', label: 'Academics · papers', hint: 'Landscape or square. Marked scripts, no faces required.' },
  { id: 'handsLedger', label: 'Finance · ledger', hint: 'Landscape. Hands writing, cash desk, receipt book.' },
  { id: 'schoolFacade', label: 'Interlude · campus', hint: 'Wide 16:9. The building itself, full bleed.' },
  { id: 'learnerSenior', label: 'Learner · senior', hint: 'Portrait. Consent required before publishing.' },
  { id: 'learnerJunior', label: 'Learner · Form 1', hint: 'Portrait. Consent required before publishing.' },
  { id: 'learnerPortrait', label: 'Learner · portrait', hint: 'Portrait. Consent required before publishing.' },
  { id: 'library', label: 'Campus · library', hint: 'Wide tile. Reading room.' },
  { id: 'scienceLab', label: 'Campus · science lab', hint: 'Square tile. Practical benches.' },
  { id: 'computerLab', label: 'Campus · computer lab', hint: 'Square tile. ICT room.' },
  { id: 'dormitory', label: 'Campus · dormitory', hint: 'Square tile. Boarding wing.' },
  { id: 'diningHall', label: 'Campus · dining hall', hint: 'Square tile. Meal service.' },
  { id: 'playingField', label: 'Campus · field', hint: 'Wide tile. Inter-house sport.' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Deep-merge stored overrides over defaults, ignoring malformed fields. */
export function mergeLandingContent(raw: unknown): LandingContent {
  const base = DEFAULT_LANDING_CONTENT;
  if (!isRecord(raw)) return base;

  const font = LANDING_FONTS.some((item) => item.id === raw.font) ? (raw.font as LandingFontId) : base.font;
  const hero = isRecord(raw.hero) ? raw.hero : {};
  const storedLines = Array.isArray(hero.titleLines) ? hero.titleLines : [];
  const titleLines = base.hero.titleLines.map((line, index) =>
    typeof storedLines[index] === 'string' ? (storedLines[index] as string) : line
  );

  const sections = { ...base.sections };
  if (isRecord(raw.sections)) {
    for (const key of Object.keys(sections) as Array<keyof typeof sections>) {
      const stored = raw.sections[key];
      if (isRecord(stored)) {
        const mergedSection: Record<string, string> = { ...sections[key] };
        for (const [field, value] of Object.entries(sections[key])) {
          if (typeof stored[field] === 'string') mergedSection[field] = stored[field] as string;
          else mergedSection[field] = value;
        }
        sections[key] = mergedSection as (typeof sections)[typeof key];
      }
    }
  }

  const images = { ...base.images };
  if (isRecord(raw.images)) {
    for (const slot of Object.keys(images) as LandingImageSlot[]) {
      const stored = raw.images[slot];
      if (isRecord(stored)) {
        images[slot] = {
          src: typeof stored.src === 'string' && stored.src.trim() ? stored.src : base.images[slot].src,
          alt: typeof stored.alt === 'string' ? stored.alt : base.images[slot].alt,
        };
      }
    }
  }

  const storedStats = Array.isArray(raw.stats) ? raw.stats : [];
  const stats = Array.isArray(raw.stats)
    ? base.stats.map((stat, index) => {
        const stored = storedStats[index];
        if (!isRecord(stored)) return stat;
        return {
          ...stat,
          target: typeof stored.target === 'number' && Number.isFinite(stored.target) ? stored.target : stat.target,
          label: typeof stored.label === 'string' ? stored.label : stat.label,
          note: typeof stored.note === 'string' ? stored.note : stat.note,
          suffix: typeof stored.suffix === 'string' ? stored.suffix : stat.suffix,
        };
      })
    : base.stats;

  return {
    ...base,
    font,
    schoolName: typeof raw.schoolName === 'string' ? raw.schoolName : base.schoolName,
    brandTagline: typeof raw.brandTagline === 'string' ? raw.brandTagline : base.brandTagline,
    hero: {
      kicker: typeof hero.kicker === 'string' ? hero.kicker : base.hero.kicker,
      titleLines: titleLines as [string, string, string],
      lede: typeof hero.lede === 'string' ? hero.lede : base.hero.lede,
      primaryCta: typeof hero.primaryCta === 'string' ? hero.primaryCta : base.hero.primaryCta,
      secondaryCta: typeof hero.secondaryCta === 'string' ? hero.secondaryCta : base.hero.secondaryCta,
      captionTitle: typeof hero.captionTitle === 'string' ? hero.captionTitle : base.hero.captionTitle,
      captionNote: typeof hero.captionNote === 'string' ? hero.captionNote : base.hero.captionNote,
    },
    stats,
    sections,
    interlude: isRecord(raw.interlude)
      ? {
          label: typeof raw.interlude.label === 'string' ? raw.interlude.label : base.interlude.label,
          line: typeof raw.interlude.line === 'string' ? raw.interlude.line : base.interlude.line,
          accent: typeof raw.interlude.accent === 'string' ? raw.interlude.accent : base.interlude.accent,
          meta: typeof raw.interlude.meta === 'string' ? raw.interlude.meta : base.interlude.meta,
        }
      : base.interlude,
    footer: isRecord(raw.footer)
      ? {
          product: typeof raw.footer.product === 'string' ? raw.footer.product : base.footer.product,
          location: typeof raw.footer.location === 'string' ? raw.footer.location : base.footer.location,
        }
      : base.footer,
    images,
  };
}
