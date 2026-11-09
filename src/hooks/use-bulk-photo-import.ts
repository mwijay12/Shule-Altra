'use client';

/**
 * @fileOverview Bulk photograph import: plan a folder, then store what it approved.
 *
 * planBulkPhotos is the query, handleCommitPhotoImport is the command. Splitting
 * them lets the dialog show counts before anything is written.
 *
 * Returned names match the ones the students dialog already used.
 */

import * as React from 'react';
import { doc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { uploadStudentPhoto } from '@/lib/storage';
import { planBulkPhotos, type BulkPhotoPlan } from '@/lib/media/bulk-photos';
import type { PhotoPolicy } from '@/lib/media/policy';

interface ImportStudent {
  id: string;
  name: string;
  class: string;
  photoUrl?: string | null;
}

export function useBulkPhotoImport({
  db,
  schoolId,
  students,
  policy,
  canCapture,
  attestedBy,
}: {
  db: Firestore;
  schoolId: string;
  students: ImportStudent[];
  policy: PhotoPolicy;
  canCapture: boolean;
  attestedBy: string;
}) {
  const { toast } = useToast();
  const [isPhotoImportOpen, setIsPhotoImportOpen] = React.useState(false);
  const [photoImportFiles, setPhotoImportFiles] = React.useState<File[]>([]);
  const [photoImportPlan, setPhotoImportPlan] = React.useState<BulkPhotoPlan | null>(null);
  const [photoConsentAttested, setPhotoConsentAttested] = React.useState(false);
  const [photoImportBusy, setPhotoImportBusy] = React.useState(false);
  const [photoImportProgress, setPhotoImportProgress] = React.useState({ done: 0, total: 0 });
  const [photoImportFailures, setPhotoImportFailures] = React.useState<string[]>([]);

  const reset = React.useCallback(() => {
    setPhotoImportFiles([]);
    setPhotoImportPlan(null);
    setPhotoConsentAttested(false);
    setPhotoImportFailures([]);
    setPhotoImportProgress({ done: 0, total: 0 });
  }, []);

  const onImportOpenChange = React.useCallback(
    (open: boolean) => {
      setIsPhotoImportOpen(open);
      if (!open) reset();
    },
    [reset],
  );

  /** Classify every file. No uploads, no writes. */
  const handlePhotoFolder = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const picked = Array.from(event.target.files ?? []);
      event.target.value = '';
      setPhotoImportFailures([]);
      setPhotoImportProgress({ done: 0, total: 0 });
      setPhotoImportFiles(picked);
      setPhotoImportPlan(
        planBulkPhotos(
          picked.map((file) => ({ name: file.name, type: file.type, size: file.size })),
          students.map((student) => ({
            id: student.id,
            name: student.name,
            className: student.class,
            hasPhoto: Boolean(student.photoUrl),
          })),
          policy,
        ),
      );
    },
    [students, policy],
  );

  /**
   * Store the photographs the plan approved, one at a time.
   *
   * Each file goes through the same uploadStudentPhoto boundary as a single
   * capture (400 px, EXIF stripped, 2 MB cap) and records who attested consent.
   * A failure on row 40 leaves rows 1-39 stored: the school sees exactly what
   * landed, and the live query refreshes the register.
   */
  const handleCommitPhotoImport = React.useCallback(async () => {
    if (!photoImportPlan || photoImportPlan.importable.length === 0) return;
    if (!canCapture) {
      toast({
        variant: 'destructive',
        title: 'Photographs are disabled',
        description: 'This school keeps no learner photographs (PHOTO_POLICY=none).',
      });
      return;
    }
    if (!photoConsentAttested) {
      toast({
        variant: 'destructive',
        title: 'Consent not confirmed',
        description: 'Confirm that each guardian agreed before photographs are stored.',
      });
      return;
    }

    setPhotoImportBusy(true);
    setPhotoImportFailures([]);
    const total = photoImportPlan.importable.length;
    setPhotoImportProgress({ done: 0, total });

    const failures: string[] = [];
    let done = 0;

    for (const row of photoImportPlan.importable) {
      const file = photoImportFiles[photoImportPlan.rows.indexOf(row)];
      try {
        if (!row.studentId) throw new Error('no learner on this row');
        if (!file) throw new Error('the file is no longer available — choose the folder again');
        const photoUrl = await uploadStudentPhoto(schoolId, row.studentId, file);
        await setDoc(
          doc(db, 'schools', schoolId, 'students', row.studentId),
          {
            photoUrl,
            photoUpdatedAt: serverTimestamp(),
            photoConsent: {
              granted: true,
              by: attestedBy,
              method: 'bulk-import',
              fileName: row.fileName,
              at: serverTimestamp(),
            },
          },
          { merge: true },
        );
      } catch (err: any) {
        failures.push(`${row.fileName} — ${err?.message ?? 'upload failed'}`);
      } finally {
        done += 1;
        setPhotoImportProgress({ done, total });
      }
    }

    const stored = total - failures.length;
    setPhotoImportFailures(failures);
    setPhotoImportBusy(false);

    toast({
      variant: stored === 0 ? 'destructive' : 'default',
      title: stored === 0 ? 'No photographs stored' : `${stored} photograph${stored === 1 ? '' : 's'} stored`,
      description:
        failures.length === 0
          ? 'Consent recorded with each one. ID cards will use them immediately.'
          : `${failures.length} failed — the list is in the dialog, nothing else was lost.`,
    });

    if (failures.length === 0) {
      setIsPhotoImportOpen(false);
      reset();
    }
  }, [photoImportPlan, photoImportFiles, canCapture, photoConsentAttested, db, schoolId, attestedBy, toast, reset]);

  return {
    isPhotoImportOpen,
    setIsPhotoImportOpen,
    onImportOpenChange,
    photoImportPlan,
    photoConsentAttested,
    setPhotoConsentAttested,
    photoImportBusy,
    photoImportProgress,
    photoImportFailures,
    handlePhotoFolder,
    handleCommitPhotoImport,
  };
}
