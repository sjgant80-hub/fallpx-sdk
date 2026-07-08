// src/cost.js — token estimation and cost comparison.
// Anthropic bills images at ⌈W/28⌉ × ⌈H/28⌉ visual tokens; the count is fixed
// by pixel dimensions, not by how many characters got packed into them.

export const DEFAULT_PRICES = { haiku: 1, sonnet: 3, opus: 5 }; // USD / 1M input tokens · July 2026

export function estimateTextTokens(chars) {
  return Math.ceil(chars / 4);
}

export function estimateImageTokens(width, height) {
  return Math.ceil(width / 28) * Math.ceil(height / 28);
}

export function priceFor(model, prices = DEFAULT_PRICES) {
  const m = String(model || '').toLowerCase();
  if (m.includes('haiku')) return prices.haiku;
  if (m.includes('sonnet')) return prices.sonnet;
  if (m.includes('opus')) return prices.opus;
  return prices.sonnet;
}

export function costUSD(tokens, pricePerMillion) {
  return (tokens / 1e6) * pricePerMillion;
}

export function fmtUSD(n) {
  if (n < 0.001) return '$' + (n * 1000).toFixed(2) + 'm';
  if (n < 1) return '$' + n.toFixed(4);
  return '$' + n.toFixed(3);
}

/**
 * Compare text-cost vs image-cost for a given input and rendered dimensions.
 *
 * @param {object} args
 * @param {string} args.text - Full original text.
 * @param {number} args.imageWidth - Rendered PNG width (px).
 * @param {number} args.imageHeight - Rendered PNG height (px).
 * @param {number} [args.keepChars=0] - Chars kept as text (exact-recall spans).
 * @param {string} args.model - Model id (haiku|sonnet|opus).
 * @param {object} [args.prices] - Override default prices.
 * @returns {{textTokens:number,imageTokens:number,textCost:number,imageCost:number,saved:number,savedPct:number}}
 */
export function compareCost({ text, imageWidth, imageHeight, keepChars = 0, model, prices = DEFAULT_PRICES }) {
  const textTokens = estimateTextTokens((text || '').length);
  const imageTokens = estimateImageTokens(imageWidth, imageHeight) + estimateTextTokens(keepChars) + 50;
  const price = priceFor(model, prices);
  const textCost = costUSD(textTokens, price);
  const imageCost = costUSD(imageTokens, price);
  const saved = textCost - imageCost;
  const savedPct = textCost > 0 ? (saved / textCost) * 100 : 0;
  return { textTokens, imageTokens, textCost, imageCost, saved, savedPct };
}
