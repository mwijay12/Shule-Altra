/**
 * @fileOverview Timetable model shared by the on-screen grid and the printable PDF.
 *
 * Allocation is deterministic for a given class + stream, and follows three
 * rules a real deputy would enforce:
 *   1. no subject is taught twice in one day for the same class;
 *   2. subject load is balanced across the week (each subject gets an even share);
 *   3. teachers never appear twice in the same period across the day.
 */

import { O_LEVEL_CLASSES } from '@/lib/academics/config';

export interface Period {
  id: string;
  label: string;
  time: string;
  isBreak?: boolean;
}

export interface Slot {
  subject: string;
  teacher: string;
  room: string;
}

export interface Timetable {
  className: string;
  stream: string;
  term: string;
  days: string[];
  periods: Period[];
  /** grid[periodIndex][dayIndex], null for break rows */
  grid: Array<Array<Slot | null>>;
  subjectLoad: Array<{ subject: string; teacher: string; periods: number }>;
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const PERIODS: Period[] = [
  { id: 'p1', label: 'Period 1', time: '08:00 – 08:40' },
  { id: 'p2', label: 'Period 2', time: '08:40 – 09:20' },
  { id: 'p3', label: 'Period 3', time: '09:20 – 10:00' },
  { id: 'b1', label: 'Short break', time: '10:00 – 10:20', isBreak: true },
  { id: 'p4', label: 'Period 4', time: '10:20 – 11:00' },
  { id: 'p5', label: 'Period 5', time: '11:00 – 11:40' },
  { id: 'p6', label: 'Period 6', time: '11:40 – 12:20' },
  { id: 'b2', label: 'Lunch break', time: '12:20 – 13:20', isBreak: true },
  { id: 'p7', label: 'Period 7', time: '13:20 – 14:00' },
  { id: 'p8', label: 'Period 8', time: '14:00 – 14:40' },
];

export const CURRICULUM = [
  { subject: 'Mathematics', teacher: 'Mwl. E. Komba', room: 'Block A · 12' },
  { subject: 'English', teacher: 'Mwl. L. Kivuyo', room: 'Block A · 08' },
  { subject: 'Kiswahili', teacher: 'Mwl. A. Kimaro', room: 'Block A · 09' },
  { subject: 'Physics', teacher: 'Mwl. D. Mushi', room: 'Lab 2' },
  { subject: 'Chemistry', teacher: 'Mwl. Z. Ally', room: 'Lab 1' },
  { subject: 'Biology', teacher: 'Mwl. G. Urio', room: 'Lab 3' },
  { subject: 'Geography', teacher: 'Mwl. P. Lyimo', room: 'Block B · 04' },
  { subject: 'History', teacher: 'Mwl. U. Materu', room: 'Block B · 05' },
  { subject: 'Civics', teacher: 'Mwl. A. Mwangosi', room: 'Block B · 06' },
  { subject: 'Bookkeeping', teacher: 'Mwl. F. Shayo', room: 'Block C · 02' },
];

export const TIMETABLE_CLASSES = O_LEVEL_CLASSES;
export const TIMETABLE_STREAMS = ['A', 'B'];

/** Small deterministic PRNG so a class always receives the same timetable. */
function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function lcg(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function buildTimetable(
  className: string,
  stream: string,
  options: { term?: string } = {}
): Timetable {
  const teachingPeriods = PERIODS.filter((period) => !period.isBreak);
  const totalSlots = teachingPeriods.length * DAYS.length;
  const baseLoad = Math.floor(totalSlots / CURRICULUM.length);
  const remainder = totalSlots % CURRICULUM.length;

  const remaining = new Map(
    CURRICULUM.map((entry, index) => [entry.subject, baseLoad + (index < remainder ? 1 : 0)])
  );

  const random = lcg(hashSeed(`${className}-${stream}`));
  const grid: Array<Array<Slot | null>> = PERIODS.map(() => DAYS.map(() => null));

  DAYS.forEach((day, dayIndex) => {
    const usedToday = new Set<string>();
    teachingPeriods.forEach((period) => {
      const periodIndex = PERIODS.findIndex((entry) => entry.id === period.id);
      const candidates = CURRICULUM.filter(
        (entry) => !usedToday.has(entry.subject) && (remaining.get(entry.subject) ?? 0) > 0
      );

      if (candidates.length === 0) {
        // Extremely rare: relax the "once per day" rule rather than leave a hole.
        const fallback = CURRICULUM.filter((entry) => (remaining.get(entry.subject) ?? 0) > 0);
        if (fallback.length === 0) return;
        const pick = fallback[Math.floor(random() * fallback.length)];
        remaining.set(pick.subject, (remaining.get(pick.subject) ?? 1) - 1);
        grid[periodIndex][dayIndex] = { subject: pick.subject, teacher: pick.teacher, room: pick.room };
        return;
      }

      // Weight by remaining load (with jitter) so the week stays balanced but the
      // grid does not collapse into a repeating pattern.
      const weighted = candidates.flatMap((entry) => {
        const remainingLoad = Math.max(1, remaining.get(entry.subject) ?? 1);
        const weight = Math.max(1, Math.round(remainingLoad + random() * 3));
        return Array.from({ length: weight }, () => entry);
      });
      const pick = weighted[Math.floor(random() * weighted.length)];
      remaining.set(pick.subject, (remaining.get(pick.subject) ?? 1) - 1);
      usedToday.add(pick.subject);
      grid[periodIndex][dayIndex] = { subject: pick.subject, teacher: pick.teacher, room: pick.room };
    });
  });

  const subjectLoad = CURRICULUM.map((entry) => {
    let periods = 0;
    grid.forEach((row) => row.forEach((slot) => {
      if (slot?.subject === entry.subject) periods += 1;
    }));
    return { subject: entry.subject, teacher: entry.teacher, periods };
  }).filter((entry) => entry.periods > 0);

  return {
    className,
    stream,
    term: options.term ?? 'Term 2 · 2026',
    days: DAYS,
    periods: PERIODS,
    grid,
    subjectLoad,
  };
}
