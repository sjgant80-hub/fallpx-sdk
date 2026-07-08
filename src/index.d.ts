// TypeScript declarations for @ai-native-solutions/fallpx-sdk

export interface PreservedSpan {
  start: number;
  end: number;
  text: string;
  pattern: string;
}

export interface PartSegment {
  type: 'image' | 'keep';
  text: string;
  pattern?: string;
}

export interface CostComparison {
  textTokens: number;
  imageTokens: number;
  textCost: number;
  imageCost: number;
  saved: number;
  savedPct: number;
}

export interface Prices {
  haiku: number;
  sonnet: number;
  opus: number;
}

export interface RenderOptions {
  fontSize?: number;
  maxWidth?: number;
  maxHeight?: number;
  padding?: number;
  lineHeight?: number;
  bg?: string;
  fg?: string;
  fontFamily?: string;
  canvas?: any;
}

export interface RenderResult {
  canvas: any;
  width: number;
  height: number;
  imageTokens: number;
  totalPages: number;
  linesPerPage: number;
  totalLines: number;
  truncated: boolean;
}

export interface PackResult {
  imagesB64: string[];
  keepText: string;
  dims: { width: number; height: number };
  pages: number;
  truncated: boolean;
  cost: CostComparison;
  spans: PreservedSpan[];
  parts: PartSegment[];
}

export interface ClaudeResponse {
  text: string;
  usage: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
  };
  latencyMs: number;
  raw: any;
}

export interface Savings {
  actualCost: number;
  textEquivCost: number;
  saved: number;
  savedPct: number;
  inputTok: number;
  outputTok: number;
}

export interface PackAndSendResult {
  response: string;
  packed: PackResult;
  usage: object;
  latencyMs: number;
  savings: Savings;
  raw: any;
}

export const PATTERNS: Record<string, RegExp>;
export const DEFAULT_PATTERNS: string[];
export const DEFAULT_PRICES: Prices;
export const VERSION: string;

export function detectPreserved(text: string, enabled?: string[]): PreservedSpan[];
export function addPattern(name: string, regex: RegExp): void;
export function splitByPreserved(text: string, spans: PreservedSpan[]): PartSegment[];
export function imageText(parts: PartSegment[]): string;
export function keepText(parts: PartSegment[], sep?: string): string;

export function estimateTextTokens(chars: number): number;
export function estimateImageTokens(width: number, height: number): number;
export function priceFor(model: string, prices?: Prices): number;
export function costUSD(tokens: number, pricePerMillion: number): number;
export function fmtUSD(n: number): string;
export function compareCost(args: {
  text: string; imageWidth: number; imageHeight: number;
  keepChars?: number; model: string; prices?: Prices;
}): CostComparison;

export function renderTextToImage(text: string, opts?: RenderOptions): Promise<RenderResult>;
export function canvasToPngBase64(canvas: any): Promise<string>;

export function sendToClaude(args: {
  apiKey: string; model: string; imagesB64: string[];
  keepText?: string; prompt?: string; maxTokens?: number;
  systemPrompt?: string; directBrowserAccess?: boolean;
}): Promise<ClaudeResponse>;

export function computeSavings(args: {
  usage: object; textChars: number; model: string; prices?: Prices;
}): Savings;

export function pack(text: string, opts?: {
  patterns?: string[]; fontSize?: number; maxWidth?: number; maxHeight?: number;
  model?: string; prices?: Prices;
}): Promise<PackResult>;

export function packAndSend(args: {
  text: string; prompt?: string; apiKey: string; model?: string;
  patterns?: string[]; fontSize?: number; maxWidth?: number; maxHeight?: number;
  prices?: Prices; directBrowserAccess?: boolean;
}): Promise<PackAndSendResult>;
