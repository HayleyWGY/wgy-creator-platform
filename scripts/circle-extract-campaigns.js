/**
 * Circle → WGY Creator Platform migration, CAMPAIGNS EXTRACT.
 *
 * What this script does, in plain terms:
 *   Downloads every campaign post from your 5 confirmed Circle campaign
 *   Spaces (PR/Gifted, Paid, TikTok Commission, App Partners, Event) and
 *   writes them to scripts/output/circle-campaigns.csv for you to review
 *   and correct before we import them into the app.
 *
 * IMPORTANT — unlike the blog post migration, Circle does NOT store most
 * campaign details (deliverables, payment amount, brand socials, apply
 * link) as separate structured fields — they're just written as prose
 * inside the post body. This script makes a BEST-EFFORT attempt to pull
 * those out automatically using pattern matching (e.g. "the last link in
 * the post is probably the Apply link", "bullet points are probably the
 * deliverables"). It will get plenty right, but NOT everything — you must
 * review every row in the CSV before Phase 2 imports it, especially the
 * apply_link_url, payment_amount, and deliverables columns.
 *
 * The Event Space works differently — Circle Events have real structured
 * start/end times and locations, so those come through cleanly with no
 * guessing needed.
 *
 * ── HOW TO RUN ───────────────────────────────────────────────────────────
 *
 *   node scripts/circle-extract-campaigns.js
 *
 * Uses the same CIRCLE_API_TOKEN already set in .env from the blog
 * migration — no new setup needed.
 */

const fs = require('fs')
const path = require('path')

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

const CIRCLE_API_TOKEN = process.env.CIRCLE_API_TOKEN
const BASE_URL         = 'https://app.circle.so/api/v1'
const OUTPUT_DIR       = path.join(__dirname, 'output')
const PAGE_DELAY_MS    = 200

if (!CIRCLE_API_TOKEN) {
  console.error('Missing CIRCLE_API_TOKEN in .env')
  process.exit(1)
}

// The 5 confirmed campaign Spaces, and what campaignType/section each maps
// to in the app (matches FILTER_TO_CAMPAIGN_TYPE / FILTER_TO_SECTION_SLUG
// in app/api/campaigns/route.ts).
const CAMPAIGN_SPACES = [
  { id: 861818,   name: 'PR / Gifted Campaigns',        campaignType: 'pr-gifted',    kind: 'posts' },
  { id: 862018,   name: 'Paid Collaborations',           campaignType: 'paid',         kind: 'posts' },
  { id: 1511356,  name: 'Tiktok Commission Campaigns',   campaignType: 'tiktok',       kind: 'posts' },
  { id: 861826,   name: 'App Partners',                  campaignType: 'app-partners', kind: 'posts' },
  { id: 861834,   name: 'Event',                         campaignType: 'event',        kind: 'events' },
]

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

