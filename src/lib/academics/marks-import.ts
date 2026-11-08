/**
 * @fileOverview Turning a teacher's spreadsheet into assessment records.
 *
 * Every school already has marks in Excel — every subject teacher keeps one,
 * with their own column names, their own spelling of the subjects, and rows in
 * whatever order the register was printed. Asking them to retype 2,700 scores
 * into a web form is how a rollout dies in week two.
 *
 * So the file is the input. This module owns the messy part:
 *
 *   – header aliases (`Adm No`, `ADMISSION NUMBER`, `Namba ya Usajili` …)
 *   – subjects matched case- and space-insensitively against the school list
 *   – scores as `78`, `78%`, ` 78 `, or `-` (treated as absent, not zero)
 *   – learners matched by admission number, falling back to full name
 *   – duplicates inside one file resolved in favour of the last row, loudly
 *
 * Nothing here touches the database. `parseMarks` returns what *would* happen,
 * so the screen can show a preview and a human can say yes before anything is
 * written. That is the whole point: never import blind.
 */

export type MarkSubject = string;

export type MarkCandidate = {
  /** row number in the sheet, 1-based, counting the header as row 1 */
  row: number;
  admissionNo: string;
  studentId: string;
  studentName: string;
  className: string;
  subject: string;
  score: number;
  term: string;
  examType: string;
};

export type MarkIssue = {
  row: number;
  admissionNo?: string;
  subject?: string;
  message: string;
  severity: 'error' | 'warning';
};

export type MarkParseResult = {
  rows: MarkCandidate[];
  issues: MarkIssue[];
  stats: {
    read: number;
    valid: number;
    errors: number;
    warnings: number;
    learners: number;
    subjects: number;
    average: number | null;
  };
};

export type LearnerLike = {
  id: string;
  name?: string;
  class?: string;
};

export type ParseOptions = {
  /** the term / exam the sheet belongs to; the file may override per row */
  term: string;
  examType: string;
  academicYear?: string;
  /** canonical subject list for this school */
  subjects: string[];
};

/* -------------------------------------------------------------------------- */
/*  Headers                                                                   */
/* -------------------------------------------------------------------------- */

const HEADER_ALIASES: Record<string, string[]> = {
  admissionNo: [
    'admission_no',
    'admissionno',
    'admission no',
    'admission number',
    'admission',
    'adm',
    'adm no',
    'adm_no',
    'admno',
    'student id',
    'studentid',
    'student_id',
    'id',
    'namba ya usajili',
    'namba',
  ],
  studentName: ['student_name', 'studentname', 'name', 'jina', 'student', 'full name', 'fullname', 'mwanafunzi'],
  className: ['class', 'class_name', 'darasa', 'form', 'level'],
  subject: ['subject', 'somo', 'subjects', 'masomo'],
  score: ['score', 'marks', 'mark', 'alama', 'total', 'points', 'result'],
  term: ['term', 'muhula'],
  examType: ['exam', 'exam_type', 'examtype', 'assessment', 'mtihani', 'type'],
};

const normalise = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ');

/** Which spreadsheet column feeds which field. Missing required ones fail loudly. */
export function mapHeaders(headers: string[]): {
  columns: Partial<Record<keyof typeof HEADER_ALIASES, number>>;
  missing: string[];
} {
  const columns: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};
  headers.forEach((header, index) => {
    const key = normalise(header);
    if (!key) return;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (columns[field as keyof typeof HEADER_ALIASES] !== undefined) continue;
      if (aliases.some((alias) => key === normalise(alias))) {
        columns[field as keyof typeof HEADER_ALIASES] = index;
      }
    }
  });

  const missing: string[] = [];
  if (columns.admissionNo === undefined && columns.studentName === undefined) {
    missing.push('an admission number column (Adm No / Namba ya Usajili) or a name column');
  }
  if (columns.score === undefined) missing.push('a score column (Score / Alama)');
  return { columns, missing };
}

