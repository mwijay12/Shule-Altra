import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { photoCaptureAllowed } from '@/lib/media/policy';
import { DEMO_MODE } from '@/lib/demo/config';

const { storage } = initializeFirebase();

/** Uploads are optional — the dashboard must still work without a bucket. */
function requireStorage() {
  if (!storage) throw new Error('Photo storage is not configured for this Firebase project.');
  return storage;
}

export async function uploadStudentPhoto(
  schoolId: string,
  studentId: string,
  file: File
): Promise<string> {
  // The school's own policy, not the browser's, decides whether a child's
  // photograph may be stored. See src/lib/media/policy.ts.
  if (!photoCaptureAllowed()) {
    throw new Error('This school does not keep learner photographs (PHOTO_POLICY=none).');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files allowed');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Image must be under 2MB');
  }

  const compressed = await compressImage(file, 400, 400);

  // Demo mode has no bucket to upload to, and a photographer should not need one
  // to see a photograph on a card. The re-encoded JPEG is inlined as a data URL
  // instead: same 400 px, same stripped metadata, same consent record — just
  // carried by the document rather than by Storage. Production (DEMO_MODE=false)
  // always goes to Storage; there is no silent fallback there.
  if (DEMO_MODE) return blobToDataUrl(compressed);

  const path = `schools/${schoolId}/students/${studentId}/photo.jpg`;
  const storageRef = ref(requireStorage(), path);
  await uploadBytes(storageRef, compressed, {
    contentType: 'image/jpeg',
  });

  return await getDownloadURL(storageRef);
}

export async function deleteStudentPhoto(
  schoolId: string,
  studentId: string
): Promise<void> {
  // In demo mode the photograph travels inside the document, so clearing the
  // field is the deletion. Nothing is left behind to erase.
  if (DEMO_MODE || !storage) return;

  const path = `schools/${schoolId}/students/${studentId}/photo.jpg`;
  const storageRef = ref(storage, path);
  try {
    await deleteObject(storageRef);
  } catch (e) {
    // Ignore if file doesn't exist
  }
}

/**
 * Downscales to a passport-sized JPEG and, in doing so, drops the original
 * file's metadata.
 *
 * This is a privacy feature, not an optimisation: a phone photo carries EXIF
 * with GPS coordinates, the device serial and the capture time. Drawing it onto
 * a canvas and re-encoding writes a brand-new JPEG containing pixels only —
 * no location, no device, no timestamp. Never "optimise" this into an upload of
 * the raw file.
 */
/** A Blob as a data URL — how the demo carries a photograph without a bucket. */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the compressed photograph'));
    reader.readAsDataURL(blob);
  });
}

function compressImage(file: File, maxWidth: number, maxHeight: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/jpeg',
        0.8
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}