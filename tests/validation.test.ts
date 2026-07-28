import { describe, it, expect, beforeAll } from 'vitest'
import {
  LIMITS,
  parseJson,
  profilePatchSchema,
  sensitivePatchSchema,
  adminCreatorPatchSchema,
  chatMessageSchema,
  supabaseImageUrl,
  campaignWriteSchema,
  contentWriteSchema,
} from '@/lib/validation'

// supabaseImageUrl validates against this at parse time.
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.co'
})

describe('parseJson — consistent 400 shape', () => {
  it('returns a human error string plus field details', async () => {
    const r = parseJson(profilePatchSchema, { bio: 'x'.repeat(LIMITS.bio + 1) })
    expect(r.ok).toBe(false)
    if (r.ok) return
    const payload = await r.response.json()
    expect(r.response.status).toBe(400)
    expect(typeof payload.error).toBe('string') // clients read data.error
    expect(payload.details[0].field).toBe('bio')
  })
})

describe('profile PATCH — the reported defects', () => {
  it('rejects an oversized bio, accepts one at the cap', () => {
    expect(parseJson(profilePatchSchema, { bio: 'x'.repeat(LIMITS.bio + 1) }).ok).toBe(false)
    expect(parseJson(profilePatchSchema, { bio: 'x'.repeat(LIMITS.bio) }).ok).toBe(true)
  })

  it('rejects type confusion: contentNiches as a string (was an unhandled 500)', () => {
    expect(parseJson(profilePatchSchema, { contentNiches: 'nope' }).ok).toBe(false)
  })

  it('caps the niche count and each niche length', () => {
    expect(parseJson(profilePatchSchema, { contentNiches: Array(LIMITS.nicheCount + 1).fill('a') }).ok).toBe(false)
    expect(parseJson(profilePatchSchema, { contentNiches: ['x'.repeat(LIMITS.nicheLen + 1)] }).ok).toBe(false)
    expect(parseJson(profilePatchSchema, { contentNiches: ['fashion', 'beauty'] }).ok).toBe(true)
  })

  it('strips privileged/unknown keys instead of writing them', () => {
    const r = parseJson(profilePatchSchema, { firstName: 'Sam', isAdmin: true, membershipStatus: 'active' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data).not.toHaveProperty('isAdmin')
    expect(r.data).not.toHaveProperty('membershipStatus')
    expect(r.data.firstName).toBe('Sam')
  })
})

describe('profileImageUrl — the upload bypass', () => {
  it('rejects an arbitrary external URL', () => {
    expect(supabaseImageUrl.safeParse('https://attacker.example/track.gif').success).toBe(false)
  })

  it('rejects a lookalike host and a non-storage path on our project', () => {
    expect(supabaseImageUrl.safeParse('https://proj.supabase.co.evil.example/x.png').success).toBe(false)
    expect(supabaseImageUrl.safeParse('https://proj.supabase.co/not-storage/x.png').success).toBe(false)
  })

  it('accepts a real public object on our storage, and empty/null (clear)', () => {
    expect(supabaseImageUrl.safeParse('https://proj.supabase.co/storage/v1/object/public/wgy-uploads/a.png').success).toBe(true)
    expect(supabaseImageUrl.safeParse('').success).toBe(true)
    expect(supabaseImageUrl.safeParse(null).success).toBe(true)
  })
})

describe('chat / DM messages', () => {
  it('caps the body length', () => {
    expect(parseJson(chatMessageSchema, { body: 'x'.repeat(LIMITS.message + 1) }).ok).toBe(false)
    expect(parseJson(chatMessageSchema, { body: 'hello' }).ok).toBe(true)
  })

  it('allows image-only messages but requires body OR image', () => {
    expect(parseJson(chatMessageSchema, { imageUrl: 'https://proj.supabase.co/storage/v1/object/public/x/a.png' }).ok).toBe(true)
    expect(parseJson(chatMessageSchema, {}).ok).toBe(false)
    expect(parseJson(chatMessageSchema, { body: '   ' }).ok).toBe(false)
  })

  it('rejects an off-project image on a message', () => {
    expect(parseJson(chatMessageSchema, { body: 'hi', imageUrl: 'https://evil.example/x.gif' }).ok).toBe(false)
  })
})

describe('sensitive + admin schemas reuse the same field rules', () => {
  it('sensitive PATCH rejects a bad date, accepts null to clear', () => {
    expect(parseJson(sensitivePatchSchema, { dateOfBirth: 'not-a-date' }).ok).toBe(false)
    expect(parseJson(sensitivePatchSchema, { dateOfBirth: null }).ok).toBe(true)
    expect(parseJson(sensitivePatchSchema, { dateOfBirth: '1995-06-01' }).ok).toBe(true)
  })

  it('admin schema validates email and strips currentPassword', () => {
    expect(parseJson(adminCreatorPatchSchema, { email: 'not-an-email' }).ok).toBe(false)
    const r = parseJson(adminCreatorPatchSchema, { email: 'A@B.COM', currentPassword: 'secret' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.email).toBe('a@b.com') // trimmed + lowercased
    expect(r.data).not.toHaveProperty('currentPassword')
  })

  it('admin schema still enforces the shared bio cap', () => {
    expect(parseJson(adminCreatorPatchSchema, { bio: 'x'.repeat(LIMITS.bio + 1) }).ok).toBe(false)
  })
})

describe('campaign / content write gates', () => {
  it('reject an oversized title and an off-project image', () => {
    expect(parseJson(campaignWriteSchema, { title: 'x'.repeat(LIMITS.title + 1) }).ok).toBe(false)
    expect(parseJson(campaignWriteSchema, { coverImageUrl: 'https://evil.example/x.png' }).ok).toBe(false)
    expect(parseJson(contentWriteSchema, { thumbnailUrl: 'https://evil.example/x.png' }).ok).toBe(false)
  })

  it('allow external links (apply/pdf/video/canva) that are valid URLs', () => {
    expect(parseJson(campaignWriteSchema, { applyLinkUrl: 'https://brand.typeform.com/x', brandWebsite: 'https://brand.com' }).ok).toBe(true)
    expect(parseJson(contentWriteSchema, {
      pdfUrl: 'https://abc.public.blob.vercel-storage.com/x.pdf',
      videoEmbedUrl: 'https://youtube.com/embed/x',
      thumbnailUrl: 'https://proj.supabase.co/storage/v1/object/public/wgy/x.png',
    }).ok).toBe(true)
  })

  it('reject type confusion on array fields (deliverables / categories)', () => {
    expect(parseJson(campaignWriteSchema, { deliverables: 'not-an-array' }).ok).toBe(false)
    expect(parseJson(contentWriteSchema, { categories: 'not-an-array' }).ok).toBe(false)
  })

  it('ignore unknown fields (gate lets the route keep its own data flow)', () => {
    // sectionSlug/campaignType/scheduledAt etc. aren't in the schema; they must
    // pass validation (stripped from parsed.data, still present on body).
    expect(parseJson(campaignWriteSchema, { sectionSlug: 'events', campaignType: 'paid', title: 'Ok' }).ok).toBe(true)
  })
})
