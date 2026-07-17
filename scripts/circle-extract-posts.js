/**
 * Circle → WGY Creator Platform migration, PHASE 1: EXTRACT.
 *
 * What this script does, in plain terms:
 *   1. Talks to your Circle community using your Circle Admin API token.
 *   2. First mode ("list spaces"): shows you every Space in your Circle
 *      community with its ID, so you can tell us which one holds the blog
 *      posts you want to migrate.
 *   3. Second mode ("extract posts"): once you know the Space ID, this
 *      script downloads every published post in that Space — looping
 *      through Circle's pages of results until there are none left — and
 *      saves them to scripts/output/circle-blog-posts.json and .csv.
 *
 * This script only READS from Circle. It never writes/deletes anything in
 * Circle, and it does not touch the WGY database at all — that happens in
 * Phase 2 (scripts/import-learning-lounge.js), which you run separately
 * after checking this output looks right.
 *
 * ── SETUP ────────────────────────────────────────────────────────────────
 *
 * Add these to your .env file (this project keeps all env vars in .env,
 * not .env.local):
 *
 *   CIRCLE_API_TOKEN=your-circle-admin-api-token-here
 *   CIRCLE_COMMUNITY_ID=your-community-id-here   (optional, informational)
 *   CIRCLE_SPACE_ID=                             (leave blank for step 1)
 *
 * Where to get your Circle Admin API token:
 *   Circle Admin → Settings → Developers → Tokens (or "API tokens").
 *   Circle also documents this at https://developers.circle.so
 *
 * ── HOW TO RUN ───────────────────────────────────────────────────────────
 *
 * Step 1 — find your blog Space's ID:
 *   node scripts/circle-extract-posts.js
 *   (with CIRCLE_SPACE_ID left blank in .env)
 *
 *   This prints every Space name + ID in your community. Find the one that
 *   holds your blog posts (e.g. "Blog", "Learning Lounge", "Resources") and
 *   copy its ID.
 *
 * Step 2 — extract the posts:
 *   Add the Space ID(s) to .env, then run again:
 *   node scripts/circle-extract-posts.js
 *
 *   You can migrate from ONE Space or SEVERAL at once — just separate
 *   multiple IDs with commas, e.g.:
 *     CIRCLE_SPACE_ID=925723,888415,935183
 *
 *   This downloads every published post from all listed Spaces into a
 *   single combined scripts/output/circle-blog-posts.json and .csv
 *   (each row also records which Space it came from).
 */

const fs = require('fs')
const path = require('path')

// Load .env the same way the rest of this project's scripts do — no extra
// dependency needed, just a tiny manual parser.
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

const CIRCLE_API_TOKEN   = process.env.CIRCLE_API_TOKEN
const CIRCLE_COMMUNITY_ID = process.env.CIRCLE_COMMUNITY_ID
const CIRCLE_SPACE_ID    = process.env.CIRCLE_SPACE_ID
const BASE_URL           = 'https://app.circle.so/api/v1'
const OUTPUT_DIR         = path.join(__dirname, 'output')
const PAGE_DELAY_MS      = 200 // be gentle with Circle's rate limits

if (!CIRCLE_API_TOKEN) {
  console.error('Missing CIRCLE_API_TOKEN in .env — add it before running this script.')
  console.error('See the comment block at the top of this file for where to find it.')
  process.exit(1)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Small wrapper around fetch that adds the Circle auth header and gives a
// clear error message if something goes wrong.
async function circleGet(pathAndQuery) {
  const url = `${BASE_URL}${pathAndQuery}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${CIRCLE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Circle API error ${res.status} for ${url}: ${text}`)
  }

  return res.json()
}

// ── Step 1: list every Space so the user can identify the blog Space ──────
async function listSpaces() {
  console.log('\n=== Fetching Circle Spaces ===\n')
  if (CIRCLE_COMMUNITY_ID) {
    console.log(`Community ID (from .env): ${CIRCLE_COMMUNITY_ID}\n`)
  }

  const data = await circleGet('/spaces')
  // Circle typically returns either a bare array or { records: [...] } —
  // handle both so this doesn't break on minor API shape differences.
  const spaces = Array.isArray(data) ? data : (data.records || data.spaces || [])

  if (spaces.length === 0) {
    console.log('No spaces found. Double-check CIRCLE_API_TOKEN has the right permissions.')
    return
  }

  console.log(`Found ${spaces.length} space(s):\n`)
  for (const space of spaces) {
    console.log(`  ID: ${space.id}\t Name: "${space.name}"\t Slug: ${space.slug ?? '(none)'}`)
  }

  console.log('\nFind the Space above that holds your blog posts, then set:')
  console.log('  CIRCLE_SPACE_ID=<that id>')
  console.log('in .env, and run this script again to extract the posts.\n')
}

