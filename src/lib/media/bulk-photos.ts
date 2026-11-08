/**
 * @fileOverview Matching a folder of photographs to learners — without guessing.
 *
 * A school that decides to photograph 150 learners does not hand them over one
 * at a time. It hands over a folder, usually straight off a phone or a camera,
 * where every file is named after the admission number:
 *
 *     ADM-2026-014.jpg
 *     adm 2026 015.JPG
 *     ADM-2026-016 (1).png
 *
 * This module turns that folder into a plan. It is pure: no Firestore, no
 * Storage, no DOM. It never *uploads* anything — it decides what would happen
 * if you did, so the screen can show the plan and the school can refuse it
 * before a single child's face moves.
 *
 * The rules, and why each one exists:
 *
 *   - A file matches a learner only on the **admission number**. Names collide,
 *     folder order means nothing, and a photograph on the wrong child's card is
 *     worse than no photograph at all.
 *   - A camera filename (`IMG_2093.jpg`) is never guessed at. It is reported as
 *     unmatched with a plain instruction: rename it.
 *   - HEIC is refused rather than silently mangled: browsers cannot decode it
 *     reliably, so the school is told to export JPEG.
 *   - Two files for one admission number is a duplicate, not "last one wins" —
 *     the first is kept and the second is reported with the name of the winner.
 *   - An existing photograph is a *replace*, counted separately, because it
 *     destroys a picture the school may have consent for.
 *
 * See src/lib/media/policy.ts for whether a photograph may be stored at all.
 */

export type BulkPhotoPolicy = 'none' | 'optional' | 'required'

/** Types a browser can reliably decode and re-encode to JPEG. */
export const BULK_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Same ceiling the single-photo uploader enforces. */
export const BULK_PHOTO_MAX_BYTES = 2 * 1024 * 1024

export const BULK_PHOTO_HINT =
  'Name each file after the admission number — ADM-2026-014.jpg. JPEG, PNG or WebP, under 2 MB, one file per learner.'

export type BulkPhotoStatus =
  | 'ready'
  | 'replace'
  | 'unmatched'
  | 'duplicate'
  | 'unsupported'
  | 'oversize'

export type BulkPhotoFile = {
  name: string
  type: string
  size: number
}

export type BulkPhotoStudent = {
  id: string
  name: string
  className?: string
  hasPhoto?: boolean
}

export type BulkPhotoRow = {
  /** the file the school picked, exactly as it came off the disk */
  fileName: string
  /** normalised admission number, or "" when the name yields nothing usable */
  admissionKey: string
  status: BulkPhotoStatus
  studentId?: string
  studentName?: string
  className?: string
  /** what the school should understand about this row */
  note: string
}

export type BulkPhotoPlan = {
  rows: BulkPhotoRow[]
  counts: Record<BulkPhotoStatus, number>
  /** rows that would actually upload: ready + replace */
  importable: BulkPhotoRow[]
  /** everything the school must look at first */
  blocked: BulkPhotoRow[]
  /** ready + replace — the number on the button */
  matched: number
}

/** Camera and messaging-app prefixes that are never an admission number. */
const CAMERA_PREFIX = /^(IMG|DSC|DSCN|PXL|MVIMG|PHOTO|WA|Screenshot|Snapchat|received)/i

/**
 * Admission number from a filename.
 *
 * `ADM-2026-014.jpg`, `adm 2026 014.JPG`, `ADM_2026_014 (1).png` and
 * `ADM-2026-014 copy.jpg` all collapse to `ADM-2026-014`. Anything else —
 * including `IMG_2093.jpg` — returns whatever token the name yields, which is
 * then looked up in the register and almost certainly reported unmatched.
 */
