// src/index.js — public entry for @ai-native-solutions/fallpx-sdk.
// One-line convenience: pack(text, opts) → { imagesB64, keepText, cost }.

export * from './detect.js';
export * from './split.js';
export * from './cost.js';
export * from './render.js';
export * from './claude.js';

import { detectPreserved, DEFAULT_PATTERNS } from './detect.js';
import { splitByPreserved, imageText, keepText } from './split.js';
import { renderTextToImage, canvasToPngBase64 } from './render.js';
import { compareCost, DEFAULT_PRICES } from './cost.js';
import { sendToClaude, computeSavings } from './claude.js';

/**
 * One-shot: detect exact-recall spans, split, render packed PNG(s), and cost it.
 *
 * @param {string} text
 * @param {object} [opts]
 * @param {string[]} [opts.patterns=DEFAULT_PATTERNS]
 * @param {number} [opts.fontSize=12] - density in px
 * @param {number} [opts.maxWidth=1440]
 * @param {number} [opts.maxHeight=1568]
 * @param {string} [opts.model='claude-sonnet-4-6']
 * @param {object} [opts.prices=DEFAULT_PRICES]
 * @returns {Promise<{imagesB64:string[],keepText:string,dims:{width:number,height:number},pages:number,cost:object,spans:Array,parts:Array}>}
 */
export async function pack(text, opts = {}) {
  const patterns = opts.patterns || DEFAULT_PATTERNS;
  const model = opts.model || 'claude-sonnet-4-6';
  const prices = opts.prices || DEFAULT_PRICES;

  const spans = detectPreserved(text, patterns);
  const parts = splitByPreserved(text, spans);
  const imgText = imageText(parts);
  const kept = keepText(parts, ' ');

  const rendered = await renderTextToImage(imgText, {
    fontSize: opts.fontSize,
    maxWidth: opts.maxWidth,
    maxHeight: opts.maxHeight,
  });
  const b64 = await canvasToPngBase64(rendered.canvas);
  const cost = compareCost({
    text, imageWidth: rendered.width, imageHeight: rendered.height,
    keepChars: kept.length, model, prices,
  });
  return {
    imagesB64: [b64],
    keepText: kept,
    dims: { width: rendered.width, height: rendered.height },
    pages: rendered.totalPages,
    truncated: rendered.truncated,
    cost,
    spans,
    parts,
  };
}

/**
 * Full pipeline: pack + send to Claude in one call.
 * Returns Claude's text response plus actual-vs-text-equivalent cost breakdown.
 */
export async function packAndSend({ text, prompt, apiKey, model = 'claude-sonnet-4-6', patterns, fontSize, maxWidth, maxHeight, prices, directBrowserAccess = false }) {
  const packed = await pack(text, { patterns, fontSize, maxWidth, maxHeight, model, prices });
  const resp = await sendToClaude({
    apiKey, model,
    imagesB64: packed.imagesB64,
    keepText: packed.keepText,
    prompt,
    directBrowserAccess,
  });
  const savings = computeSavings({ usage: resp.usage, textChars: (text || '').length, model, prices: prices || DEFAULT_PRICES });
  return { response: resp.text, packed, usage: resp.usage, latencyMs: resp.latencyMs, savings, raw: resp.raw };
}

export const VERSION = '1.0.0';
