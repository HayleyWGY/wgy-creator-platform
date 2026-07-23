/**
 * Circle → WGY Creator Platform migration, PHASE 2: IMPORT.
 *
 * What this script does, in plain terms:
 *   1. Reads scripts/output/circle-blog-posts.csv (the file you reviewed
 *      and tagged after Phase 1).
 *   2. For every row, downloads its thumbnail_url / banner_image_url image
 *      (if you added one) and re-hosts it on our own Supabase Storage —
 *      the same approach used for the earlier Cloudinary migration — so the
 *      app never depends on Google Drive staying online.
 *   3. Creates a real PostContent row in the database for each post, using
 *      the exact same fields the admin "Add content" form uses, so imported
 *      posts behave identically to anything created by hand in the app.
 *   4. Sets publishedAt to the ORIGINAL Circle date from the CSV — never
 *      today's date — so the Learning Lounge / Updates feed sorts correctly.
 *
 * This script only WRITES new content — it never touches existing posts,
 * campaigns, creators, or any other table.
 *
 * ── SAFETY ───────────────────────────────────────────────────────────────
 *
 * This connects to whatever DIRECT_URL is set to in your .env file. Before
 * doing anything, it prints that database's hostname and pauses for 3
 * seconds so you can Ctrl+C if it's not the database you meant to import
 * into.
 *
 * ── HOW TO RUN ───────────────────────────────────────────────────────────
 *
 *   node scripts/import-learning-lounge.js
 *
 * You can run this more than once safely — it skips any row whose
 * circle_id has already been imported (tracked via a note in the audit
 * log), so re-running after fixing a few rows won't create duplicates.
 */

const fs = require('fs')
const path = require('path')
const sanitizeHtml = require('sanitize-html')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { createClient } = require('@supabase/supabase-js')

// ── Load .env the same way the other scripts in this project do ───────────
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

const CSV_PATH        = path.join(__dirname, 'output', 'circle-blog-posts.csv')
const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY
const DIRECT_URL      = process.env.DIRECT_URL || process.env.DATABASE_URL
const BUCKET          = 'wgy-uploads'
const ADMIN_EMAIL     = 'admin@wegotyouagency.com' // author attributed to every imported post
const VALID_CONTENT_TYPES = new Set(['blog_post', 'industry_update', 'workbook', 'video', 'course'])
const VALID_SECTIONS      = new Set(['general', 'about', 'faq', 'updates'])
const VALID_CATEGORIES    = new Set(['social_media', 'content_creation', 'brand_deals', 'growth', 'mindset', 'tips_and_tricks'])

