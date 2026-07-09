// fallpx SDK · sovereign single-file library · MIT · AI-Native Solutions
// Extracted from fallpx/index.html · 16512 bytes of source logic
// Public-safe: no primes/glyphs/dyad references

const state={apiKey:'',history:[],prices:{haiku:1,sonnet:3,opus:5},preservePatterns:['hex40','uuid','base64','jsonkey','longnum'],inputText:'',renderedImage:null,imageTokens:0,textTokens:0,preservedSpans:[]};
const DB_NAME='fallpx',DB_VERSION=1;
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv');if(!d.objectStoreNames.contains('history'))d.createObjectStore('history',{keyPath:'id',autoIncrement:true})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function setKV(k,v){const d=await openDB();return new Promise((res,rej)=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
async function getKV(k){const d=await openDB();return new Promise((res,rej)=>{const t=d.transaction('kv','readonly');const r=t.objectStore('kv').get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function addHistory(rec){const d=await openDB();return new Promise((res,rej)=>{const t=d.transaction('history','readwrite');t.objectStore('history').add(rec);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
async function loadHistory(){const d=await openDB();return new Promise((res,rej)=>{const t=d.transaction('history','readonly');const r=t.objectStore('history').getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
async function clearHistory(){const d=await openDB();return new Promise((res)=>{const t=d.transaction('history','readwrite');t.objectStore('history').clear();t.oncomplete=()=>res()})}
async function wipeAll(){const d=await openDB();return new Promise((res)=>{const t=d.transaction(['kv','history'],'readwrite');t.objectStore('kv').clear();t.objectStore('history').clear();t.oncomplete=()=>res()})}
const PATTERNS={hex40:/\b[0-9a-fA-F]{40}\b/g,hex32:/\b[0-9a-fA-F]{32}\b/g,uuid:/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,base64:/\b[A-Za-z0-9+/]{40,}={0,2}\b/g,jsonkey:/"[a-zA-Z_][a-zA-Z0-9_]{2,}"\s*:/g,longnum:/\b\d{10,}\b/g,skant:/sk-ant-[A-Za-z0-9_-]{20,}/g,skopenai:/sk-[A-Za-z0-9]{40,}/g,sha:/[0-9a-f]{64}/g};
function detectPreserved(text,enabledPatternNames){const spans=[];for(const name of enabledPatternNames){const pat=PATTERNS[name];if(!pat)continue;pat.lastIndex=0;let m;while((m=pat.exec(text))!==null){spans.push({start:m.index,end:m.index+m[0].length,text:m[0],pattern:name})}}spans.sort((a,b)=>a.start-b.start);const merged=[];for(const s of spans){if(merged.length&&s.start<=merged[merged.length-1].end){merged[merged.length-1].end=Math.max(merged[merged.length-1].end,s.end)}else merged.push({...s})}return merged}
function splitByPreserved(text,spans){const parts=[];let cursor=0;for(const s of spans){if(s.start>cursor)parts.push({type:'image',text:text.slice(cursor,s.start)});parts.push({type:'keep',text:text.slice(s.start,s.end),pattern:s.pattern});cursor=s.end}if(cursor<text.length)parts.push({type:'image',text:text.slice(cursor)});return parts}
function estimateTextTokens(chars){return Math.ceil(chars/4)}
function estimateImageTokens(w,h){return Math.ceil(w/28)*Math.ceil(h/28)}
function priceFor(model){if(model.includes('haiku'))return state.prices.haiku;if(model.includes('sonnet'))return state.prices.sonnet;if(model.includes('opus'))return state.prices.opus;return state.prices.sonnet}
function costUSD(tokens,pricePerMillion){return (tokens/1e6)*pricePerMillion}
function fmtUSD(n){if(n<0.001)return '$'+(n*1000).toFixed(2)+'m';if(n<1)return '$'+n.toFixed(4);return '$'+n.toFixed(3)}
async function canvasToPngBase64(canvas){return new Promise(res=>{canvas.toBlob(blob=>{const r=new FileReader();r.onloadend=()=>res(r.result.split(',')[1]);r.readAsDataURL(blob)},'image/png')})}
async function callClaude(model,systemPrompt,userTextParts,imagesB64){const body={model,max_tokens:4096,system:systemPrompt,messages:[{role:'user',content:[...imagesB64.map(b=>({type:'image',source:{type:'base64',media_type:'image/png',data:b}})),...userTextParts.map(t=>({type:'text',text:t}))]}]};const t0=performance.now();const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':state.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify(body)});const dt=performance.now()-t0;if(!r.ok){const err=await r.text();throw new Error('HTTP '+r.status+': '+err.slice(0,500))}const data=await r.json();return{data,latencyMs:Math.round(dt)}}
function escapeHtml(s){return String(s||'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[c])}
function debounce(fn,ms){let t;return function(...a){clearTimeout(t);t=setTimeout(()=>fn.apply(this,a),ms)}}
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{})}
bootstrap();

// Named exports for the primary API surface
export { openDB };
export { setKV };
export { getKV };
export { addHistory };
export { loadHistory };
export { clearHistory };
export { wipeAll };
export { detectPreserved };
export { splitByPreserved };
export { estimateTextTokens };

export { DB_NAME };
export { PATTERNS };
