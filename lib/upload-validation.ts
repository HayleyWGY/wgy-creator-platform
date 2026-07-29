/**
 * Shared validation for creator image uploads.
 *
 * Pure and side-effect free so it can be unit tested (see
 * tests/upload-validation.test.ts) — the route handler stays a thin wrapper
 * around it.
 *
 * Security notes:
 *  - The extension is derived from the validated MIME type, NEVER from the
 *    client-supplied filename (which an attacker controls).
 *  - SVG is deliberately excluded: it can carry embedded scripts and these
 *    files are served from a public bucket.
 *  - Upload routes run with the service-role key (bypasses RLS), so the
 *    destination path is always built server-side.
 */

import crypto from 'node:crypto'

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB — creator uploads
export const MAX_ADMIN_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB — admin banners

export type UploadValidationResult =
  | { ok: true; ext: string }
  | { ok: false; error: string }

/**
 * Validates an uploaded image's MIME type and size. maxBytes defaults to the
 * creator limit; admin routes pass the larger allowance.
 */
export function validateImageUpload(
  type: string | undefined | null,
  size: number | undefined | null,
  maxBytes: number = MAX_IMAGE_BYTES,
): UploadValidationResult {
  const ext = type ? ALLOWED_IMAGE_TYPES[type] : undefined
  if (!ext) {
    return { ok: false, error: 'Only JPEG, PNG, WebP or GIF images are allowed' }
  }
  if (typeof size !== 'number' || size <= 0) {
    return { ok: false, error: 'No file provided' }
  }
  if (size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024))
    return { ok: false, error: `Image must be under ${mb}MB` }
  }
  return { ok: true, ext }
}

/**
 * Detects an image's ACTUAL type from its leading bytes (the file signature /
 * "magic number"), independent of any client-declared MIME. Returns the
 * canonical MIME string, or null if the bytes don't match a supported image.
 *
 *   JPEG  FF D8 FF
 *   PNG   89 50 4E 47 0D 0A 1A 0A
 *   GIF   47 49 46 38 (37|39) 61          ("GIF87a" / "GIF89a")
 *   WebP  52 49 46 46 ....  57 45 42 50    ("RIFF"…"WEBP")
 */
export function detectImageMime(buffer: Buffer): string | null {
  const b = buffer
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return 'image/png'
  if (
    b.length >= 6 &&
    b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 &&
    (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61
  ) return 'image/gif'
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return 'image/webp'
  return null
}

/**
 * Verifies the uploaded BYTES actually are the image type the client declared.
 *
 * file.type on a FormData File is set by the client and never checked against
 * the content. Without this, a client can declare image/png and upload
 * arbitrary bytes, which then sit in a PUBLIC bucket served as image/png — an
 * open file host under our brand. This is the content half of the upload fix;
 * buildUploadPath already closed the filename half.
 *
 * Rejects when the bytes match no supported image, OR when they match a
 * DIFFERENT image than declared. Returns the extension for the (verified)
 * real type on success.
 */
export function verifyImageBytes(
  buffer: Buffer,
  declaredType: string | undefined | null,
): UploadValidationResult {
  const detected = detectImageMime(buffer)
  if (!detected) {
    return { ok: false, error: 'File is not a valid JPEG, PNG, WebP or GIF image' }
  }
  if (detected !== declaredType) {
    return { ok: false, error: 'File contents do not match the declared image type' }
  }
  return { ok: true, ext: ALLOWED_IMAGE_TYPES[detected] }
}

/**
 * Builds the server-side storage path. The filename is generated here —
 * nothing from the client's filename is used.
 *
 * The random segment MUST come from a CSPRNG. The storage bucket is public,
 * so an object's URL is the only thing protecting it: anyone who can guess a
 * path can read the file. This previously used Math.random(), which V8
 * implements as xorshift128+ — its internal state is recoverable from a
 * modest run of observed outputs, and every subsequent value is then
 * predictable. Upload URLs are routinely visible (profile images, post
 * attachments), so an attacker had ample samples to work from.
 *
 * randomUUID() gives 122 bits from the platform CSPRNG. The Date.now()
 * prefix is kept purely for operational legibility (sorting, lifecycle
 * rules); it neither adds to nor subtracts from the unguessability, which
 * rests entirely on the UUID.
 */
export function buildUploadPath(prefix: string, ext: string): string {
  const unique = `${Date.now()}-${crypto.randomUUID()}`
  return `${prefix}/${unique}.${ext}`
}