/* -------------------------------------------------------------------------- */
/*  Values                                                                    */
/* -------------------------------------------------------------------------- */

/** `78`, `78%`, ` 78.5 ` and `78 / 100` all mean seventy-eight. */
export function parseScore(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw || raw === '-' || raw === '--' || /^(abs|absent|n\/a|na|hakuna)$/i.test(raw)) return null;
  const match = raw.replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const score = Number.parseFloat(match[0]);
  return Number.isFinite(score) ? score : null;
}

/** `mathematics`, `MATHEMATICS `, `Maths` all resolve to the school's spelling. */
export function canonicalSubject(value: string, subjects: string[]): string | null {
  const key = normalise(value);
  if (!key) return null;
  const exact = subjects.find((subject) => normalise(subject) === key);
  if (exact) return exact;

  const shorthand: Record<string, string[]> = {
    math: ['mathematics', 'maths', 'hisabati'],
    eng: ['english', 'kingereza'],
    kis: ['kiswahili', 'swahili'],
    civ: ['civics', 'uraia'],
    phy: ['physics', 'fizikia'],
    chem: ['chemistry', 'kemia'],
    bio: ['biology', 'biolojia'],
    geo: ['geography', 'jiografia'],
    hist: ['history', 'historia'],
    comm: ['commerce', 'biashara'],
    bm: ['book keeping', 'bookkeeping'],
  };

  for (const [short, names] of Object.entries(shorthand)) {
    const hit = [short, ...names].some((candidate) => normalise(candidate) === key);
    if (!hit) continue;
    const match = subjects.find((subject) => names.some((name) => normalise(subject).includes(normalise(name))));
    if (match) return match;
  }

  // Last resort: a prefix match (`Mathematics I` → `Mathematics`).
  return subjects.find((subject) => normalise(subject).startsWith(key) || key.startsWith(normalise(subject))) ?? null;
}

const keyOfAdmission = (value: string) => String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');

const keyOfName = (value: string) => normalise(value).replace(/\s+/g, ' ');

/* -------------------------------------------------------------------------- */
/*  Parse                                                                     */
/* -------------------------------------------------------------------------- */

