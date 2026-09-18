import sanitizeHtml from 'sanitize-html';

const TEXT_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'a'];

/**
 * The texts are exported as styled divs rather than paragraphs and headings. A bold
 * div is a heading, any other styled div a paragraph, and the unstyled wrappers stay
 * divs for the second pass to drop.
 */
const blockFromDivStyle: sanitizeHtml.Transformer = (tagName, attribs) => {
  const style = attribs.style ?? '';
  if (/font-weight\s*:\s*bold/i.test(style)) return { tagName: 'h3', attribs: {} };
  if (/font-family/i.test(style)) return { tagName: 'p', attribs: {} };
  return { tagName, attribs: {} };
};

/** First pass: gives the styled divs their meaning while the style is still there to read. */
const RESTORE_STRUCTURE: sanitizeHtml.IOptions = {
  allowedTags: [...TEXT_TAGS, 'div'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: { div: blockFromDivStyle },
};

/**
 * Second pass: keeps the markup a biography or history text needs and drops everything that
 * could run or restyle anything, since the web renders the result as HTML.
 */
const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: TEXT_TAGS,
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    // The web shows the text under its own h2, so the text's headings start one level below.
    h2: 'h3',
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
  // The exports are full of empty divs used as spacing.
  exclusiveFilter: frame => ['p', 'h3'].includes(frame.tag) && !frame.text.trim(),
  allowedSchemesAppliedToAttributes: ['href'],
};

/** Clean HTML, or undefined when nothing readable is left. */
export const cleanHtml = (html: string | null | undefined): string | undefined => {
  if (!html) return undefined;
  const cleaned = sanitizeHtml(sanitizeHtml(html, RESTORE_STRUCTURE), SANITIZE).trim();
  const hasText = sanitizeHtml(cleaned, { allowedTags: [], allowedAttributes: {} }).trim().length > 0;
  return hasText ? cleaned : undefined;
};
