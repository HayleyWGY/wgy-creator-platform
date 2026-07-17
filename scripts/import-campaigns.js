/**
 * Circle → WGY Creator Platform migration, CAMPAIGNS IMPORT.
 *
 * What this script does, in plain terms:
 *   1. Reads scripts/output/circle-campaigns.csv (the file you reviewed
 *      and corrected after the extraction step).
 *   2. For every row, downloads its cover_image_url (if present) and
 *      re-hosts it on our own Supabase Storage — same approach as the
 *      Learning Lounge migration — so the app never depends on Circle
 *      staying online.
 *   3. Creates a real Post (campaign) row in the database for each row,
 *      using the exact same fields the admin "Add campaign" form uses.
 *   4. Sets publishedAt to the ORIGINAL Circle date from the CSV.
 *
 * This script only WRITES new campaigns — it never touches existing
 * campaigns, content, creators, or any other table.
 *
 * ── SAFETY ───────────────────────────────────────────────────────────────
 *
 * Connects to whatever DIRECT_URL is set in .env. Prints the database
 * hostname and pauses 3 seconds before doing anything, so you can Ctrl+C
 * if it's the wrong database.
 *
 * ── HOW TO RUN ───────────────────────────────────────────────────────────
 *
 *   node scripts/import-campaigns.js
 *
 * Safe to re-run — skips any row whose slug has already been imported.
 */

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { createClient } = require('@supabase/supabase-js')
const sanitizeHtml = require('sanitize-html')

// Mirrors lib/sanitize.ts's sanitizeRichText exactly — the single defence
// point for the dangerouslySetInnerHTML render on the campaign detail page.
function sanitizeRichText(html) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'hr'],
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt', 'width', 'height'] },
    allowedSchemes: ['https', 'http', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) },
  })
}

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

const CSV_PATH     = path.join(__dirname, 'output', 'circle-campaigns.csv')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DIRECT_URL   = process.env.DIRECT_URL || process.env.DATABASE_URL
const BUCKET       = 'wgy-uploads'
const ADMIN_EMAIL  = 'admin@wegotyouagency.com'

// campaign_type (CSV) → Section.slug (DB) — matches FILTER_TO_SECTION_SLUG
// in app/api/campaigns/route.ts.
const SECTION_SLUG_BY_TYPE = {
  'pr-gifted':    'pr-gifted-campaigns',
  paid:           'paid-collaborations',
  tiktok:         'tiktok-commission',
  'app-partners': 'app-partners',
  event:          'events',
}

// campaign_type (CSV) → postType label — matches POST_TYPE_LABEL in
// app/api/campaigns/route.ts and [id]/route.ts.
const POST_TYPE_LABEL = {
  'pr-gifted':    'PR / Gifted',
  paid:           'Paid Collab',
  event:          'Event',
  'app-partners': 'App Partners',
  tiktok:         'TikTok Commission',
}

const VALID_STATUSES = new Set(['published', 'closed', 'draft'])

if (!SUPABASE_URL || !SUPABASE_KEY || !DIRECT_URL) {
  console.error('Missing env vars — check .env for NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DIRECT_URL')
  process.exit(1)
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

// ── Same minimal CSV parser used by import-learning-lounge.js ─────────────
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false }
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c === '\r') { /* skip */ }
    else field += c
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  const header = rows[0]
  return rows.slice(1)
    .filter(r => r.length === header.length && r.some(v => v !== ''))
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

