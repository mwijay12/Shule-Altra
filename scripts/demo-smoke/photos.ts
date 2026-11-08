/**
 * @fileOverview The bulk photo importer, tested the way a school will break it.
 *
 * A bursar photographs 150 learners on a Friday, copies them off a camera into
 * one folder, and sends the folder. It contains:
 *
 *   - `ADM-2026-014.jpg`      correct, but there is no such learner in this term
 *   - `adm 2026 015.JPG`      lowercase, spaces, an existing photograph
 *   - `ADM_2026_016 (1).png`  a macOS duplicate marker
 *   - `IMG_2093.jpg`          straight off the camera, nothing to match on
 *   - `ADM-2026-017.heic`     an iPhone photo the browser cannot decode
 *   - `ADM-2026-018.jpg`      6 MB, three times the ceiling
 *
 * The plan must be honest about every one of them before anything uploads.
 *
 * Run with: npm run demo:photos
 */

import {
  BULK_PHOTO_HINT,
  BULK_PHOTO_MAX_BYTES,
  admissionKeyFromFile,
  describeBulkPhotoPlan,
  planBulkPhotos,
  type BulkPhotoFile,
  type BulkPhotoStudent,
} from '@/lib/media/bulk-photos'

let failures = 0
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? ` · ${detail}` : ''}`)
}

const MB = 1024 * 1024

const roster: BulkPhotoStudent[] = [
  { id: 'ADM-2026-014', name: 'AGNES AUGUSTINO KILONZO', className: 'Form 2' },
  { id: 'ADM-2026-015', name: 'BARAKA JOSEPH MUSHI', className: 'Form 2', hasPhoto: true },
  { id: 'adm-2026-016', name: 'NEEMA SAID KOMBA', className: 'Form 1' },
]

const file = (name: string, type = 'image/jpeg', size = 400 * 1024): BulkPhotoFile => ({ name, type, size })

/* -------------------------------------------------------------------------- */
/*  Filenames                                                                 */
/* -------------------------------------------------------------------------- */

check(admissionKeyFromFile('ADM-2026-014.jpg') === 'ADM-2026-014', 'plain admission number')
check(admissionKeyFromFile('adm 2026 015.JPG') === 'ADM-2026-015', 'lowercase, spaces, upper-case extension')
check(admissionKeyFromFile('ADM_2026_016.png') === 'ADM-2026-016', 'underscores')
check(admissionKeyFromFile('ADM-2026-014 (2).jpg') === 'ADM-2026-014', 'macOS duplicate marker in brackets')
check(admissionKeyFromFile('ADM-2026-014 copy.jpg') === 'ADM-2026-014', '"copy" suffix')
check(admissionKeyFromFile('ADM-2026-014 copy 2.jpg') === 'ADM-2026-014', '"copy 2" suffix')
check(admissionKeyFromFile('photos/ADM-2026-014.jpg') === 'ADM-2026-014', 'a path is not part of the number')
check(admissionKeyFromFile('C:\\photos\\ADM-2026-014.jpg') === 'ADM-2026-014', 'windows path')
check(admissionKeyFromFile('IMG_2093.jpg') === 'IMG-2093', 'a camera filename still yields a token to look up')

/* -------------------------------------------------------------------------- */
/*  The folder                                                                */
/* -------------------------------------------------------------------------- */

const files: BulkPhotoFile[] = [
  file('ADM-2026-014.jpg'),
  file('adm 2026 015.JPG'),
  file('ADM_2026_016 (1).png', 'image/png'),
  file('ADM-2026-014 (2).jpg'), // duplicate of the first
  file('IMG_2093.jpg'),
  file('ADM-2026-099.jpg'), // nobody
  file('ADM-2026-017.heic', 'image/heic'),
  file('ADM-2026-018.jpg', 'image/jpeg', 6 * MB),
  file('.jpg', 'image/jpeg'), // nothing but an extension
]

const plan = planBulkPhotos(files, roster)

check(plan.rows.length === files.length, 'every file is accounted for', `${plan.rows.length} rows`)
check(
  plan.rows.every((row, index) => row.fileName === files[index].name),
  'rows stay in the order the files were picked',
)

check(plan.counts.ready === 2, 'two fresh photographs', `${plan.counts.ready} ready`)
check(plan.counts.replace === 1, 'one replaces an existing photograph', `${plan.counts.replace} replace`)
check(plan.counts.duplicate === 1, 'one duplicate is refused', `${plan.counts.duplicate} duplicate`)
check(plan.counts.unmatched === 3, 'three cannot be matched', `${plan.counts.unmatched} unmatched`)
check(plan.counts.unsupported === 1, 'HEIC is refused', `${plan.counts.unsupported} unsupported`)
check(plan.counts.oversize === 1, 'a 6 MB file is refused', `${plan.counts.oversize} oversize`)
check(plan.matched === 3, 'three photographs would upload', `${plan.matched} matched`)

const rowFor = (name: string) => plan.rows.find((row) => row.fileName === name)!

check(rowFor('ADM-2026-014.jpg').status === 'ready', 'the clean file is ready')
check(rowFor('ADM-2026-014.jpg').studentId === 'ADM-2026-014', 'and points at the right learner')
check(rowFor('ADM-2026-014.jpg').studentName === 'AGNES AUGUSTINO KILONZO', 'with the name the school knows')

check(rowFor('adm 2026 015.JPG').status === 'replace', 'an existing photograph is a replace, not a silent overwrite')
check(/already on file/i.test(rowFor('adm 2026 015.JPG').note), 'and the row says so')

check(rowFor('ADM_2026_016 (1).png').status === 'ready', 'a lowercase id in the register still matches')

check(rowFor('ADM-2026-014 (2).jpg').status === 'duplicate', 'the second file for one learner is refused')
check(
  rowFor('ADM-2026-014 (2).jpg').note.includes('ADM-2026-014.jpg'),
  'and names the file that won',
)

check(rowFor('IMG_2093.jpg').status === 'unmatched', 'a camera filename is never guessed at')
check(/camera filename/i.test(rowFor('IMG_2093.jpg').note), 'and says what to do about it')
check(rowFor('ADM-2026-099.jpg').status === 'unmatched', 'an unknown admission number is unmatched')
check(rowFor('ADM-2026-099.jpg').note.includes('ADM-2026-099'), 'and repeats the number back')

check(rowFor('ADM-2026-017.heic').status === 'unsupported', 'HEIC is refused')
check(/jpeg/i.test(rowFor('ADM-2026-017.heic').note), 'with a way forward')

check(rowFor('ADM-2026-018.jpg').status === 'oversize', 'over 2 MB is refused')
check(rowFor('ADM-2026-018.jpg').note.includes('6.0 MB'), 'and reports the real size')

check(rowFor('.jpg').status === 'unmatched', 'a file with no name left is unmatched')

check(
  plan.importable.every((row) => row.status === 'ready' || row.status === 'replace'),
  'the importable list contains only uploadable rows',
)
check(plan.blocked.length === files.length - plan.matched, 'and everything else is blocked')

/* -------------------------------------------------------------------------- */
/*  The policy                                                                */
/* -------------------------------------------------------------------------- */

const forbidden = planBulkPhotos(files, roster, 'none')
check(forbidden.matched === 0, 'PHOTO_POLICY=none imports nothing')
check(forbidden.rows.every((row) => row.status === 'unsupported'), 'every row is refused')
check(
  forbidden.rows.every((row) => /PHOTO_POLICY=none/.test(row.note)),
  'and the reason is the policy, not the filename',
)

const required = planBulkPhotos([file('ADM-2026-014.jpg')], roster, 'required')
check(required.matched === 1, 'PHOTO_POLICY=required still plans the upload')

/* -------------------------------------------------------------------------- */
/*  Edges                                                                     */
/* -------------------------------------------------------------------------- */

const empty = planBulkPhotos([], roster)
check(empty.matched === 0, 'an empty folder imports nothing')
check(describeBulkPhotoPlan(empty) === 'No photographs chosen yet.', 'and says so')

const onlyDuplicates = planBulkPhotos(
  [file('ADM-2026-014.jpg'), file('ADM_2026_014.png', 'image/png')],
  roster,
)
check(onlyDuplicates.matched === 1, 'a duplicate does not double-count')
check(/1 ready · 1 duplicate/.test(describeBulkPhotoPlan(onlyDuplicates)), 'the summary reads plainly', describeBulkPhotoPlan(onlyDuplicates))

const noRoster = planBulkPhotos([file('ADM-2026-014.jpg')], [])
check(noRoster.matched === 0, 'an empty register matches nothing')

const atLimit = planBulkPhotos([file('ADM-2026-014.jpg', 'image/jpeg', BULK_PHOTO_MAX_BYTES)], roster)
check(atLimit.matched === 1, 'exactly 2 MB is allowed')

check(BULK_PHOTO_HINT.includes('ADM-2026-014.jpg'), 'the hint teaches the naming convention')

console.log(
  failures === 0
    ? '\nBULK PHOTOS HOLD — a folder is matched by admission number, never by hope'
    : `\n${failures} BULK PHOTO CHECK(S) FAILED`
)
process.exit(failures === 0 ? 0 : 1)
