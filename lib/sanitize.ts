import sanitizeHtml from 'sanitize-html'

/**
 * Sanitise rich-text HTML before it is STORED. Everything else (scripts,
 * event handlers, iframes, javascript: URLs) is stripped.
 *
 * Sanitising on write is the ONLY defence: five places render this content
 * with dangerouslySetInnerHTML, and next.config.mjs sets
 * `script-src 'self' 'unsafe-inline'`, so the CSP does NOT stop an injected
 * `<img src=x onerror=...>`. Anything reaching the database unsanitised is
 * live XSS for every member who views it.
 *
 * This function is NOT a single choke point — it must be called by every
 * write path. As of the last audit those are:
 *
 *   Post.opportunityDescription / Post.body  (rendered: opportunities/[slug])
 *     - app/api/campaigns/route.ts            POST
 *     - app/api/campaigns/[id]/route.ts       PATCH
 *     - scripts/import-campaigns.js           (mirrors this allowlist)
 *
 *   PostContent.body  (rendered: learn/[id] x3, about/[id])
 *     - app/api/content/route.ts              POST
 *     - app/api/content/[id]/route.ts         PATCH
 *     - scripts/import-learning-lounge.js     (mirrors this allowlist)
 *
 * If you add a write path to either column, sanitise it here too. The .js
 * migration scripts cannot import this module, so they duplicate the
 * allowlist — keep all three in step. (One of them previously used a
 * denylist of regexes and was bypassable by unquoted handlers.)
 *
 * KNOWN GAP: the allowlist omits `code` and `pre`, which the Tiptap
 * StarterKit can still produce via markdown input rules (backticks) and
 * keyboard shortcuts even though the toolbar has no button for them. Such
 * content is not lost, but loses its formatting. Widen deliberately if
 * campaigns or articles ever need code samples.
 */
export function sanitizeRichText(html: string): string {
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
    // Force safe link behaviour on everything that survives
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  })
}
