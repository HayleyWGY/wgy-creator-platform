import { z } from 'zod'
import { NextResponse } from 'next/server'

/**
 * Shared request validation. ONE place, reused across routes — the divergence
 * this replaces came from each route hand-rolling (or skipping) its own checks.
 *
 * Route handlers call parseJson(schema, body); on failure they return the
 * ready-made 400. The response keeps `error` as a human-readable STRING
 * (every client reads data.error) and adds a `details` array for field info,
 * so no client needs changing.
 */

// Limits confirmed with the product owner: bio 500, message 4000, niches 10.
// The rest are sensible caps well above real usage.
export const LIMITS = {
  name: 100,
  bio: 500,
  handle: 100,
  url: 500,
  addressPart: 200,
  address: 500,
  contactNumber: 50,
  gender: 50,
  message: 4000,
  nicheCount: 10,
  nicheLen: 40,
  title: 200,
  brandName: 200,
  htmlBody: 20_000,
  arrayItems: 20,
  arrayItemLen: 200,
} as const

// ── Reusable field schemas ────────────────────────────────────────────────

/** Required single-line text, trimmed. */
const requiredText = (max: number) => z.string().trim().min(1).max(max)
/** Optional single-line text; '' and null both mean "unset". */
const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional()

/** An https URL, capped, or empty/null. */
const optionalUrl = z
  .string()
  .trim()
  .max(LIMITS.url)
  .refine(v => v === '' || /^https?:\/\//i.test(v), { message: 'must be a valid URL' })
  .nullable()
  .optional()

/**
 * An image URL that MUST be a public object on OUR Supabase Storage — this is
 * the field the upload validation exists to protect, so a client cannot point
 * it at an arbitrary host (the CSP is not input validation). Empty/null clears.
 */
export const supabaseImageUrl = z
  .string()
  .trim()
  .max(LIMITS.url)
  .refine(
    v => {
      if (v === '') return true
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!base) return false
      try {
        const u = new URL(v)
        const b = new URL(base)
        return u.origin === b.origin && u.pathname.startsWith('/storage/v1/object/public/')
      } catch {
        return false
      }
    },
    { message: 'must be an uploaded image on our storage' },
  )
  .nullable()
  .optional()

const nichesSchema = z
  .array(z.string().trim().min(1).max(LIMITS.nicheLen))
  .max(LIMITS.nicheCount)
  .optional()

// ── Per-route schemas ─────────────────────────────────────────────────────

/**
 * Profile PATCH. Only the member-editable public fields; unknown keys are
 * stripped (default), so isAdmin / membershipStatus can never arrive here —
 * which preserves the existing privilege boundary rather than relying on a
 * separate allowlist loop.
 */
export const profilePatchSchema = z.object({
  firstName: requiredText(LIMITS.name).optional(),
  lastName: requiredText(LIMITS.name).optional(),
  bio: optionalText(LIMITS.bio),
  instagramHandle: optionalText(LIMITS.handle),
  tiktokHandle: optionalText(LIMITS.handle),
  youtubeUrl: optionalUrl,
  profileImageUrl: supabaseImageUrl,
  contentNiches: nichesSchema,
  addressLine1: optionalText(LIMITS.addressPart),
  addressLine2: optionalText(LIMITS.addressPart),
  city: optionalText(LIMITS.addressPart),
  postcode: optionalText(LIMITS.addressPart),
  country: optionalText(LIMITS.addressPart),
})

/** Sensitive (encrypted) PII PATCH. Values are strings or null. */
export const sensitivePatchSchema = z.object({
  dateOfBirth: z
    .string()
    .trim()
    .refine(v => v === '' || !Number.isNaN(new Date(v).getTime()), { message: 'invalid date' })
    .nullable()
    .optional(),
  address: optionalText(LIMITS.address),
  contactNumber: optionalText(LIMITS.contactNumber),
  gender: optionalText(LIMITS.gender),
})

/**
 * Admin editing a member: the public profile fields + the encrypted PII fields
 * + email + membership controls. Composed from the same shared field schemas,
 * so a member and an admin editing the same field are validated identically.
 * `currentPassword` (for re-auth) is deliberately NOT here — being unknown, it
 * is stripped, so it can never be written to the creator row; the route reads
 * it straight off the raw body.
 */
