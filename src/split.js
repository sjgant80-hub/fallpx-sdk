// src/split.js — split text into image-safe vs preserved-verbatim segments.
// Given text + detected spans, produce a list of {type:'image'|'keep', text, pattern?}.

/**
 * Split text into ordered segments. Segments of type 'keep' are the exact-recall
 * spans that must go through as text. Segments of type 'image' can be packed
 * into the PNG.
 *
 * @param {string} text
 * @param {Array<{start:number,end:number,text:string,pattern:string}>} spans
 * @returns {Array<{type:'image'|'keep',text:string,pattern?:string}>}
 */
export function splitByPreserved(text, spans) {
  const parts = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start > cursor) parts.push({ type: 'image', text: text.slice(cursor, s.start) });
    parts.push({ type: 'keep', text: text.slice(s.start, s.end), pattern: s.pattern });
    cursor = s.end;
  }
  if (cursor < text.length) parts.push({ type: 'image', text: text.slice(cursor) });
  return parts;
}

/**
 * Convenience: extract only the concatenated image-safe text.
 */
export function imageText(parts) {
  return parts.filter(p => p.type === 'image').map(p => p.text).join('\n');
}

/**
 * Convenience: extract only the concatenated preserved-verbatim text.
 */
export function keepText(parts, sep = ' ') {
  return parts.filter(p => p.type === 'keep').map(p => p.text).join(sep);
}
