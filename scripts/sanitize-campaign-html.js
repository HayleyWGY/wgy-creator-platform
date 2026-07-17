/**
 * One-off patch: the campaign import (scripts/import-campaigns.js) stored
 * raw HTML straight from Circle into Post.body / Post.opportunityDescription
 * without sanitising it first — unlike the Learning Lounge import, which
 * correctly stripped anything unsafe before saving. Since the campaign
 * detail page now renders this HTML directly (dangerouslySetInnerHTML),
 * this script runs the same sanitiser used everywhere else in the app
 * (lib/sanitize.ts's allowlist) over every already-imported campaign to
 * close that gap retroactively.
 *
 * Run with: node scripts/sanitize-campaign-html.js
 */

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const sanitizeHtml = require('sanitize-html')

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

const DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL

// Mirrors lib/sanitize.ts's sanitizeRichText exactly.
function sanitizeRichText(html) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'hr'],
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt', 'width', 'height'] },
    allowedSchemes: ['https', 'http', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) },
  })
}

;(async () => {
  const adapter = new PrismaPg({ connectionString: DIRECT_URL, max: 1 })
  const prisma = new PrismaClient({ adapter })

  try {
    const posts = await prisma.post.findMany({
      select: { id: true, body: true, opportunityDescription: true },
    })

    let patched = 0
    for (const post of posts) {
      const cleanBody = post.body ? sanitizeRichText(post.body) : post.body
      const cleanOpp = post.opportunityDescription ? sanitizeRichText(post.opportunityDescription) : post.opportunityDescription

      if (cleanBody !== post.body || cleanOpp !== post.opportunityDescription) {
        await prisma.post.update({
          where: { id: post.id },
          data: { body: cleanBody, opportunityDescription: cleanOpp },
        })
        patched += 1
      }
    }

    console.log(`Checked ${posts.length} campaigns. Sanitised and updated ${patched}.`)
  } finally {
    await prisma.$disconnect()
  }
})()
