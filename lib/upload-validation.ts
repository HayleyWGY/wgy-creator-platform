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
 */
export function buildUploadPath(prefix: string, ext: string): string {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}/${unique}.${ext}`
}