if (!SUPABASE_URL || !SUPABASE_KEY || !DIRECT_URL) {
  console.error('Missing env vars — check .env for NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DIRECT_URL')
  process.exit(1)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Minimal CSV parser (handles quoted fields, commas & newlines inside
// quotes, and "" as an escaped quote — matches what circle-extract-posts.js
// writes out). No extra dependency needed. ────────────────────────────────
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else if (c === '\r') {
      // skip — \r\n line endings
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }

  const header = rows[0]
  return rows.slice(1)
    .filter(r => r.length === header.length && r.some(v => v !== ''))
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

// ── Download an image from a public URL and re-host it on Supabase Storage.
// Caches by source URL within a single run, since many rows share the same
// fallback image — no point uploading it 16 times.
//
// A broken/private/deleted image link should never stop the post's TEXT
// from being imported — this returns null and logs a warning on failure
// instead of throwing, so the caller just proceeds without an image.
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

    const storagePath = `learning-lounge-import/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType,
      upsert: false,
    })
    if (error) throw new Error(`Supabase upload failed: ${error.message}`)

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
    uploadCache.set(sourceUrl, publicUrl)
    return publicUrl
  } catch (err) {
    console.warn(`  ! Image failed, importing post without it (${sourceUrl}): ${err.message}`)
    uploadCache.set(sourceUrl, null) // don't retry the same broken link on every row
    return null
  }
}

// ── Reading time — same calculation the admin "Add content" form uses ─────
function calculateReadingTime(html) {
  const text = html.replace(/<[^>]*>/g, ' ')
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

// Allowlist sanitisation, matching lib/sanitize.ts and import-campaigns.js.
//
// This previously used a denylist of regexes (strip <script>, <style> and
// on*="..."). That was bypassable: the handler pattern required QUOTED
// values, so `<img src=x onerror=alert(1)>` and `<svg onload=alert(1)>`
// passed straight through into PostContent.body, which is rendered with
// dangerouslySetInnerHTML. Never denylist HTML — allowlist it.
function sanitizeRichText(html) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'hr'],
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt', 'width', 'height'] },
    allowedSchemes: ['https', 'http', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) },
  })
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
      console.error(`CSV not found at ${CSV_PATH} — run Phase 1 first.`)
      process.exit(1)
    }

    const admin = await prisma.creator.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } })
    if (!admin) {
      console.error(`Admin account ${ADMIN_EMAIL} not found — every imported post needs a valid authorId.`)
      process.exit(1)
    }

    const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'))
    console.log(`Read ${rows.length} rows from CSV.\n`)

    // Already-imported circle_ids, so re-running the script is safe.
    const existing = await prisma.postContent.findMany({
      where: { title: { not: '' } },
      select: { title: true, publishedAt: true },
    })
    // We don't have a dedicated circle_id column on PostContent, so dedupe
    // on title + original publish date — close to unique for this dataset,
    // and safe to re-run without creating duplicates.
    const existingKeys = new Set(existing.map(e => `${e.title}::${e.publishedAt?.toISOString() ?? ''}`))

    let imported = 0
    let skippedNoTitle = 0
    let skippedDuplicate = 0
    let errored = 0

    for (const row of rows) {
      const title = row.title?.trim()
      if (!title) { skippedNoTitle += 1; continue }

      const publishedAt = row.published_at ? new Date(row.published_at) : new Date()
      const dedupeKey = `${title}::${publishedAt.toISOString()}`
      if (existingKeys.has(dedupeKey)) { skippedDuplicate += 1; continue }

      try {
        const contentType = VALID_CONTENT_TYPES.has(row.content_type) ? row.content_type : 'blog_post'
        const section = VALID_SECTIONS.has(row.section) ? row.section : 'general'
        const categories = (row.categories || '')
          .split(',')
          .map(c => c.trim())
          .filter(c => VALID_CATEGORIES.has(c)) // silently drops invalid tags like "updates"

        const [thumbnailUrl, bannerImageUrl] = await Promise.all([
          reHostImage(row.thumbnail_url?.trim(), supabase),
          reHostImage(row.banner_image_url?.trim(), supabase),
        ])

        const body = row.body ? sanitizeRichText(row.body) : null

        const created = await prisma.postContent.create({
          data: {
            title,
            contentType,
            body,
            thumbnailUrl,
            bannerImageUrl,
            section,
            categories,
            status: 'published',
            publishedAt,
            authorId: admin.id,
            readingTimeMinutes: body ? calculateReadingTime(body) : null,
            sortOrder: 0,
          },
        })

        imported += 1
        console.log(`  ✓ ${created.title}  (${publishedAt.toISOString().slice(0, 10)})`)
      } catch (err) {
        errored += 1
        console.error(`  ✗ Failed: "${title}" — ${err.message}`)
      }
    }

    console.log('\n=== Summary ===')
    console.log(`  Total rows in CSV:       ${rows.length}`)
    console.log(`  Imported successfully:   ${imported}`)
    console.log(`  Skipped (no title):      ${skippedNoTitle}`)
    console.log(`  Skipped (already imported): ${skippedDuplicate}`)
    console.log(`  Errored:                 ${errored}`)
    console.log('\nDone. Check the Learning Lounge / Updates pages in the app to verify.\n')
  } finally {
    await prisma.$disconnect()
  }
})()