// ── Download + re-host an image, same graceful-failure pattern as the
// Learning Lounge import — a broken image link never blocks the campaign
// itself from being created. ────────────────────────────────────────────
const uploadCache = new Map()
async function reHostImage(sourceUrl, supabase) {
  if (!sourceUrl) return null
  if (uploadCache.has(sourceUrl)) return uploadCache.get(sourceUrl)

  try {
    const res = await fetch(sourceUrl, { redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const bytes = Buffer.from(await res.arrayBuffer())

    const storagePath = `campaigns-import/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, { contentType, upsert: false })
    if (error) throw new Error(`Supabase upload failed: ${error.message}`)

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
    uploadCache.set(sourceUrl, publicUrl)
    return publicUrl
  } catch (err) {
    console.warn(`  ! Image failed, importing campaign without it (${sourceUrl}): ${err.message}`)
    uploadCache.set(sourceUrl, null)
    return null
  }
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

;(async () => {
  console.log('\n=== IMPORTING TO DATABASE FROM .env — CONFIRM THIS IS NOT PRODUCTION ===')
  console.log(`Target database host: ${new URL(DIRECT_URL.replace('postgresql://', 'http://')).hostname}`)
  console.log('Pausing 3 seconds — press Ctrl+C now to cancel...\n')
  await sleep(3000)

  const adapter = new PrismaPg({ connectionString: DIRECT_URL, max: 1 })
  const prisma = new PrismaClient({ adapter })
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  try {
    if (!fs.existsSync(CSV_PATH)) {
      console.error(`CSV not found at ${CSV_PATH} — run circle-extract-campaigns.js first.`)
      process.exit(1)
    }

    const admin = await prisma.creator.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } })
    if (!admin) {
      console.error(`Admin account ${ADMIN_EMAIL} not found — every imported campaign needs a valid authorId.`)
      process.exit(1)
    }

    const sections = await prisma.section.findMany({ where: { group: 'OPPORTUNITIES' }, select: { id: true, slug: true } })
    const sectionIdBySlug = Object.fromEntries(sections.map(s => [s.slug, s.id]))
    for (const slug of Object.values(SECTION_SLUG_BY_TYPE)) {
      if (!sectionIdBySlug[slug]) {
        console.error(`Section with slug "${slug}" not found in the database — cannot import that campaign type.`)
        process.exit(1)
      }
    }

    const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'))
    console.log(`Read ${rows.length} rows from CSV.\n`)

    // Existing slugs, so re-running the script never creates duplicates and
    // never trips the unique constraint on Post.slug.
    const existingSlugs = new Set((await prisma.post.findMany({ select: { slug: true } })).map(p => p.slug).filter(Boolean))

    let imported = 0
    let skippedNoTitle = 0
    let skippedDuplicate = 0
    let errored = 0

    for (const row of rows) {
      const title = row.title?.trim()
      if (!title) { skippedNoTitle += 1; continue }

      const campaignType = SECTION_SLUG_BY_TYPE[row.campaign_type] ? row.campaign_type : 'pr-gifted'
      let slug = row.slug?.trim() || slugify(`${row.brand_name || title}-${title}`)
      if (existingSlugs.has(slug)) {
        skippedDuplicate += 1
        continue
      }
      // Guard against two rows in this same CSV slugifying to the same
      // value (we saw one such collision during review).
      let uniqueSlug = slug
      let suffix = 2
      while (existingSlugs.has(uniqueSlug)) {
        uniqueSlug = `${slug}-${suffix}`
        suffix += 1
      }
      slug = uniqueSlug
      existingSlugs.add(slug)

      try {
        const status = VALID_STATUSES.has(row.status) ? row.status : 'published'
        const publishedAt = row.published_at ? new Date(row.published_at) : new Date()
        const opportunityDescription = row.opportunity_description ? sanitizeRichText(row.opportunity_description) : null

        const deliverables = row.deliverables
          ? row.deliverables.split('|').map(d => d.trim()).filter(Boolean)
          : null

        const spotsRemaining = row.spots_remaining && !isNaN(parseInt(row.spots_remaining, 10))
          ? parseInt(row.spots_remaining, 10)
          : null

        const eventDate = row.event_date ? new Date(row.event_date) : null

        const coverImageUrl = await reHostImage(row.cover_image_url?.trim(), supabase)

        const created = await prisma.post.create({
          data: {
            title,
            body: opportunityDescription ?? '',
            brandName: row.brand_name?.trim() || title,
            brandDescription: null, // no reliable source in Circle data — left for manual entry
            opportunityDescription,
            deliverables,
            applyLinkUrl: row.apply_link_url?.trim() || null,
            brandWebsite: row.brand_website?.trim() || null,
            brandInstagram: row.brand_instagram?.trim() || null,
            brandTikTok: row.brand_tiktok?.trim() || null,
            paymentAmount: row.payment_amount?.trim() || null,
            paymentTerms: row.payment_terms?.trim() || null,
            spotsRemaining,
            eventDate,
            eventTime: row.event_time?.trim() || null,
            eventLocation: row.event_location?.trim() || null,
            coverImageUrl,
            campaignType,
            postType: POST_TYPE_LABEL[campaignType],
            status,
            publishedAt: status === 'published' || status === 'closed' ? publishedAt : null,
            slug,
            sectionId: sectionIdBySlug[SECTION_SLUG_BY_TYPE[campaignType]],
            authorId: admin.id,
          },
        })

        imported += 1
        console.log(`  ✓ [${status}] ${created.title}  (${publishedAt.toISOString().slice(0, 10)})`)
      } catch (err) {
        errored += 1
        console.error(`  ✗ Failed: "${title}" — ${err.message}`)
      }
    }

    console.log('\n=== Summary ===')
    console.log(`  Total rows in CSV:          ${rows.length}`)
    console.log(`  Imported successfully:      ${imported}`)
    console.log(`  Skipped (no title):         ${skippedNoTitle}`)
    console.log(`  Skipped (already imported): ${skippedDuplicate}`)
    console.log(`  Errored:                    ${errored}`)
    console.log('\nDone. Check the Opportunities tab in the app to verify.\n')
  } finally {
    await prisma.$disconnect()
  }
})()
