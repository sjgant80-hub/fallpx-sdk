// examples/quick-start.mjs — 30-line demo of the fallpx SDK.
// Run: node examples/quick-start.mjs
// Requires: `npm install canvas` in the consuming project for Node rendering.

import { detectPreserved, splitByPreserved, compareCost, pack } from '../src/index.js';

const text = `
Function computeHash(input) {
  // Session id: e6f4a2d8-9b1c-4e5f-a3b7-8c2d1e4f5a6b
  // Auth token: sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_abcDEF
  const sha = "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b";
  return { sessionId: input.sid, cost: 1234567890, sha };
}
`.repeat(50);

// Primitive: detect exact-recall spans
const spans = detectPreserved(text);
console.log(`Detected ${spans.length} exact-recall spans:`);
for (const s of spans.slice(0, 3)) console.log(`  ${s.pattern}: ${s.text.slice(0, 40)}…`);

// Primitive: split
const parts = splitByPreserved(text, spans);
console.log(`\nSplit into ${parts.length} segments (image + keep).`);

// Primitive: cost projection at fake dimensions
const cost = compareCost({ text, imageWidth: 1440, imageHeight: 1568, keepChars: 200, model: 'claude-sonnet-4-6' });
console.log(`\nProjected — text: ${cost.textTokens} tok  image: ${cost.imageTokens} tok  saved: ${cost.savedPct.toFixed(1)}%`);

// Full pipeline (requires `canvas` npm dep in Node)
try {
  const packed = await pack(text, { fontSize: 12, maxWidth: 1440, model: 'claude-sonnet-4-6' });
  console.log(`\nPacked — ${packed.dims.width}×${packed.dims.height} · ${packed.pages} page(s)`);
  console.log(`Cost — text: ${packed.cost.textTokens} tok · image: ${packed.cost.imageTokens} tok · saved: ${packed.cost.savedPct.toFixed(1)}%`);
  console.log(`Base64 PNG length: ${packed.imagesB64[0].length} chars`);
} catch (e) {
  console.log(`\n(skip pack() — ${e.message})`);
}