export function admissionKeyFromFile(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName
  const withoutExtension = base.replace(/\.[^.]+$/, '')
  if (!withoutExtension) return ''

  return withoutExtension
    // Windows/macOS duplicate markers: "ADM-2026-014 (2)", "ADM-2026-014 copy 2"
    .replace(/\s*\(\d+\)$/, '')
    .replace(/[-\s]?copy(\s*\d+)?$/i, '')
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

function statusCounts(): Record<BulkPhotoStatus, number> {
  return { ready: 0, replace: 0, unmatched: 0, duplicate: 0, unsupported: 0, oversize: 0 }
}

/**
 * Plan an import. The returned rows are in the same order as `files`, so the
 * caller can pair `rows[i]` with the original `File` object to upload it.
 */
export function planBulkPhotos(
  files: BulkPhotoFile[],
  students: BulkPhotoStudent[],
  policy: BulkPhotoPolicy = 'optional'
): BulkPhotoPlan {
  const counts = statusCounts()
  const rows: BulkPhotoRow[] = []

  // A school with PHOTO_POLICY=none has said no. Every file is refused, and the
  // reason is the policy — not the filename — so the message is not misleading.
  if (policy === 'none') {
    for (const file of files) {
      rows.push({
        fileName: file.name,
        admissionKey: admissionKeyFromFile(file.name),
        status: 'unsupported',
        note: 'This school keeps no learner photographs (PHOTO_POLICY=none).',
      })
      counts.unsupported += 1
    }
    return { rows, counts, importable: [], blocked: rows, matched: 0 }
  }

  const byAdmission = new Map<string, BulkPhotoStudent>()
  for (const student of students) {
    const key = admissionKeyFromFile(student.id)
    if (key) byAdmission.set(key, student)
  }

  const claimed = new Map<string, string>() // admission key → the file that won it

  for (const file of files) {
    const admissionKey = admissionKeyFromFile(file.name)
    const type = (file.type || '').toLowerCase()

    if (!(BULK_PHOTO_TYPES as readonly string[]).includes(type)) {
      const isHeic = /heic|heif/i.test(type) || /\.hei[cf]$/i.test(file.name)
      rows.push({
        fileName: file.name,
        admissionKey,
        status: 'unsupported',
        note: isHeic
          ? 'HEIC is not decoded by browsers — export it as JPEG first.'
          : `Not an image a browser can read${type ? ` (${type})` : ''}. Use JPEG, PNG or WebP.`,
      })
      counts.unsupported += 1
      continue
    }

    if (file.size > BULK_PHOTO_MAX_BYTES) {
      rows.push({
        fileName: file.name,
        admissionKey,
        status: 'oversize',
        note: `${(file.size / (1024 * 1024)).toFixed(1)} MB — the limit is 2 MB per photograph.`,
      })
      counts.oversize += 1
      continue
    }

    if (!admissionKey) {
      rows.push({
        fileName: file.name,
        admissionKey,
        status: 'unmatched',
        note: 'No admission number in the filename.',
      })
      counts.unmatched += 1
      continue
    }

    if (claimed.has(admissionKey)) {
      rows.push({
        fileName: file.name,
        admissionKey,
        status: 'duplicate',
        note: `Same admission number as ${claimed.get(admissionKey)} — that file is the one kept.`,
      })
      counts.duplicate += 1
      continue
    }
    claimed.set(admissionKey, file.name)

    const student = byAdmission.get(admissionKey)
    if (!student) {
      rows.push({
        fileName: file.name,
        admissionKey,
        status: 'unmatched',
        note: CAMERA_PREFIX.test(file.name)
          ? 'This looks like a camera filename — rename it to the admission number.'
          : `No learner in this register has admission number ${admissionKey}.`,
      })
      counts.unmatched += 1
      continue
    }

    const replace = student.hasPhoto === true
    rows.push({
      fileName: file.name,
      admissionKey,
      status: replace ? 'replace' : 'ready',
      studentId: student.id,
      studentName: student.name,
      className: student.className,
      note: replace
        ? `Replaces the photograph already on file for ${student.name}.`
        : `Will be attached to ${student.name}${student.className ? ` · ${student.className}` : ''}.`,
    })
    counts[replace ? 'replace' : 'ready'] += 1
  }

  const importable = rows.filter((row) => row.status === 'ready' || row.status === 'replace')
  const blocked = rows.filter((row) => row.status !== 'ready' && row.status !== 'replace')

  return { rows, counts, importable, blocked, matched: importable.length }
}

/** One line for a toast or a dialog header. */
export function describeBulkPhotoPlan(plan: BulkPhotoPlan): string {
  if (plan.rows.length === 0) return 'No photographs chosen yet.'
  const parts: string[] = []
  if (plan.importable.length > 0) {
    const replacing = plan.counts.replace > 0 ? ` (${plan.counts.replace} replacing)` : ''
    parts.push(`${plan.importable.length} ready${replacing}`)
  }
  if (plan.counts.unmatched > 0) parts.push(`${plan.counts.unmatched} unmatched`)
  if (plan.counts.duplicate > 0) parts.push(`${plan.counts.duplicate} duplicate`)
  if (plan.counts.unsupported > 0) parts.push(`${plan.counts.unsupported} unsupported`)
  if (plan.counts.oversize > 0) parts.push(`${plan.counts.oversize} too large`)
  return parts.join(' · ')
}
