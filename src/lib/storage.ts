import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { photoCaptureAllowed } from '@/lib/media/policy';
import { DEMO_MODE } from '@/lib/demo/config';
import { brandMediaKey, demoMediaRef, landingMediaKey, putDemoMedia } from '@/lib/demo/media-store';
import {
  cloudinaryConfigured,
  cloudinaryPublicId,
  isCloudinaryUrl,
  uploadToCloudinary,
} from '@/lib/media/cloudinary';

const { storage } = initializeFirebase();

/** Uploads are optional, the dashboard must still work without a bucket. */
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

  // Where the bytes land, in order of preference:
  //
  //  1. Cloudinary, when the school has an unsigned upload preset. This is the
  //     one that works on Firebase's free Spark plan, where Storage is not
  //     included at all, the upload otherwise fails as if the rules were wrong.
  //  2. Demo mode: the JPEG is inlined as a data URL, so the showcase needs no
  //     bucket, no preset and no CORS rule to get wrong.
  //  3. Firebase Storage, for a project that has it.
  if (cloudinaryConfigured()) {
    const upload = await uploadToCloudinary(compressed, {
      folder: `schools/${schoolId}/students`,
      publicId: studentId,
    });
    return upload.url;
  }

  if (DEMO_MODE) return blobToDataUrl(compressed);

  const path = `schools/${schoolId}/students/${studentId}/photo.jpg`;
  const storageRef = ref(requireStorage(), path);
  await uploadBytes(storageRef, compressed, {
    contentType: 'image/jpeg',
  });

  return await getDownloadURL(storageRef);
}

/**
 * Erase a learner's photograph from wherever it actually lives.
 *
 * The caller passes the URL that is stored on the document, because that is the
 * only way to know whether this is a Cloudinary delivery URL, a Firebase object
 * or an inlined data URL. Withdrawal of consent is a button, so this must not
 * guess.
 */
export async function deleteStudentPhoto(
  schoolId: string,
  studentId: string,
  photoUrl?: string | null
): Promise<void> {
  // Cloudinary needs a signed destroy, which can only be built server-side.
  if (isCloudinaryUrl(photoUrl)) {
    const publicId = cloudinaryPublicId(photoUrl as string);
    if (!publicId) return;
    const response = await fetch('/api/media/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ publicId }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? 'Cloudinary refused to delete the photograph.');
    }
    return;
  }

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

/** Which keeper is active this build, surfaced in Settings and the docs. */
export function photoStorageProvider(): 'cloudinary' | 'firebase' | 'inline-demo' | 'none' {
  if (cloudinaryConfigured()) return 'cloudinary';
  if (DEMO_MODE) return 'inline-demo';
  return storage ? 'firebase' : 'none';
}

/**
 * Downscales to a passport-sized JPEG and, in doing so, drops the original
 * file's metadata.
 *
 * This is a privacy feature, not an optimisation: a phone photo carries EXIF
 * with GPS coordinates, the device serial and the capture time. Drawing it onto
 * a canvas and re-encoding writes a brand-new JPEG containing pixels only , 
 * no location, no device, no timestamp. Never "optimise" this into an upload of
 * the raw file.
 */
/** A Blob as a data URL, how the demo carries a photograph without a bucket. */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the compressed photograph'));
    reader.readAsDataURL(blob);
  });
}

function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  mime: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<Blob> {
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
        (blob) => {
          URL.revokeObjectURL(img.src);
          blob ? resolve(blob) : reject(new Error('Compression failed'));
        },
        mime,
        0.92
      );
    };
    img.onerror = (event) => {
      URL.revokeObjectURL(img.src);
      reject(event);
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload a landing-page photograph. Unlike learner portraits these are public
 * marketing assets, but they still must be the school's own consented imagery.
 * The file is downscaled and stripped of EXIF before it leaves the browser.
 */
export async function uploadLandingImage(
  schoolId: string,
  slot: string,
  file: File
): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Only image files allowed');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5MB');

  const compressed = await compressImage(file, 1600, 1600);

  if (cloudinaryConfigured()) {
    const upload = await uploadToCloudinary(compressed, {
      folder: `schools/${schoolId}/landing`,
      publicId: slot,
    });
    return upload.url;
  }

  if (DEMO_MODE) {
    // localStorage cannot hold 14 photographs alongside the seeded database.
    // Keep the blob in IndexedDB and store only a short reference in the doc.
    const key = landingMediaKey(schoolId, slot);
    try {
      await putDemoMedia(key, compressed);
      return demoMediaRef(key);
    } catch (error) {
      // Private mode / blocked storage: still show the photograph this session,
      // but warn, a data URL in the document counts against the small quota.
      console.warn('[DEMO] IndexedDB unavailable, keeping photograph inline for this session:', error);
      return blobToDataUrl(compressed);
    }
  }

  const path = `schools/${schoolId}/landing/${slot}.jpg`;
  const storageRef = ref(requireStorage(), path);
  await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
  return await getDownloadURL(storageRef);
}

/**
 * Upload the school's logo.
 *
 * PNG or JPEG only: the PDF engine embeds those two formats directly, so an SVG
 * would render in the sidebar and then silently vanish from every letterhead.
 * Transparency is preserved, and the image is capped at 512px, a letterhead
 * prints it at 46pt, so anything larger is wasted bytes on every document.
 */
export async function uploadSchoolLogo(schoolId: string, file: File): Promise<string> {
  const allowed = ['image/png', 'image/jpeg'];
  if (!allowed.includes(file.type)) {
    throw new Error('Use a PNG or JPEG logo. SVG cannot be embedded in the PDF letterhead.');
  }
  if (file.size > 2 * 1024 * 1024) throw new Error('Logo must be under 2MB');

  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const compressed = await compressImage(file, 512, 512, mime);

  if (cloudinaryConfigured()) {
    const upload = await uploadToCloudinary(compressed, {
      folder: `schools/${schoolId}/brand`,
      publicId: 'logo',
    });
    return upload.url;
  }

  if (DEMO_MODE) {
    const key = brandMediaKey(schoolId);
    try {
      await putDemoMedia(key, compressed);
      return demoMediaRef(key);
    } catch (error) {
      console.warn('[DEMO] IndexedDB unavailable, keeping the logo inline for this session:', error);
      return blobToDataUrl(compressed);
    }
  }

  const extension = mime === 'image/png' ? 'png' : 'jpg';
  const path = `schools/${schoolId}/brand/logo.${extension}`;
  const storageRef = ref(requireStorage(), path);
  await uploadBytes(storageRef, compressed, { contentType: mime });
  return await getDownloadURL(storageRef);
}
