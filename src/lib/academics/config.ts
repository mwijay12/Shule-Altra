/**
 * The school's academic scope. Keep the registry, enrollment form, assessment
 * filters and timetable on these same options, never mix primary and O-level
 * classes in the default school.
 */
export const O_LEVEL_CLASSES = ['Form 1', 'Form 2', 'Form 3', 'Form 4'] as const;

export type OLevelClass = (typeof O_LEVEL_CLASSES)[number];

export const DEFAULT_CLASS: OLevelClass = 'Form 1';
export const DEFAULT_SCHOOL_TYPE = 'secondary';
export const ACADEMIC_LEVEL = 'O-Level';
export const ACADEMIC_LEVEL_LABEL = 'O-Level · Form 1–4';

export function isOLevelClass(value: unknown): value is OLevelClass {
  return O_LEVEL_CLASSES.some((className) => className === value);
}

/**
 * Default to O-level. Live Firebase schools may keep their configured tiers;
 * the demo deliberately ignores an old mixed-level cache and offers Form 1–4.
 */
export function classOptions(
  configured?: readonly string[],
  { oLevelOnly = false }: { oLevelOnly?: boolean } = {}
): readonly string[] {
  const options = oLevelOnly
    ? (configured ?? []).filter((value) => O_LEVEL_CLASSES.some((className) => className === value))
    : (configured ?? []);
  return options.length > 0 ? options : O_LEVEL_CLASSES;
}
