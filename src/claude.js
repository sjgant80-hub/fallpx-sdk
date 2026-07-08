// src/claude.js — BYOK Anthropic API call with image-first payload.
// Direct-to-Anthropic. No proxy. Key stays on caller.

import { priceFor, costUSD, DEFAULT_PRICES, estimateTextTokens } from './cost.js';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const SYSTEM_PROMPT = `You are analysing content sent primarily as a compact image of dense reflowed text (monospace, low font-size). Read the image carefully and treat its OCR'd contents as the user's primary context. Exact-recall content (hashes, UUIDs, keys, long numbers) has been extracted from the image and preserved verbatim below — trust these strings exactly, don't re-OCR them from the image if the image also shows them.`;

/**
 * Send one or more packed PNGs + preserved-verbatim text + a user prompt to Claude.
 *
 * @param {object} args
 * @param {string} args.apiKey - Anthropic API key (sk-ant-...).
 * @param {string} args.model - e.g. 'claude-sonnet-4-6'.
 * @param {string[]} args.imagesB64 - Base64 PNGs (no data-URI prefix).
 * @param {string} [args.keepText=''] - Preserved-verbatim strings (concatenated).
 * @param {string} [args.prompt=''] - User instruction.
 * @param {number} [args.maxTokens=4096]
 * @param {string} [args.systemPrompt] - Override the default packed-image system prompt.
 * @param {boolean} [args.directBrowserAccess=false] - Set the browser-cors header.
 * @returns {Promise<{text:string,usage:object,latencyMs:number,raw:object}>}
 */
export async function sendToClaude({
  apiKey,
  model,
  imagesB64,
  keepText = '',
  prompt = '',
  maxTokens = 4096,
  systemPrompt = SYSTEM_PROMPT,
  directBrowserAccess = false,
}) {
  if (!apiKey) throw new Error('apiKey required');
  if (!model) throw new Error('model required');
  if (!Array.isArray(imagesB64) || imagesB64.length === 0) throw new Error('imagesB64 must be a non-empty array');

  const userParts = [];
  if (keepText) userParts.push({ type: 'text', text: 'EXACT-RECALL PRESERVED STRINGS:\n' + keepText });
  userParts.push({ type: 'text', text: 'TASK: ' + (prompt || 'Summarise the content in the image, then answer any implicit question.') });

  const body = {
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        ...imagesB64.map(b => ({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: b } })),
        ...userParts,
      ],
    }],
  };

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };
  if (directBrowserAccess) headers['anthropic-dangerous-direct-browser-access'] = 'true';

  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const r = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify(body) });
  const latencyMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
  if (!r.ok) {
    const err = await r.text();
    throw new Error('Anthropic HTTP ' + r.status + ': ' + err.slice(0, 500));
  }
  const data = await r.json();
  const text = (data.content || []).map(c => c.type === 'text' ? c.text : '').join('\n').trim();
  return { text, usage: data.usage || {}, latencyMs, raw: data };
}

/**
 * Given a completed Anthropic response + the original text size, compute
 * actual USD vs what it would have cost sending the raw text.
 */
export function computeSavings({ usage, textChars, model, prices = DEFAULT_PRICES }) {
  const price = priceFor(model, prices);
  const inputTok = usage?.input_tokens || 0;
  const outputTok = usage?.output_tokens || 0;
  const actualCost = costUSD(inputTok, price) + costUSD(outputTok, price * 5);
  const textEquivInput = estimateTextTokens(textChars);
  const textEquivCost = costUSD(textEquivInput, price) + costUSD(outputTok, price * 5);
  const saved = textEquivCost - actualCost;
  const savedPct = textEquivCost > 0 ? (saved / textEquivCost) * 100 : 0;
  return { actualCost, textEquivCost, saved, savedPct, inputTok, outputTok };
}