export function parseMarks(
  input: Array<Record<string, unknown>>,
  learners: LearnerLike[],
  options: ParseOptions
): MarkParseResult {
  const rows: MarkCandidate[] = [];
  const issues: MarkIssue[] = [];

  // Index the register once: admission number first, then full name.
  const byAdmission = new Map<string, LearnerLike>();
  const byName = new Map<string, LearnerLike>();
  learners.forEach((learner) => {
    byAdmission.set(keyOfAdmission(learner.id), learner);
    if (learner.name) byName.set(keyOfName(learner.name), learner);
  });

  const seen = new Map<string, number>();
  let read = 0;

  input.forEach((rawRow, index) => {
    const rowNumber = index + 2; // header is row 1
    const values = Object.values(rawRow ?? {});
    if (values.every((value) => value === null || String(value ?? '').trim() === '')) return;
    read += 1;

    // Header mapping is per-row because XLSX gives us objects keyed by header.
    const readField = (aliases: string[]) => {
      for (const [key, value] of Object.entries(rawRow ?? {})) {
        const field = normalise(key);
        if (aliases.some((alias) => field === normalise(alias))) return value;
      }
      return undefined;
    };

    const admissionNo = String(readField(HEADER_ALIASES.admissionNo) ?? '').trim();
    const name = String(readField(HEADER_ALIASES.studentName) ?? '').trim();
    const subjectRaw = String(readField(HEADER_ALIASES.subject) ?? '').trim();
    const classRaw = String(readField(HEADER_ALIASES.className) ?? '').trim();
    const termRaw = String(readField(HEADER_ALIASES.term) ?? '').trim();
    const examRaw = String(readField(HEADER_ALIASES.examType) ?? '').trim();
    const scoreRaw = readField(HEADER_ALIASES.score);

    const learner =
      (admissionNo ? byAdmission.get(keyOfAdmission(admissionNo)) : undefined) ??
      (name ? byName.get(keyOfName(name)) : undefined);

    if (!learner) {
      issues.push({
        row: rowNumber,
        admissionNo: admissionNo || undefined,
        message: admissionNo
          ? `No learner on the register with admission number ${admissionNo}.`
          : `No learner matched${name ? ` the name ${name}` : ''}.`,
        severity: 'error',
      });
      return;
    }

    const subject = canonicalSubject(subjectRaw, options.subjects);
    if (!subject) {
      issues.push({
        row: rowNumber,
        admissionNo: admissionNo || learner.id,
        subject: subjectRaw || undefined,
        message: subjectRaw
          ? `“${subjectRaw}” is not a subject this school offers.`
          : 'The subject column is empty on this row.',
        severity: 'error',
      });
      return;
    }

    const score = parseScore(scoreRaw);
    if (score === null) {
      issues.push({
        row: rowNumber,
        admissionNo: admissionNo || learner.id,
        subject,
        message: 'No score on this row — treated as not yet marked.',
        severity: 'warning',
      });
      return;
    }
    if (score < 0 || score > 100) {
      issues.push({
        row: rowNumber,
        admissionNo: admissionNo || learner.id,
        subject,
        message: `Score ${score} is outside 0–100.`,
        severity: 'error',
      });
      return;
    }

    const className = learner.class ?? classRaw;
    if (classRaw && normalise(classRaw) !== normalise(className)) {
      issues.push({
        row: rowNumber,
        admissionNo: learner.id,
        subject,
        message: `The sheet says ${classRaw} but the register says ${className} — the register wins.`,
        severity: 'warning',
      });
    }

    const term = termRaw || options.term;
    const examType = examRaw || options.examType;
    const candidate: MarkCandidate = {
      row: rowNumber,
      admissionNo: admissionNo || learner.id,
      studentId: learner.id,
      studentName: learner.name ?? admissionNo,
      className,
      subject,
      score: Math.round(score * 10) / 10,
      term,
      examType,
    };

    // A file that repeats a mark is a file that was edited twice. Keep the last
    // one, but say so, because the teacher needs to know which row won.
    const dedupe = `${candidate.studentId}|${subject}|${term}|${examType}`;
    const previous = seen.get(dedupe);
    if (previous !== undefined) {
      issues.push({
        row: rowNumber,
        admissionNo: candidate.admissionNo,
        subject,
        message: `Duplicate of row ${previous} for ${candidate.studentName} — this row wins.`,
        severity: 'warning',
      });
      const at = rows.findIndex((entry) => `${entry.studentId}|${entry.subject}|${entry.term}|${entry.examType}` === dedupe);
      if (at >= 0) rows.splice(at, 1);
    }
    seen.set(dedupe, rowNumber);
    rows.push(candidate);
  });

  const learnersTouched = new Set(rows.map((row) => row.studentId)).size;
  const subjectsTouched = new Set(rows.map((row) => row.subject)).size;
  const average = rows.length
    ? Math.round((rows.reduce((sum, row) => sum + row.score, 0) / rows.length) * 10) / 10
    : null;

  return {
    rows,
    issues,
    stats: {
      read,
      valid: rows.length,
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
      learners: learnersTouched,
      subjects: subjectsTouched,
      average,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Template                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The sheet a teacher downloads: their own learners, one row per subject, ready
 * to be filled in. Sending a blank template with three example rows beats any
 * instruction manual.
 */
export function marksTemplateRows(
  learners: LearnerLike[],
  subjects: MarkSubject[],
  options: { term: string; examType: string }
): Array<Record<string, string | number>> {
  const rows: Array<Record<string, string | number>> = [];
  learners.forEach((learner) => {
    subjects.forEach((subject) => {
      rows.push({
        'Admission No': learner.id,
        'Student Name': learner.name ?? '',
        Class: learner.class ?? '',
        Subject: subject,
        Score: '',
        Term: options.term,
        Exam: options.examType,
      });
    });
  });
  return rows;
}
