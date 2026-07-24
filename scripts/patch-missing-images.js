/**
 * One-off patch: fixes the 136 Learning Lounge/Updates posts that imported
 * without an image because the Google Drive link had a typo (an extra
 * leading "1" — id=11y2AC3P... instead of the correct id=1y2AC3P...).
 *
 * Finds every PostContent row (by exact title match against the CSV) that
 * used the broken link, downloads the corrected image once, re-hosts it on
 * Supabase Storage, and updates thumbnailUrl + bannerImageUrl.
 *
 * Run with: node scripts/patch-missing-images.js
 */

const fs = require('fs')
const crypto = require('crypto')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { createClient } = require('@supabase/supabase-js')

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

const CSV_PATH     = path.join(__dirname, 'output', 'circle-blog-posts.csv')
const BROKEN_ID    = '11y2AC3PMiVceBbt4R4pZxgVCVUDBktYVo'
const FIXED_URL    = 'https://drive.google.com/uc?export=view&id=1y2AC3PMiVceBbt4R4pZxgVCVUDBktYVo'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DIRECT_URL   = process.env.DIRECT_URL || process.env.DATABASE_URL
const BUCKET       = 'wgy-uploads'

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
  return rows.slice(1).filter(r => r.length === header.length).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

;(async () => {
  const adapter = new PrismaPg({ connectionString: DIRECT_URL, max: 1 })
  const prisma = new PrismaClient({ adapter })
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  try {
    const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'))
    const affectedTitles = rows
      .filter(r => (r.thumbnail_url + r.banner_image_url).includes(BROKEN_ID))
      .map(r => r.title.trim())

    console.log(`Found ${affectedTitles.length} affected titles in CSV.`)

    // Download the corrected image once and re-host it on Supabase.
    const res = await fetch(FIXED_URL, { redirect: 'follow' })
    if (!res.ok) throw new Error(`Could not download fixed image: HTTP ${res.status}`)
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const bytes = Buffer.from(await res.arrayBuffer())
    const storagePath = `learning-lounge-import/${Date.now()}-${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, { contentType, upsert: false })
    if (error) throw new Error(`Supabase upload failed: ${error.message}`)
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
    console.log(`Re-hosted corrected image at: ${publicUrl}\n`)

    let patched = 0
    let notFound = 0

    for (const title of affectedTitles) {
      const result = await prisma.postContent.updateMany({
        where: { title, thumbnailUrl: null },
        data: { thumbnailUrl: publicUrl, bannerImageUrl: publicUrl },
      })
      if (result.count > 0) {
        patched += result.count
        console.log(`  ✓ ${title}`)
      } else {
        notFound += 1
        console.log(`  ! No matching row (already has an image, or title mismatch): ${title}`)
      }
    }

    console.log('\n=== Summary ===')
    console.log(`  Titles from CSV:  ${affectedTitles.length}`)
    console.log(`  Patched:          ${patched}`)
    console.log(`  Not found/skipped: ${notFound}`)
  } finally {
    await prisma.$disconnect()
  }
})()
