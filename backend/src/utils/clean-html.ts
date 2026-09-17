import sanitizeHtml from 'sanitize-html';

/**
 * Keeps the markup a biography or history text needs and drops everything that
 * could run or restyle anything, since the web renders the result as HTML.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'a'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    // The web shows the text under its own h2, so the text's headings start one level below.
    h2: 'h3',
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
  allowedSchemesAppliedToAttributes: ['href'],
};

/** Clean HTML, or undefined when nothing readable is left. */
export const cleanHtml = (html: string | null | undefined): string | undefined => {
  if (!html) return undefined;
  const cleaned = sanitizeHtml(html, OPTIONS).trim();
  const hasText = sanitizeHtml(cleaned, { allowedTags: [], allowedAttributes: {} }).trim().length > 0;
  return hasText ? cleaned : undefined;
};
