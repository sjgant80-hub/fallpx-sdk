// src/detect.js — auto-detect exact-recall spans in text.
// Extracted verbatim from the FallPx browser tool (fallpx/index.html).
// Regex patterns catch content that must NEVER be image-packed (OCR loses precision).

export const PATTERNS = {
  hex40: /\b[0-9a-fA-F]{40}\b/g,
  hex32: /\b[0-9a-fA-F]{32}\b/g,
  uuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  base64: /\b[A-Za-z0-9+/]{40,}={0,2}\b/g,
  jsonkey: /"[a-zA-Z_][a-zA-Z0-9_]{2,}"\s*:/g,
  longnum: /\b\d{10,}\b/g,
  skant: /sk-ant-[A-Za-z0-9_-]{20,}/g,
  skopenai: /sk-[A-Za-z0-9]{40,}/g,
  sha256: /[0-9a-f]{64}/g,
};

export const DEFAULT_PATTERNS = ['hex40', 'uuid', 'base64', 'jsonkey', 'longnum', 'skant', 'sha256'];

/**
 * Detect exact-recall spans in text using named regex patterns.
 * Overlapping spans are merged so no character is double-preserved.
 *
 * @param {string} text - Raw input text.
 * @param {string[]} [enabled=DEFAULT_PATTERNS] - Pattern names to run.
 * @returns {Array<{start:number,end:number,text:string,pattern:string}>}
 */
export function detectPreserved(text, enabled = DEFAULT_PATTERNS) {
  if (!text) return [];
  const spans = [];
  for (const name of enabled) {
    const pat = PATTERNS[name];
    if (!pat) continue;
    pat.lastIndex = 0;
    let m;
    while ((m = pat.exec(text)) !== null) {
      spans.push({ start: m.index, end: m.index + m[0].length, text: m[0], pattern: name });
    }
  }
  spans.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const s of spans) {
    if (merged.length && s.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, s.end);
    } else {
      merged.push({ ...s });
    }
  }
  return merged;
}

/**
 * Register a custom named pattern at runtime.
 */
export function addPattern(name, regex) {
  if (!(regex instanceof RegExp)) throw new TypeError('regex must be a RegExp');
  if (!regex.flags.includes('g')) throw new Error('regex must have the global (g) flag');
  PATTERNS[name] = regex;
}
