/**
 * @fileOverview Cloudinary as the photograph keeper, when Firebase Storage
 * cannot be the one.
 *
 * Firebase's **Spark** plan does not include Storage: `storageBucket` exists in
 * the config, the SDK loads, and every upload fails with a permission error that
 * reads like a rules mistake. Most Tanzanian schools will start on Spark. So the
 * product has to be able to store a child's photograph somewhere that is free to
 * start and priced sanely at 20 schools.
 *
 * Uploads are **unsigned**: the browser posts the already-compressed JPEG to an
 * upload preset the school created in the Cloudinary console. No API secret ever
 * reaches the client. Deletion cannot be unsigned, so it goes through
 * `/api/media/delete`, which signs a `destroy` request server-side with
 * `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`.
 *
 * Env (public, safe to expose):
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
 *
 * Env (server only, never NEXT_PUBLIC_):
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */

export const CLOUDINARY_CLOUD_NAME = (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '').trim()
export const CLOUDINARY_UPLOAD_PRESET = (process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '').trim()

/** Is a browser upload to Cloudinary possible with this build? */
export function cloudinaryConfigured(): boolean {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET)
}

/** True for any delivery URL Cloudinary served us. */
export function isCloudinaryUrl(url: string | null | undefined): boolean {
  return Boolean(url && /^https:\/\/res\.cloudinary\.com\//i.test(url))
}

/**
 * `https://res.cloudinary.com/<cloud>/image/upload/v1712345678/schools/school-001/students/ADM-2026-014_ab12cd.jpg`
 * → `schools/school-001/students/ADM-2026-014_ab12cd`
 *
 * The version segment and every transformation segment are skipped; the public
 * id is everything after the last `/upload/`, without the extension.
 */
export function cloudinaryPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(.+)$/i)
  if (!match) return null
  const afterUpload = match[1]
    .split('/')
    .filter((segment) => !/^v\d+$/.test(segment) && !segment.includes(','))
    .join('/')
  return afterUpload.replace(/\.[a-z0-9]+$/i, '') || null
}

/**
 * A delivery URL sized for its purpose.
 *
 * `g_face` is the point: a 400×400 thumbnail taken from the centre cuts off
 * foreheads, and an ID card with a face cropped at the eyebrows looks like a
 * mistake. Cloudinary finds the face and keeps it.
 */
export function cloudinaryThumb(url: string, size = 160): string {
  if (!isCloudinaryUrl(url)) return url
  return url.replace('/upload/', `/upload/c_fill,g_face,w_${size},h_${size},q_auto,f_auto/`)
}

export type CloudinaryUpload = {
  url: string
  publicId: string
}

/**
 * Upload one already-compressed photograph. Throws with a message a bursar can
 * act on, an unsigned preset with the wrong name is the common failure.
 */
export async function uploadToCloudinary(
  blob: Blob,
  options: { folder: string; publicId: string }
): Promise<CloudinaryUpload> {
  if (!cloudinaryConfigured()) {
    throw new Error(
      'Cloudinary is not configured (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET).'
    )
  }

  const form = new FormData()
  form.append('file', blob, `${options.publicId}.jpg`)
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  form.append('folder', options.folder)
  form.append('public_id', options.publicId)
  form.append('tags', 'student-photo,shule-altra')

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/upload`,
    { method: 'POST', body: form }
  )

  const payload = (await response.json().catch(() => ({}))) as {
    secure_url?: string
    public_id?: string
    error?: { message?: string }
  }

  if (!response.ok || !payload.secure_url) {
    const reason = payload.error?.message ?? `Cloudinary returned ${response.status}`
    throw new Error(
      /preset/i.test(reason)
        ? `The Cloudinary upload preset “${CLOUDINARY_UPLOAD_PRESET}” was refused — make it an unsigned preset in Settings → Upload.`
        : reason
    )
  }

  return { url: payload.secure_url, publicId: payload.public_id ?? options.publicId }
}