async function circleGet(pathAndQuery) {
  const url = `${BASE_URL}${pathAndQuery}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${CIRCLE_API_TOKEN}` } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Circle API error ${res.status} for ${url}: ${text}`)
  }
  return res.json()
}

// ── Paginate through a regular /posts Space ────────────────────────────────
async function fetchAllPosts(spaceId) {
  const all = []
  let page = 1
  let hasMore = true
  while (hasMore) {
    const data = await circleGet(`/posts?space_id=${spaceId}&page=${page}&per_page=50`)
    const posts = Array.isArray(data) ? data : (data.records || data.posts || [])
    all.push(...posts)
    hasMore = posts.length > 0 && posts.length >= 50
    page += 1
    if (hasMore) await sleep(PAGE_DELAY_MS)
  }
  return all
}

// ── Paginate through the Events Space (different endpoint/shape) ──────────
async function fetchAllEvents(spaceId) {
  const all = []
  let page = 1
  let hasMore = true
  while (hasMore) {
    const data = await circleGet(`/events?space_id=${spaceId}&page=${page}&per_page=50`)
    const events = Array.isArray(data) ? data : (data.records || data.events || [])
    all.push(...events)
    hasMore = events.length > 0 && events.length >= 50
    page += 1
    if (hasMore) await sleep(PAGE_DELAY_MS)
  }
  return all
}

// ── Best-effort prose parsing helpers ──────────────────────────────────────
// These are heuristics, not guarantees — every field they produce should
// be spot-checked in the CSV before import.

function extractAllLinks(html) {
  const links = []
  const re = /<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gis
  let m
  while ((m = re.exec(html))) {
    links.push({ href: m[1], text: m[2].replace(/<[^>]*>/g, '').trim() })
  }
  return links
}

const CTA_WORDS = /apply|register|interest|submit|join|sign\s?up|rsvp/i
const SOCIAL_DOMAINS = /instagram\.com|tiktok\.com|facebook\.com|twitter\.com|x\.com|youtube\.com/i
const KNOWN_PLATFORM_DOMAINS = /circle\.so|wgyhub\.com|wegotyouagency\.com|assets-v2\.circle\.so/i

function guessApplyLink(links) {
  // Prefer a link whose text/href signals a call-to-action.
  const cta = [...links].reverse().find(l => CTA_WORDS.test(l.text) || CTA_WORDS.test(l.href))
  if (cta) return cta.href
  // Fall back to the very last link in the post — every sample we checked
  // ends with the apply/register link.
  return links.length ? links[links.length - 1].href : ''
}

function guessBrandWebsite(links) {
  const candidate = links.find(l =>
    !SOCIAL_DOMAINS.test(l.href) &&
    !KNOWN_PLATFORM_DOMAINS.test(l.href) &&
    !CTA_WORDS.test(l.text)
  )
  return candidate?.href || ''
}

function guessSocial(links, domainPattern) {
  const match = links.find(l => domainPattern.test(l.href))
  return match?.href || ''
}

function guessDeliverables(html) {
  const items = []
  const re = /<li[^>]*>(.*?)<\/li>/gis
  let m
  while ((m = re.exec(html))) {
    const text = m[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    if (text) items.push(text)
  }
  return items.join(' | ')
}

function guessPaymentAmount(text) {
  // Matches "$60", "£50", "up to $100", "€75" etc — first match only.
  const m = text.match(/(up to\s+)?[$£€]\s?\d+(\.\d{1,2})?/i)
  return m ? m[0].trim() : ''
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// ── Extract fields from a regular campaign post ────────────────────────────
function extractFromPost(post, space) {
  const bodyHtml = typeof post.body === 'string' ? post.body : post.body?.body ?? ''
  const links = extractAllLinks(bodyHtml)
  const plainText = stripHtml(bodyHtml)

  return {
    title: post.name ?? '',
    brand_name: post.name ?? '', // best-effort default — review/trim by hand
    campaign_type: space.campaignType,
    status: 'published',
    opportunity_description: bodyHtml,
    deliverables: guessDeliverables(bodyHtml),
    apply_link_url: guessApplyLink(links),
    brand_website: guessBrandWebsite(links),
    brand_instagram: guessSocial(links, /instagram\.com/i),
    brand_tiktok: guessSocial(links, /tiktok\.com/i),
    payment_amount: guessPaymentAmount(plainText),
    payment_terms: '', // no reliable signal in Circle data — fill in by hand
    spots_remaining: '', // no data in Circle — fill in by hand
    event_date: '',
    event_time: '',
    event_location: '',
    cover_image_url: post.cover_image_url ?? '',
    published_at: post.published_at ?? post.created_at ?? '',
    circle_id: post.id,
    slug: post.slug ?? '',
    source_space: space.name,
  }
}

// ── Extract fields from a Circle Event ─────────────────────────────────────
function extractFromEvent(event, space) {
  const bodyHtml = typeof event.body === 'string' ? event.body : event.body?.body ?? ''
  const links = extractAllLinks(bodyHtml)
  const plainText = stripHtml(bodyHtml)

  const startsAtForStatus = event.starts_at ? new Date(event.starts_at) : null
  // Close the event if Circle's title said so, OR if its date has already
  // passed — most past events were never manually marked (Closed) in Circle,
  // but an open listing for a date that's already gone by makes no sense.
  const isClosed = /^\(closed\)/i.test(event.name ?? '') || (startsAtForStatus !== null && startsAtForStatus < new Date())
  const title = (event.name ?? '').replace(/^\(closed\)\s*/i, '').trim()

  let eventLocation = ''
  if (event.location_type === 'in_person' && event.in_person_location) {
    try {
      const loc = JSON.parse(event.in_person_location)
      eventLocation = loc.formatted_address || loc.name || ''
    } catch {
      eventLocation = ''
    }
  } else if (event.location_type === 'virtual') {
    eventLocation = event.virtual_location_url || 'Virtual'
  }

  const startsAt = event.starts_at ? new Date(event.starts_at) : null

  return {
    title,
    brand_name: title,
    campaign_type: space.campaignType,
    status: isClosed ? 'closed' : 'published',
    opportunity_description: bodyHtml,
    deliverables: guessDeliverables(bodyHtml),
    apply_link_url: guessApplyLink(links),
    brand_website: guessBrandWebsite(links),
    brand_instagram: guessSocial(links, /instagram\.com/i),
    brand_tiktok: guessSocial(links, /tiktok\.com/i),
    payment_amount: guessPaymentAmount(plainText),
    payment_terms: '',
    spots_remaining: '',
    event_date: startsAt ? startsAt.toISOString().slice(0, 10) : '',
    event_time: startsAt ? startsAt.toISOString().slice(11, 16) : '',
    event_location: eventLocation,
    cover_image_url: '', // Events don't expose a cover_image_url field
    published_at: event.created_at ?? '',
    circle_id: event.id,
    slug: event.slug ?? '',
    source_space: space.name,
  }
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function writeCsv(rows) {
  const columns = [
    'title', 'brand_name', 'campaign_type', 'status',
    'opportunity_description', 'deliverables', 'apply_link_url',
    'brand_website', 'brand_instagram', 'brand_tiktok',
    'payment_amount', 'payment_terms', 'spots_remaining',
    'event_date', 'event_time', 'event_location',
    'cover_image_url', 'published_at', 'circle_id', 'slug', 'source_space',
  ]
  const header = columns.join(',')
  const lines = rows.map(row => columns.map(c => csvEscape(row[c])).join(','))
  const csv = [header, ...lines].join('\n')
  const filePath = path.join(OUTPUT_DIR, 'circle-campaigns.csv')
  fs.writeFileSync(filePath, csv, 'utf8')
  console.log(`Wrote ${rows.length} campaigns → ${filePath}`)
}

;(async () => {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

    let allRows = []
    for (const space of CAMPAIGN_SPACES) {
      console.log(`\n=== ${space.name} (${space.kind}) ===`)
      if (space.kind === 'posts') {
        const posts = await fetchAllPosts(space.id)
        console.log(`  ${posts.length} posts`)
        allRows.push(...posts.map(p => extractFromPost(p, space)))
      } else {
        const events = await fetchAllEvents(space.id)
        console.log(`  ${events.length} events`)
        allRows.push(...events.map(e => extractFromEvent(e, space)))
      }
      await sleep(PAGE_DELAY_MS)
    }

    // Drop rows with no title (shouldn't happen, but matches the blog script's safety net)
    const before = allRows.length
    allRows = allRows.filter(r => r.title.trim())
    const droppedNoTitle = before - allRows.length

    console.log('\n=== Writing output ===')
    writeCsv(allRows)

    console.log('\n=== Summary ===')
    console.log(`  Total campaigns extracted: ${allRows.length}`)
    console.log(`  Skipped (no title):        ${droppedNoTitle}`)
    console.log('\nREMINDER: apply_link_url, payment_amount, deliverables, brand_website/')
    console.log('instagram/tiktok are BEST-EFFORT GUESSES. Review every row before Phase 2.\n')
  } catch (err) {
    console.error('\nFatal error:', err.message)
    process.exit(1)
  }
})()
