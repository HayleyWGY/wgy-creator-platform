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
