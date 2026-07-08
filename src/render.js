// src/render.js — text-to-PNG renderer.
// Extracted from fallpx/index.html renderTextToCanvas().
// Works in both browser (uses global canvas) and Node (auto-imports `canvas` if available).
// Node users: `npm install canvas` in your consuming project — kept optional here.

import { estimateImageTokens } from './cost.js';

const DEFAULTS = {
  fontSize: 12,          // density in px
  maxWidth: 1440,        // packed page width in px
  maxHeight: 1568,       // Anthropic max useful dimension
  padding: 16,
  lineHeight: 1.42,
  bg: '#0d0d10',
  fg: '#e8e4db',
  fontFamily: '"JetBrains Mono","Courier New",monospace',
};

async function getCanvas(w, h) {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  // Node path — dynamic import so bundlers don't force the dep.
  try {
    const mod = await import('canvas');
    return mod.createCanvas(w, h);
  } catch (e) {
    throw new Error("fallpx-sdk: no <canvas> in this env. In Node, `npm install canvas` in your project.");
  }
}

/**
 * Render text into a packed monospace PNG.
 * Returns dimensions, image-token estimate, page count, and a canvas handle.
 *
 * @param {string} text
 * @param {object} [opts]
 * @param {number} [opts.fontSize=12]
 * @param {number} [opts.maxWidth=1440]
 * @param {number} [opts.maxHeight=1568]
 * @param {HTMLCanvasElement|import('canvas').Canvas} [opts.canvas] - reuse an existing canvas (browser).
 * @returns {Promise<{canvas:any,width:number,height:number,imageTokens:number,totalPages:number,linesPerPage:number,totalLines:number,truncated:boolean}>}
 */
export async function renderTextToImage(text, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const canvas = opts.canvas || await getCanvas(o.maxWidth, o.maxHeight);
  const ctx = canvas.getContext('2d');
  ctx.font = `${o.fontSize}px ${o.fontFamily}`;
  const charWidth = ctx.measureText('M').width;
  const usableWidth = o.maxWidth - o.padding * 2;
  const charsPerLine = Math.max(1, Math.floor(usableWidth / charWidth));

  const rawLines = String(text || '').split('\n');
  const wrapped = [];
  for (const line of rawLines) {
    if (line.length <= charsPerLine) { wrapped.push(line); continue; }
    let start = 0;
    while (start < line.length) {
      wrapped.push(line.slice(start, start + charsPerLine));
      start += charsPerLine;
    }
  }
  const lineHeightPx = Math.ceil(o.fontSize * o.lineHeight);
  const usableHeight = o.maxHeight - o.padding * 2;
  const linesPerPage = Math.max(1, Math.floor(usableHeight / lineHeightPx));
  const totalPages = Math.max(1, Math.ceil(wrapped.length / linesPerPage));
  const actualLines = Math.min(wrapped.length, linesPerPage);
  const actualHeight = o.padding * 2 + actualLines * lineHeightPx;

  canvas.width = o.maxWidth;
  canvas.height = actualHeight;
  ctx.fillStyle = o.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${o.fontSize}px ${o.fontFamily}`;
  ctx.fillStyle = o.fg;
  ctx.textBaseline = 'top';
  for (let i = 0; i < actualLines; i++) {
    ctx.fillText(wrapped[i] || '', o.padding, o.padding + i * lineHeightPx);
  }

  return {
    canvas,
    width: canvas.width,
    height: actualHeight,
    imageTokens: estimateImageTokens(canvas.width, actualHeight),
    totalPages,
    linesPerPage,
    totalLines: wrapped.length,
    truncated: wrapped.length > linesPerPage,
  };
}

/**
 * Convert a rendered canvas to base64 PNG (no data-URI prefix).
 * Browser: uses canvas.toBlob → FileReader. Node: uses canvas.toBuffer.
 */
export async function canvasToPngBase64(canvas) {
  // Node canvas: has toBuffer synchronously.
  if (typeof canvas.toBuffer === 'function') {
    return canvas.toBuffer('image/png').toString('base64');
  }
  // Browser canvas.
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) return reject(new Error('canvas.toBlob returned null'));
      const r = new FileReader();
      r.onloadend = () => resolve(String(r.result).split(',')[1]);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    }, 'image/png');
  });
}
