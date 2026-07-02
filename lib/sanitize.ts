import sanitizeHtml from 'sanitize-html'

/**
 * Sanitise rich-text HTML before it is stored (Learning Lounge content,
 * authored via the admin Tiptap editor). The allowlist mirrors exactly what
 * the editor can produce — anything else (scripts, event handlers, iframes,
 * javascript: URLs) is stripped. This is the single defence point for the
 * dangerouslySetInnerHTML render on the creator side.
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