// ── Step 2: paginate through every post in the chosen Space ───────────────
async function fetchAllPosts(spaceId) {
  console.log(`\n=== Fetching posts from Space ${spaceId} ===\n`)

  const allPosts = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    console.log(`  Fetching page ${page}...`)
    const data = await circleGet(`/posts?space_id=${spaceId}&page=${page}&per_page=50`)

    // Same defensive handling for response shape as listSpaces().
    const posts = Array.isArray(data) ? data : (data.records || data.posts || [])
    allPosts.push(...posts)

    // Stop when a page comes back with fewer results than we asked for,
    // or completely empty — that means we've reached the end.
    hasMore = posts.length > 0 && posts.length >= 50
    page += 1

    if (hasMore) await sleep(PAGE_DELAY_MS)
  }

  console.log(`  Total posts fetched across all pages: ${allPosts.length}\n`)
  return allPosts
}

// Best-guess Learning Lounge content_type per source Circle Space, keyed by
// Space name. These are just starting defaults — review and edit the
// content_type column in the CSV by hand before running Phase 2, since only
// a human can judge each post correctly. Valid values (must match the admin
// content page's CONTENT_TYPES exactly): blog_post, industry_update,
// workbook, video, course.
const DEFAULT_CONTENT_TYPE_BY_SPACE = {
  'News & Updates':     'blog_post',
  'Industry News':      'industry_update',
  'Social Tips':        'blog_post',
  // Video Library posts get imported as plain text blog posts per request —
  // videos get added back in manually afterwards.
  'Video Library':      'blog_post',
  'About The App':      'blog_post',
  'Creator Workbooks':  'workbook',
  'Hello New Members!': 'blog_post',
}

// Best-guess section (where the piece lives on the creator side) per source
// Space. Review and edit by hand — valid values match the admin content
// page's SECTION_OPTIONS exactly: general (Learning Lounge), about, faq,
// updates.
const DEFAULT_SECTION_BY_SPACE = {
  'About The App': 'about',
}
const DEFAULT_SECTION = 'general'

// ── Extract just the fields we need, in the shape Phase 2 expects ─────────
// spaceLabel is recorded on every row so we know which Circle Space each
// post originally came from, in case that matters later.
function extractFields(rawPosts, spaceLabel) {
  const exported = []
  let skippedDrafts = 0
  let skippedNoTitle = 0

  for (const post of rawPosts) {
    // Only migrate published posts — drafts stay in Circle.
    const status = post.status ?? (post.is_published ? 'published' : 'draft')
    if (status !== 'published' && post.is_published !== true) {
      skippedDrafts += 1
      continue
    }

    const title = post.name ?? post.title ?? ''
    if (!title.trim()) {
      skippedNoTitle += 1
      continue
    }

    // Circle wraps the actual HTML body inside a nested rich-text object
    // ({ id, name, body: "<html>", ... }) rather than as a plain string —
    // reach into .body.body first, and fall back to a flat string in case
    // an older/different post shape hands one back directly.
    const rawBody =
      typeof post.body === 'string' ? post.body : post.body?.body ?? post.body_html ?? post.description ?? ''

    // Circle's post payload puts author info in flat user_name/user_email
    // fields, not a nested "user" object — check both shapes just in case.
    const author = post.user ?? post.author ?? {}

    const sourceSpace = post.space_name?.trim() ?? spaceLabel

    exported.push({
      title,
      body: rawBody,
      // The ORIGINAL Circle publish date — never created_at/imported_at.
      published_at: post.published_at ?? post.created_at ?? '',
      author_name: post.user_name ?? author.name ?? [author.first_name, author.last_name].filter(Boolean).join(' ') ?? '',
      author_email: post.user_email ?? author.email ?? '',
      cover_image_url: post.cover_image_url ?? post.cover_image?.url ?? '',
      circle_id: post.id,
      slug: post.slug ?? post.url ?? '',
      source_space: sourceSpace,
      // Best-guess tag — REVIEW THIS COLUMN BY HAND before Phase 2. Valid
      // values: blog_post, industry_update, workbook, video, course.
      content_type: DEFAULT_CONTENT_TYPE_BY_SPACE[sourceSpace] ?? 'blog_post',
      // Left blank on purpose — paste a public image URL here per post if
      // you want a custom thumbnail/header (recommended: 1200x675px,
      // landscape JPG/PNG). Leave blank and the app shows its default
      // placeholder gradient instead — nothing breaks either way.
      // Circle's own cover_image_url is intentionally NOT carried over.
      thumbnail_url: '',
      banner_image_url: '',
      // Where this piece lives on the creator side — review by hand. Valid
      // values: general, about, faq, updates.
      section: DEFAULT_SECTION_BY_SPACE[sourceSpace] ?? DEFAULT_SECTION,
      // Optional tags shown as pills and used for filtering on the Learning
      // Lounge feed — comma-separate more than one, e.g. "growth,mindset".
      // Left blank by default; valid values: social_media, content_creation,
      // brand_deals, growth, mindset, tips_and_tricks.
      categories: '',
    })
  }

  return { exported, skippedDrafts, skippedNoTitle }
}

