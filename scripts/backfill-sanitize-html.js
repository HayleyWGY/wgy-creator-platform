/**
 * One-off backfill: runs already-stored rich text through the same sanitiser
 * the write paths now use.
 *
 * Rows written before sanitisation was added are still dangerous, because
 * every one of these columns is rendered with dangerouslySetInnerHTML:
 *   Post.opportunityDescription  -> opportunities/[slug]
 *   Post.body                    -> (mirrors opportunityDescription)
 *   PostContent.body             -> learn/[id] and about/[id]
 *
 * SAFETY: dry-run by DEFAULT. It reports what would change and writes
 * nothing. Pass --apply to actually write.
 *
 *   node scripts/backfill-sanitize-html.js            # dry run (default)
 *   node scripts/backfill-sanitize-html.js --apply    # perform the update
 *
 * Idempotent: sanitising already-clean HTML is a no-op, so re-running changes
 * nothing. Uses lib/sanitize.ts's exact allowlist (mirrored below, since this
 * is a plain .js script and cannot import the TS module).
 */

const fs = require('fs')
const path = require('path')
const sanitizeHtml = require('sanitize-html')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const APPLY = process.argv.includes('--apply')

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

// MUST stay in step with lib/sanitize.ts — if you change one, change both.
function sanitizeRichText(html) {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'h2', 'h3',
      'strong', 'b', 'em', 'i', 'u', 's',
      'ul', 'ol', 'li',
      'a', 'img', 'blockquote', 'hr',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  })
}

// Flags content that is actively dangerous, as opposed to merely reformatted
// (e.g. <br> -> <br />), so the dry run distinguishes urgency.
const DANGEROUS = /<script|onerror\s*=|onload\s*=|javascript:|<iframe|<svg/i

;(async () => {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!url) {
    console.error('No DIRECT_URL/DATABASE_URL in .env')
    process.exit(1)
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 1 }) })

  console.log(APPLY
    ? '\n*** APPLY MODE — rows WILL be updated ***\n'
    : '\nDry run (default). Nothing will be written. Re-run with --apply to commit.\n')

  const summary = []

  try {
    // ---- Post.opportunityDescription + Post.body --------------------------
    const posts = await prisma.post.findMany({
      select: { id: true, title: true, body: true, opportunityDescription: true },
    })
    let postChanges = 0
    let postDangerous = 0
    for (const p of posts) {
      const nextBody = p.body ? sanitizeRichText(p.body) : p.body
      const nextOpp = p.opportunityDescription ? sanitizeRichText(p.opportunityDescription) : p.opportunityDescription
      if (nextBody === p.body && nextOpp === p.opportunityDescription) continue

      postChanges++
      const risky = DANGEROUS.test(p.body || '') || DANGEROUS.test(p.opportunityDescription || '')
      if (risky) {
        postDangerous++
        console.log(`  [DANGEROUS] Post ${p.id} — ${String(p.title).slice(0, 60)}`)
      }
      if (APPLY) {
        await prisma.post.update({
          where: { id: p.id },
          data: { body: nextBody, opportunityDescription: nextOpp },
        })
      }
    }
    summary.push(['Post (campaigns)', posts.length, postChanges, postDangerous])

    // ---- PostContent.body -------------------------------------------------
    const content = await prisma.postContent.findMany({
      select: { id: true, title: true, body: true },
    })
    let contentChanges = 0
    let contentDangerous = 0
    for (const c of content) {
      if (!c.body) continue
      const next = sanitizeRichText(c.body)
      if (next === c.body) continue

      contentChanges++
      if (DANGEROUS.test(c.body)) {
        contentDangerous++
        console.log(`  [DANGEROUS] PostContent ${c.id} — ${String(c.title).slice(0, 60)}`)
      }
      if (APPLY) {
        await prisma.postContent.update({ where: { id: c.id }, data: { body: next } })
      }
    }
    summary.push(['PostContent (learning lounge)', content.length, contentChanges, contentDangerous])

    console.log('\n  table                          rows   would-change   dangerous')
    for (const [name, total, changed, dangerous] of summary) {
      console.log(`  ${name.padEnd(30)} ${String(total).padStart(4)}   ${String(changed).padStart(12)}   ${String(dangerous).padStart(9)}`)
    }
    console.log(APPLY ? '\nApplied.\n' : '\nDry run complete — nothing written.\n')
  } finally {
    await prisma.$disconnect()
  }
})()
