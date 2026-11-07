import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';

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
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files allowed');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Image must be under 2MB');
  }

  // Compress for demo
  const compressed = await compressImage(file, 400, 400);

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
  const path = `schools/${schoolId}/students/${studentId}/photo.jpg`;
  const storageRef = ref(requireStorage(), path);
  try {
    await deleteObject(storageRef);
  } catch (e) {
    // Ignore if file doesn't exist
  }
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