export const adminCreatorPatchSchema = profilePatchSchema
  .extend(sensitivePatchSchema.shape)
  .extend({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(200)
      .refine(v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), { message: 'must be a valid email' })
      .optional(),
    membershipStatus: z.enum(['active', 'cancelled', 'payment_failed', 'paused']).optional(),
    membershipType: z.enum(['paid', 'free', 'team']).optional(),
  })

/**
 * A chat room message or a DM. A message may be text OR image-only, so body is
 * optional here — but at least one of the two must be present, and body is
 * still length-capped.
 */
export const chatMessageSchema = z
  .object({
    body: z.string().trim().max(LIMITS.message).optional().nullable(),
    imageUrl: supabaseImageUrl,
  })
  .refine(d => Boolean(d.body?.trim()) || Boolean(d.imageUrl), {
    message: 'a message body or image is required',
  })

const optionalHtml = z.string().max(LIMITS.htmlBody).nullable().optional()
const optionalStringArray = z
  .array(z.string().trim().max(LIMITS.arrayItemLen))
  .max(LIMITS.arrayItems)
  .nullable()
  .optional()

/**
 * Campaign and content create/update. Used as a GATE: the routes keep reading
 * from the raw body (they do their own coercion — parseInt, new Date,
 * sanitizeRichText), so this only REJECTS bad values of the fields it names.
 * Unknown fields are ignored (a default Zod object strips them without
 * erroring), so listing every field isn't required and nothing existing breaks.
 *
 * Image fields are upload-only (admin form -> /api/upload -> Supabase), so they
 * are held to supabaseImageUrl. The external links (brand site/socials, apply
 * link, PDF on Vercel Blob, Canva template, video embed) are format-checked
 * only — they are legitimately off-Supabase.
 */
export const campaignWriteSchema = z.object({
  title: z.string().trim().max(LIMITS.title).optional(),
  brandName: z.string().trim().max(LIMITS.brandName).optional(),
  brandDescription: optionalText(LIMITS.htmlBody),
  opportunityDescription: optionalHtml,
  deliverables: optionalStringArray,
  brandWebsite: optionalUrl,
  brandInstagram: optionalText(LIMITS.handle),
  brandTikTok: optionalText(LIMITS.handle),
  applyLinkUrl: optionalUrl,
  coverImageUrl: supabaseImageUrl,
  brandLogoUrl: supabaseImageUrl,
  paymentAmount: optionalText(LIMITS.addressPart),
  paymentTerms: optionalText(LIMITS.addressPart),
  eventTime: optionalText(LIMITS.addressPart),
  eventLocation: optionalText(LIMITS.addressPart),
  spotsRemaining: z.union([z.string(), z.number()]).nullable().optional(),
})

export const contentWriteSchema = z.object({
  title: z.string().trim().max(LIMITS.title).optional(),
  body: optionalHtml,
  videoTranscript: optionalHtml,
  contentType: optionalText(50),
  section: optionalText(50),
  status: optionalText(30),
  categories: optionalStringArray,
  thumbnailUrl: supabaseImageUrl,
  bannerImageUrl: supabaseImageUrl,
  pdfUrl: optionalUrl,
  editableTemplateUrl: optionalUrl,
  videoEmbedUrl: optionalUrl,
  sortOrder: z.number().int().nullable().optional(),
  // datetime-local string ("2026-07-30T14:30") or null to clear. Was previously
  // read straight off the raw body, bypassing validation; kept permissive here
  // because the route does the `new Date(...)` coercion.
  scheduledAt: z.string().trim().nullable().optional(),
})

// ── Parse helper ──────────────────────────────────────────────────────────

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse }

/**
 * Validate `raw` against `schema`. On success returns the parsed (and
 * coerced/trimmed) data; on failure returns a ready-to-return 400 whose
 * `error` is a human string and `details` lists the offending fields.
 */
export function parseJson<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  headers?: Record<string, string>,
): ParseResult<T> {
  const result = schema.safeParse(raw)
  if (result.success) return { ok: true, data: result.data }

  const details = result.error.issues.map(i => ({
    field: i.path.join('.') || '(body)',
    message: i.message,
  }))
  const first = details[0]
  return {
    ok: false,
    response: NextResponse.json(
      { error: first ? `${first.field}: ${first.message}` : 'Invalid input', details },
      { status: 400, headers },
    ),
  }
}
