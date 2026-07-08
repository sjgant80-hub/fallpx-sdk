# @ai-native-solutions/fallpx-sdk

Sovereign SDK for **FallPx** — pack dense text into compact PNGs before sending to Claude. Cuts input costs ~60% on long code, docs, transcripts, and logs. Auto-preserves exact-recall spans (hashes, UUIDs, keys) as text so nothing critical gets mis-OCR'd.

The SDK exposes the exact renderer, detector, splitter, cost calculator, and Anthropic client that power the [FallPx browser app](https://sjgant80-hub.github.io/fallpx-sdk/). Use it to embed image-pack Claude calls in any web app, Node.js service, or Electron app.

> **Trade-off:** the model reads back via OCR, which is lossy. FallPx auto-detects exact-recall patterns and keeps them as text — but do not use this for tasks requiring byte-exact recall of the packed content.

## Install

```bash
npm install @ai-native-solutions/fallpx-sdk
# Node users also install `canvas` for server-side PNG rendering:
npm install canvas
```

Browsers use the built-in `<canvas>` — no peer dep needed.

## Quick start

```js
import { pack, packAndSend } from '@ai-native-solutions/fallpx-sdk';

// One-shot pack: detect, split, render, cost
const packed = await pack(myLongText, {
  fontSize: 12,
  maxWidth: 1440,
  model: 'claude-sonnet-4-6',
});
console.log(`Saved ${packed.cost.savedPct.toFixed(1)}%`);
console.log(`Image: ${packed.dims.width}×${packed.dims.height}`);
console.log(`Preserved: ${packed.spans.length} exact-recall spans`);

// Full pipeline: pack + send to Claude in one call
const result = await packAndSend({
  text: myLongText,
  prompt: 'Summarise this and find any bugs',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-6',
});
console.log(result.response);
console.log(`Actual: ${result.savings.actualCost} · Saved ${result.savings.savedPct.toFixed(1)}%`);
```

## Full API surface

### `pack(text, opts?) → Promise<PackResult>`

One-shot pipeline: detect exact-recall spans, split, render packed PNG, cost it.

```js
const packed = await pack(text, {
  patterns: ['hex40', 'uuid', 'skant', 'sha256'],
  fontSize: 12,          // density in px (10-18 typical)
  maxWidth: 1440,        // page width (768-1568)
  maxHeight: 1568,       // Anthropic max useful
  model: 'claude-sonnet-4-6',
  prices: { haiku: 1, sonnet: 3, opus: 5 }, // $/1M input tokens
});
// → { imagesB64, keepText, dims, pages, cost, spans, parts, truncated }
```

### `packAndSend(args) → Promise<PackAndSendResult>`

Full pipeline: pack + send to Claude + compute actual savings.

```js
const r = await packAndSend({
  text, prompt, apiKey,
  model: 'claude-sonnet-4-6',
  directBrowserAccess: false,  // set true in browsers
});
// → { response, packed, usage, latencyMs, savings, raw }
```

### Detection (`/detect`)

```js
import { detectPreserved, PATTERNS, DEFAULT_PATTERNS, addPattern } from '@ai-native-solutions/fallpx-sdk';

detectPreserved(text);                          // uses DEFAULT_PATTERNS
detectPreserved(text, ['hex40', 'uuid']);       // custom subset
addPattern('phone', /\b\d{3}-\d{3}-\d{4}\b/g);  // register a new one
```

Built-in patterns:

- `hex40` — SHA-1 style
- `hex32` — MD5 / short hash
- `uuid` — RFC 4122
- `base64` — long b64 strings
- `jsonkey` — `"key":` structural keys
- `longnum` — 10+ digit numbers
- `skant` — Anthropic API keys
- `skopenai` — OpenAI-style keys
- `sha256` — 64-char lowercase hex

### Splitting (`/split`)

```js
import { splitByPreserved, imageText, keepText } from '@ai-native-solutions/fallpx-sdk';

const parts = splitByPreserved(text, spans);
const img = imageText(parts);      // → concatenated image-safe text
const keep = keepText(parts, ' '); // → concatenated preserved-verbatim
```

### Cost (`/cost`)

```js
import { compareCost, estimateTextTokens, estimateImageTokens, priceFor, DEFAULT_PRICES } from '@ai-native-solutions/fallpx-sdk';

estimateImageTokens(1440, 1568);   // → ⌈1440/28⌉ × ⌈1568/28⌉
priceFor('claude-opus-4-7');        // → 5
compareCost({ text, imageWidth: 1440, imageHeight: 1568, keepChars: 200, model: 'claude-sonnet-4-6' });
```

### Rendering (`/render`)

```js
import { renderTextToImage, canvasToPngBase64 } from '@ai-native-solutions/fallpx-sdk';

const rendered = await renderTextToImage(text, { fontSize: 12, maxWidth: 1440 });
const b64 = await canvasToPngBase64(rendered.canvas);
```

Works in browser (`document.createElement('canvas')`) and Node (`import('canvas')`).

### Anthropic client (`/claude`)

```js
import { sendToClaude, computeSavings } from '@ai-native-solutions/fallpx-sdk';

const resp = await sendToClaude({
  apiKey, model: 'claude-sonnet-4-6',
  imagesB64: [b64],
  keepText: 'preserved-verbatim strings',
  prompt: 'your task',
});
const savings = computeSavings({ usage: resp.usage, textChars: text.length, model: 'claude-sonnet-4-6' });
```

## How the pricing works

Anthropic bills images at `⌈width/28⌉ × ⌈height/28⌉` visual tokens. That count is fixed by pixel dimensions — not by how many characters got packed inside. A 1568×1568 PNG bills as ~3,000 tokens whether it holds 3,000 or 15,000 characters of monospace text.

Reference: DeepSeek-OCR (Oct 2025) demonstrated ~10× compression at ~97% precision; pxpipe (Dec 2025) proved the Claude application.

**Window, not floor.** Anthropic can reprice image tokens at any time. Treat the savings as a temporary edge, not a permanent baseline.

## Sovereignty

- Your API key is passed as an argument. It never leaves your process.
- No telemetry, no callbacks, no upstream reporting.
- MIT.

## Related

- **[fallpx-mcp](https://github.com/sjgant80-hub/fallpx-mcp)** — Model Context Protocol server exposing the same tools to Claude Desktop / agents.
- **[fallpx-api](https://github.com/sjgant80-hub/fallpx-api)** — HTTP proxy (Docker) for services that can't take the SDK directly.
- **[FallPx browser app](https://sjgant80-hub.github.io/fallpx-sdk/)** — the source-of-truth reference implementation.

## License

MIT · AI-Native Solutions
