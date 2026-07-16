// One-shot migration: uploads all Cloudinary-backed images to Supabase Storage
// then patches every DB field that still contains a res.cloudinary.com URL.
//
// Run from project root:
//   node scripts/migrate-cloudinary-to-supabase.mjs
//
// Requires .env to have NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// and DATABASE_URL (or DIRECT_URL). The script reads those via dotenv.

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT  = join(__dir, '..')

// ── Load .env manually (no dotenv dep needed — just parse it) ────────────────
const envFile = readFileSync(join(ROOT, '.env'), 'utf8')
const env = {}
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const SUPABASE_URL      = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY
const DIRECT_URL        = env.DIRECT_URL || env.DATABASE_URL

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !DIRECT_URL) {
  console.error('Missing env vars — check .env for NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DIRECT_URL')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const adapter  = new PrismaPg({ connectionString: DIRECT_URL, max: 1 })
const prisma   = new PrismaClient({ adapter })

const BUCKET      = 'wgy-uploads'
const BACKUP_DIR  = join(ROOT, 'backups', 'cloudinary')

// ── Step 1: ensure bucket exists ─────────────────────────────────────────────
async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === BUCKET)
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) throw new Error(`Could not create bucket: ${error.message}`)
    console.log(`✓ Created bucket "${BUCKET}"`)
  } else {
    console.log(`✓ Bucket "${BUCKET}" already exists`)
  }
}

// ── Step 2: upload each backed-up file ───────────────────────────────────────
async function uploadFiles() {
  // urls.json maps index → original Cloudinary URL
  const originalUrls = JSON.parse(readFileSync(join(BACKUP_DIR, 'urls.json'), 'utf8'))

  const files = readdirSync(BACKUP_DIR)
    .filter(f => f !== 'urls.json')
    .sort()

  const mapping = {} // oldUrl → newSupabaseUrl

  for (const filename of files) {
    const idx   = parseInt(filename.split('-')[0], 10)
    const oldUrl = originalUrls[idx]
    if (!oldUrl) {
      console.warn(`  ! No original URL for file ${filename} (idx ${idx}) — skipping`)
      continue
    }

    const filepath = join(BACKUP_DIR, filename)
    const bytes    = readFileSync(filepath)
    const ext      = filename.split('.').pop()
    const mime     = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`

    // Re-use the original Cloudinary public_id as the filename in Supabase
    // so existing paths stay recognisable. Extract e.g. "lx7qhr548bxjzgiyghcq.png"
    const originalId = oldUrl.split('/').pop()  // e.g. "lx7qhr548bxjzgiyghcq.png"
    const storagePath = `wgy-campaigns/${originalId}`

    // Check if already uploaded (idempotent re-runs)
    const { data: existing } = await supabase.storage.from(BUCKET).list('wgy-campaigns', {
      search: originalId,
    })
    if (existing?.length) {
      const pubUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
      mapping[oldUrl] = pubUrl
      console.log(`  → Already uploaded: ${originalId}`)
      continue
    }

    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: mime,
      upsert: false,
    })
    if (error) {
      console.error(`  ✗ Failed to upload ${filename}: ${error.message}`)
      continue
    }

    const pubUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
    mapping[oldUrl] = pubUrl
    console.log(`  ✓ ${filename} → ${pubUrl}`)
  }

  return mapping
}

// ── Step 3: patch every DB field that still points at Cloudinary ─────────────
async function patchDatabase(mapping) {
  const oldUrls = Object.keys(mapping)
  if (oldUrls.length === 0) {
    console.log('No URLs to patch.')
    return
  }

  let patched = 0

  // Helper: update if the current value is a known Cloudinary URL
  async function patchField(model, idField, id, field, currentValue) {
    if (!currentValue || !mapping[currentValue]) return
    await prisma[model].update({
      where:  { [idField]: id },
      data:   { [field]: mapping[currentValue] },
    })
    patched++
    console.log(`  ✓ ${model}.${field} → …/${mapping[currentValue].split('/').pop()}`)
  }

  // Creator.profileImageUrl
  const creators = await prisma.creator.findMany({
    where: { profileImageUrl: { in: oldUrls } },
    select: { id: true, profileImageUrl: true },
  })
  for (const c of creators) {
    await patchField('creator', 'id', c.id, 'profileImageUrl', c.profileImageUrl)
  }

  // Post.coverImageUrl
  const postsWithCover = await prisma.post.findMany({
    where: { coverImageUrl: { in: oldUrls } },
    select: { id: true, coverImageUrl: true },
  })
  for (const p of postsWithCover) {
    await patchField('post', 'id', p.id, 'coverImageUrl', p.coverImageUrl)
  }

  // Post.brandLogoUrl
  const postsWithLogo = await prisma.post.findMany({
    where: { brandLogoUrl: { in: oldUrls } },
    select: { id: true, brandLogoUrl: true },
  })
  for (const p of postsWithLogo) {
    await patchField('post', 'id', p.id, 'brandLogoUrl', p.brandLogoUrl)
  }

  // PostContent.thumbnailUrl
  const contentThumb = await prisma.postContent.findMany({
    where: { thumbnailUrl: { in: oldUrls } },
    select: { id: true, thumbnailUrl: true },
  })
  for (const c of contentThumb) {
    await patchField('postContent', 'id', c.id, 'thumbnailUrl', c.thumbnailUrl)
  }

  // PostContent.bannerImageUrl
  const contentBanner = await prisma.postContent.findMany({
    where: { bannerImageUrl: { in: oldUrls } },
    select: { id: true, bannerImageUrl: true },
  })
  for (const c of contentBanner) {
    await patchField('postContent', 'id', c.id, 'bannerImageUrl', c.bannerImageUrl)
  }

  // Generic imageUrl fields (Post items like Tag imageUrl, etc.)
  const models = ['tag', 'community', 'room']
  for (const model of models) {
    try {
      const rows = await prisma[model].findMany({
        where: { imageUrl: { in: oldUrls } },
        select: { id: true, imageUrl: true },
      })
      for (const r of rows) {
        await patchField(model, 'id', r.id, 'imageUrl', r.imageUrl)
      }
    } catch {
      // model may not have imageUrl — ignore
    }
  }

  console.log(`\nDatabase: ${patched} field${patched === 1 ? '' : 's'} patched.`)
}

// ── Main ─────────────────────────────────────────────────────────────────────
;(async () => {
  try {
    console.log('\n=== Cloudinary → Supabase Storage migration ===\n')

    console.log('Step 1: Ensure storage bucket...')
    await ensureBucket()

    console.log('\nStep 2: Upload images...')
    const mapping = await uploadFiles()
    console.log(`\nUploaded ${Object.keys(mapping).length} files.`)

    console.log('\nStep 3: Patch database URLs...')
    await patchDatabase(mapping)

    console.log('\n=== Done. ===')
    console.log('Next steps:')
    console.log('  1. Verify images load from Supabase URLs in the app')
    console.log('  2. Remove CLOUDINARY_* vars from .env and Vercel')
    console.log('  3. Delete your Cloudinary account to kill the leaked credential')
  } catch (err) {
    console.error('\nFatal error:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
})()