// ── Write JSON + CSV output ────────────────────────────────────────────────
function writeJson(rows) {
  const filePath = path.join(OUTPUT_DIR, 'circle-blog-posts.json')
  fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf8')
  console.log(`  Wrote ${rows.length} posts → ${filePath}`)
}

// CSV needs each field wrapped and any internal quotes escaped, since post
// bodies routinely contain commas, quotes, and newlines.
function csvEscape(value) {
  const str = String(value ?? '')
  return `"${str.replace(/"/g, '""')}"`
}

function writeCsv(rows) {
  // content_type comes right after title so it's the first thing you see
  // and edit when reviewing the spreadsheet — it's your tag column.
  // thumbnail_url / banner_image_url sit right after content_type — your
  // per-post image links, left blank for you to fill in by hand. section
  // and categories follow — also reviewable/editable by hand.
  const columns = ['title', 'content_type', 'section', 'categories', 'thumbnail_url', 'banner_image_url', 'body', 'published_at', 'author_name', 'author_email', 'cover_image_url', 'circle_id', 'slug', 'source_space']
  const header = columns.join(',')
  const lines = rows.map(row => columns.map(col => csvEscape(row[col])).join(','))
  const csv = [header, ...lines].join('\n')

  const filePath = path.join(OUTPUT_DIR, 'circle-blog-posts.csv')
  fs.writeFileSync(filePath, csv, 'utf8')
  console.log(`  Wrote ${rows.length} posts → ${filePath}`)
}

// ── Main ─────────────────────────────────────────────────────────────────
;(async () => {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

    if (!CIRCLE_SPACE_ID) {
      // No Space chosen yet — just list spaces and stop.
      await listSpaces()
      return
    }

    // Support one Space ID or a comma-separated list of several.
    const spaceIds = CIRCLE_SPACE_ID.split(',').map(id => id.trim()).filter(Boolean)

    let allExported = []
    let totalRawPosts = 0
    let totalSkippedDrafts = 0
    let totalSkippedNoTitle = 0

    for (const spaceId of spaceIds) {
      const rawPosts = await fetchAllPosts(spaceId)
      const { exported, skippedDrafts, skippedNoTitle } = extractFields(rawPosts, spaceId)

      allExported = allExported.concat(exported)
      totalRawPosts += rawPosts.length
      totalSkippedDrafts += skippedDrafts
      totalSkippedNoTitle += skippedNoTitle

      // Be gentle with Circle's rate limits between Spaces too.
      if (spaceId !== spaceIds[spaceIds.length - 1]) await sleep(PAGE_DELAY_MS)
    }

    console.log('=== Writing output files ===\n')
    writeJson(allExported)
    writeCsv(allExported)

    console.log('\n=== Summary ===')
    console.log(`  Spaces processed:              ${spaceIds.length}`)
    console.log(`  Total posts found:              ${totalRawPosts}`)
    console.log(`  Total exported:                 ${allExported.length}`)
    console.log(`  Skipped (not published/draft):  ${totalSkippedDrafts}`)
    console.log(`  Skipped (no title):              ${totalSkippedNoTitle}`)
    console.log('\nDone. Review scripts/output/circle-blog-posts.csv before running Phase 2.\n')
  } catch (err) {
    console.error('\nFatal error:', err.message)
    process.exit(1)
  }
})()
