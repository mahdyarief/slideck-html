/* slideck-html build.js — gabung slides/*.html → dist/<deck>.html. Zero dependency (node stdlib only). */
/* Versi: 2.2.0 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const DIR = __dirname;
const { expandSlide } = require("./lib/layout");
const { renderChart } = require("./lib/chart");
const { renderShape, renderConnector } = require("./lib/shape");
const { renderFlow } = require("./lib/flow");
const { renderDiagram } = require("./lib/diagram");
const { renderIcon } = require("./lib/icon");
const { parseAttrs, unesc, esc, escAttr, deckRoot, outputName } = require("./lib/util");
const { webFormat } = require("./lib/font");
const { lintDesign, lintTheme } = require("./lib/design-lint");
const { lintInteractive } = require("./lib/interactive-lint");

const VERSION = "2.2.0";
const LOCK_FILE = "FROZEN.json";
const relock = process.argv.includes("--lock");

/* Folder deck (deck.json + slides/): --root <dir>, atau folder kerja bila berisi deck.json, atau repo ini.
   Template, components, themes, motions, dan assets selalu diambil dari folder tool (DIR). */
const SRC = deckRoot(DIR);

const readIf = (p) => { try { return fs.readFileSync(p, "utf8"); } catch (e) { return null; } };
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 16);
const warn = (m) => console.warn("  ! " + m);
const fail = (m) => { console.error("  x " + m); process.exit(1); };
const readJson = (p, what) => { const t = readIf(p); if (t === null) return null; try { return JSON.parse(t); } catch (e) { fail(what + " bukan JSON yang valid: " + e.message); } };
/* JSON di dalam <script>: "<" di-escape supaya isi seperti "</script>" tidak menutup tag */
const scriptJson = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

/* File beku = shell + build + semua design/theme/motion (infrastruktur bersama). */
const walk = (rel) => {
  const abs = path.join(DIR, rel);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return [rel];
  return fs.readdirSync(abs).flatMap((n) => walk(rel + "/" + n));
};
const FROZEN = ["template.html", "core.css", "build.js", "pdf.js", "check.js", "pptx.js", "import.js",
  ...walk("bin"), ...walk("lib"), ...walk("layouts"), ...walk("designs"), ...walk("themes"), ...walk("motions")]
  .filter((f) => fs.existsSync(path.join(DIR, f))).sort();

/* ---------- 1. deck.json ---------- */
const deck = readJson(path.join(SRC, "deck.json"), "deck.json");
if (!deck) fail("deck.json tidak ketemu di " + SRC);
if (!deck.output) warn("deck.output kosong — pakai deck.html");
else if (outputName(deck.output) !== deck.output) warn("deck.output tanpa .html — ditulis sebagai " + outputName(deck.output));
deck.output = outputName(deck.output);
const themeName = deck.theme || "navy";
const motionName = deck.motion || "corporate";

/* ---------- 2. frozen-file lock ---------- */
const currentLock = {};
for (const f of FROZEN) currentLock[f] = sha(path.join(DIR, f));
const lockPath = path.join(DIR, LOCK_FILE);
const savedLock = readJson(lockPath, LOCK_FILE);
if (relock || !savedLock) {
  fs.writeFileSync(lockPath, JSON.stringify(currentLock, null, 2) + "\n");
  console.log("  lock ditulis: " + LOCK_FILE);
} else {
  for (const f of FROZEN) {
    if (savedLock[f] && savedLock[f] !== currentLock[f]) {
      warn("frozen file berubah: " + f + " (lock " + savedLock[f] + " → sekarang " + currentLock[f] + ")");
    }
  }
}

/* ---------- 3. CSS = components + theme + motion ---------- */
const template = fs.readFileSync(path.join(DIR, "template.html"), "utf8");
/* Design/theme/motion milik deck (<deck>/designs, <deck>/themes, <deck>/motions) menang atas bawaan dengan nama sama.
   Milik deck tidak dibekukan, tapi dicek aturannya (lib/design-lint.js, panduan: docs/custom-design.md). */
const own = (kind, rel) => SRC !== DIR && fs.existsSync(path.join(SRC, kind, rel)) ? path.join(SRC, kind, rel) : path.join(DIR, kind, rel);
const isOwn = (p) => SRC !== DIR && p.startsWith(SRC + path.sep);
const listNames = (kind, ext) => [...new Set([DIR, SRC].flatMap((root) => {
  const d = path.join(root, kind);
  return fs.existsSync(d) ? fs.readdirSync(d).filter((n) => ext ? n.endsWith(ext) : fs.statSync(path.join(d, n)).isDirectory()).map((n) => ext ? n.slice(0, -ext.length) : n) : [];
}))].sort();
const designName = deck.design || "default";
const designDir = own("designs", designName);
const base = readIf(path.join(designDir, "components.css"));
if (base === null) fail("design tidak ketemu: " + designName + " (dicari di " + (SRC !== DIR ? "<deck>/designs/ dan " : "") + "designs/). Ada: " + listNames("designs").join(", "));
const lintReport = (r, what) => {
  for (const w of r.warnings) warn(what + " " + r.name + " [" + w.rule + "] " + w.msg);
  for (const e of r.errors) console.error("  x " + what + " " + r.name + " [" + e.rule + "] " + e.msg);
  if (r.errors.length) fail(what + " " + r.name + " melanggar " + r.errors.length + " aturan — lihat docs/custom-design.md");
};
if (isOwn(designDir)) lintReport(lintDesign(designDir, { themes: listNames("themes", ".css"), motions: listNames("motions", ".css") }), "design");
let extra = "";
const themePath = own("themes", themeName + ".css");
if (isOwn(themePath)) lintReport(lintTheme(themePath), "theme");
const themeCss = readIf(themePath);
if (themeCss === null) warn("theme tidak ketemu: " + themeName + " — pakai token default dari components.css");
else extra += "\n" + themeCss;
/* motion v2: corporate · cinematic · editorial · keynote · static. "playful" (v1) sudah dihapus → corporate. */
let motionCss = readIf(own("motions", motionName + ".css"));
if (motionCss === null) {
  warn(motionName === "playful" ? 'motion "playful" sudah tidak ada sejak 2.2 — pakai corporate (atau pilih cinematic, editorial, keynote, static)'
    : "motion tidak ketemu: " + motionName + " — pakai corporate");
  motionCss = readIf(path.join(DIR, "motions", "corporate.css"));
}
if (motionCss !== null) extra += "\n" + motionCss;
/* core.css = komponen bersama semua design (layout placeholder, chart, shape, flow) — dimuat sebelum design */
/* design berkanvas gelap (.slide berlatar --navy) → slide diberi kelas on-dark agar chart/shape/flow memakai varian terang.
   Bisa dipaksa lewat designs/<nama>/design.json: "canvas": "dark" | "light". */
const designMeta = readJson(path.join(designDir, "design.json"), "design.json") || {};
const darkCanvas = designMeta.canvas ? designMeta.canvas === "dark" : /\.slide\s*\{[^}]*background:\s*var\(--navy\)/.test(base);
const lightCover = designMeta.cover === "light";
const coreCss = readIf(path.join(DIR, "core.css")) || "";
const components = "/* ==== CORE ==== */\n" + coreCss + "\n/* ==== DESIGN: " + designName + " ==== */\n" + base + extra;

// === Theme switcher: inject semua theme CSS + switcher UI ke output ===
const allThemes = [];
let allThemeCss = "";
const OPTIONAL_TOKENS = { "on-teal": "var(--surface)", accent2: "var(--teal-d)", "on-accent2": "var(--surface)", cover: "var(--navy)" };
{
  for (const name of listNames("themes", ".css")) {
    const css = fs.readFileSync(own("themes", name + ".css"), "utf8");
    allThemes.push(name);
    // scope theme CSS agar bisa di-switch: :root → [data-theme="nama"]
    /* token opsional yang tidak ditulis theme diisi default core.css di scope-nya sendiri; tanpa ini nilai dari
       theme bawaan deck (:root) bocor ke theme yang dipilih lewat switcher */
    const missing = Object.entries(OPTIONAL_TOKENS).filter(([k]) => !new RegExp("--" + k + "\\s*:").test(css)).map(([k, v]) => "--" + k + ":" + v + ";").join("");
    let scoped = css.replace(/:root\s*\{/, `[data-theme="${name}"] {` + missing);
    /* --accent-on-dark: warna aksen kicker di slide gelap (sampul, section), untuk theme yang aksennya mirip latar gelapnya */
    if (/--accent-on-dark\s*:/.test(css)) { const s = `[data-theme="${name}"] `; scoped += `\n${s}.slide.dark :is(.kicker,.idx:not(.dot)),${s}.slide[style*="var(--navy)"] :is(.kicker,.idx:not(.dot)),${s}.slide .is-key :is(.idx:not(.dot),:not(.ico-badge)>.ico){color:var(--accent-on-dark)}`; }
    allThemeCss += "\n/* ==== THEME: " + name + " ==== */\n" + scoped;
  }
}
/* menu theme custom (bukan <select>: daftar bawaan OS tidak bisa ditata). Swatch tiap opsi memakai token theme itu sendiri
   lewat data-theme pada span, jadi tidak ada warna yang di-hardcode. */
const swatch = (name) => `<span class="dts-sw" data-theme="${name}" aria-hidden="true"><i></i><i></i><i></i></span>`;
const themeOptions = allThemes.map((name) =>
  `    <li role="option" id="dts-${name}" data-v="${name}" aria-selected="${name === themeName}">${swatch(name)}<span>${name}</span></li>`).join("\n");
/* bahasa deck (atribut lang + teks UI layar): deck.lang, default "id" */
const LANG = String(deck.lang || "id");
const UI = /^en\b/i.test(LANG)
  ? { hint: "← → / Space to navigate · E to edit text", theme: "Theme", pick: "Choose theme" }
  : { hint: "← → / Space navigasi · E edit teks", theme: "Tema", pick: "Pilih tema" };
const themeSwitcherHtml = `
<style>
/* ==== THEME SWITCHER CSS (inject oleh build.js) ==== */
.deck-theme-switcher{position:fixed;top:20px;right:20px;z-index:1002;font:13px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff}
.dts-btn{display:flex;align-items:center;gap:10px;background:rgba(14,16,24,.62);color:inherit;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:7px 12px 7px 14px;font:inherit;cursor:pointer;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 4px 18px rgba(0,0,0,.18);transition:background .15s,border-color .15s}
.dts-btn:hover,.dts-btn[aria-expanded="true"]{background:rgba(14,16,24,.8);border-color:rgba(255,255,255,.3)}
.dts-btn:focus-visible{outline:2px solid rgba(255,255,255,.7);outline-offset:2px}
.dts-list:focus{outline:none}
.dts-list li.on{box-shadow:inset 0 0 0 1px rgba(255,255,255,.28)}
.dts-lab{opacity:.6;font-weight:500}
.dts-name{font-weight:600}
.dts-btn svg{width:12px;height:12px;opacity:.7;transition:transform .15s}
.dts-btn[aria-expanded="true"] svg{transform:rotate(180deg)}
.dts-sw{display:inline-flex;flex:none}
.dts-sw i{width:14px;height:14px;border-radius:50%;box-shadow:0 0 0 1.5px rgba(14,16,24,.85)}
.dts-sw i+i{margin-left:-5px}
.dts-sw i:nth-child(1){background:var(--surface)}
.dts-sw i:nth-child(2){background:var(--navy)}
.dts-sw i:nth-child(3){background:var(--teal)}
.dts-list{position:absolute;top:calc(100% + 8px);right:0;min-width:220px;max-height:min(70vh,460px);overflow:auto;margin:0;padding:6px;list-style:none;background:rgba(18,20,30,.94);border:1px solid rgba(255,255,255,.12);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.4);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transform-origin:top right;animation:dts-in .14s ease-out}
.dts-list[hidden]{display:none}
@keyframes dts-in{from{opacity:0;transform:translateY(-4px) scale(.98)}}
.dts-list li{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:9px;cursor:pointer;white-space:nowrap;outline-offset:-2px}
.dts-list li:hover,.dts-list li.on{background:rgba(255,255,255,.08)}
.dts-list li[aria-selected="true"]{background:rgba(255,255,255,.14);font-weight:600}
.dts-list li[aria-selected="true"]::after{content:"";margin-left:auto;width:6px;height:11px;border:solid currentColor;border-width:0 2px 2px 0;transform:rotate(45deg) translate(-2px,-2px)}
html.scroll .deck-theme-switcher{position:absolute;top:8px;right:8px;font-size:12px}
html.scroll .dts-btn{padding:5px 9px 5px 10px;gap:7px}
html.scroll .dts-lab{display:none}
@media (prefers-reduced-motion:reduce){.dts-list{animation:none}.dts-btn,.dts-btn svg{transition:none}}/* ==== SPEAKER NOTES (print-only, jadi halaman PDF) ==== */
.slide-notes{display:none}
@media print{
  .deck-theme-switcher{display:none!important}
  .slide-notes{display:block;box-sizing:border-box;width:1920px;height:1080px;page-break-after:always;break-after:page;padding:120px 140px;background:#fff;color:#111;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
  .slide-notes-h{font-size:34px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#888;margin-bottom:36px;border-bottom:3px solid #ddd;padding-bottom:20px}
  .slide-notes-b{font-size:44px;line-height:1.5;white-space:pre-wrap}
}
</style>
<div class="deck-theme-switcher">
  <button type="button" class="dts-btn" id="theme-btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="theme-list" aria-label="${UI.pick}"><span class="dts-lab">${UI.theme}</span>${swatch(themeName).replace('class="dts-sw"', 'class="dts-sw" id="theme-sw"')}<span class="dts-name" id="theme-name">${themeName}</span><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5"/></svg></button>
  <ul class="dts-list" id="theme-list" role="listbox" aria-label="${UI.pick}" tabindex="-1" hidden>
${themeOptions}
  </ul>
</div>`;
const allThemesArr = JSON.stringify(allThemes);
const themeSwitcherJs = `
/* ==== THEME SWITCHER (inject oleh build.js) ==== */
(function(){
  var btn = document.getElementById('theme-btn'), list = document.getElementById('theme-list');
  if(!btn || !list) return;
  var st = document.documentElement, items = [].slice.call(list.querySelectorAll('li'));
  var sw = document.getElementById('theme-sw'), nm = document.getElementById('theme-name');
  var validThemes = ${allThemesArr};
  var deckTheme = ${JSON.stringify(themeName)};
  var hi = -1;
  function apply(t, save){
    st.setAttribute('data-theme', t); sw.setAttribute('data-theme', t); nm.textContent = t;
    items.forEach(function(li){ li.setAttribute('aria-selected', li.dataset.v === t ? 'true' : 'false') });
    if(save){ try{localStorage.setItem('slideck-theme', t)}catch(e){} }
    /* font theme bisa beda → hitung ulang autofit + connector */
    if(window.slideckFit) requestAnimationFrame(window.slideckFit);
  }
  function mark(i){
    hi = (i + items.length) % items.length;
    items.forEach(function(li, k){ li.classList.toggle('on', k === hi) });
    list.setAttribute('aria-activedescendant', items[hi].id); items[hi].scrollIntoView({block:'nearest'});
  }
  function open(){
    list.hidden = false; btn.setAttribute('aria-expanded', 'true'); list.focus({preventScroll:true});
    mark(Math.max(0, items.findIndex(function(li){ return li.getAttribute('aria-selected') === 'true' })));
  }
  function close(focusBtn){
    if(list.hidden) return;
    list.hidden = true; btn.setAttribute('aria-expanded', 'false');
    items.forEach(function(li){ li.classList.remove('on') });
    if(focusBtn) btn.focus({preventScroll:true});
  }
  btn.addEventListener('click', function(e){ e.stopPropagation(); list.hidden ? open() : close(true) });
  list.addEventListener('click', function(e){
    e.stopPropagation(); var li = e.target.closest('li'); if(!li) return;
    apply(li.dataset.v, true); close(true);
  });
  list.addEventListener('mousemove', function(e){ var li = e.target.closest('li'); if(li) mark(items.indexOf(li)) });
  /* tombol di dalam menu tidak boleh sampai ke navigasi slide */
  btn.parentNode.addEventListener('keydown', function(e){
    e.stopPropagation();
    if(list.hidden){
      if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); open() }
      return;
    }
    if(e.key === 'ArrowDown'){ e.preventDefault(); mark(hi + 1) }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); mark(hi - 1) }
    else if(e.key === 'Home'){ e.preventDefault(); mark(0) }
    else if(e.key === 'End'){ e.preventDefault(); mark(items.length - 1) }
    else if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); apply(items[hi].dataset.v, true); close(true) }
    else if(e.key === 'Escape' || e.key === 'Tab'){ close(e.key === 'Escape') }
  });
  document.addEventListener('click', function(e){ if(!btn.parentNode.contains(e.target)) close(false) });
  var saved = null;
  try{ saved = localStorage.getItem('slideck-theme') }catch(e){}
  apply(saved && validThemes.indexOf(saved) >= 0 ? saved : deckTheme, false);})();`;

/* ---------- 4. font @font-face (base64 inline) ---------- */
let fonts = "";
const fontsJsonPath = path.join(DIR, "assets", "fonts", "fonts.json");
const fontMap = readJson(fontsJsonPath, "assets/fonts/fonts.json") || {};
/* deck.fonts: "theme" (default) = font theme deck saja; "all" = font semua theme (switcher runtime tetap pakai font asli,
   deck lebih besar ±1 MB); "none" = tanpa @font-face (font sistem dari fallback stack). */
const fontMode = deck.fonts || "theme";
if (!["theme", "all", "none"].includes(fontMode)) warn('deck.fonts "' + fontMode + '" tidak dikenal — pakai theme|all|none');
/* Font milik deck: <deck>/fonts/fonts.json (bentuk sama: { "<theme>": [{file, family, weight, style?}] }, file relatif ke <deck>/fonts/). */
const deckFontDir = path.join(SRC, "fonts");
const deckFontMap = SRC !== DIR ? readJson(path.join(deckFontDir, "fonts.json"), "fonts/fonts.json") || {} : {};
/* Theme tanpa entri (mis. theme buatan pengguna): pakai font bawaan yang family-nya disebut di --font-d / --font-s theme itu. */
const fontsFor = (t) => {
  if (deckFontMap[t]) return deckFontMap[t].map((f) => ({ ...f, dir: deckFontDir }));
  if (fontMap[t]) return fontMap[t];
  const css = t === themeName ? themeCss || "" : readIf(own("themes", t + ".css")) || "";
  const all = Object.values(fontMap).flat();
  return all.filter((f, i) => all.findIndex((g) => g.file === f.file) === i && css.includes("'" + f.family + "'"));
};
const fontThemes = fontMode === "none" ? [] : fontMode === "all" ? [...new Set([...Object.keys(fontMap), ...allThemes])] : [themeName];
const seenFont = new Set();
const faces = [];
for (const t of fontThemes) {
  for (const f of fontsFor(t)) {
    if (seenFont.has(f.file)) continue;
    seenFont.add(f.file);
    const fp = path.join(f.dir || path.join(DIR, "assets", "fonts"), f.file);
    if (!fs.existsSync(fp)) { warn("font hilang: " + fp); continue; }
    const buf = fs.readFileSync(fp);
    const wf = webFormat(buf);
    faces.push("@font-face{font-family:'" + f.family + "';font-style:" + (f.style || "normal") + ";font-weight:" + f.weight +
      ";font-display:swap;src:url(data:" + wf.mime + ";base64," + buf.toString("base64") + ") format('" + wf.format + "')}");
  }
}
fonts = faces.join("\n");
/* theme tanpa entri fonts.json → font sistem dari fallback stack (tidak perlu @font-face) */

/* ---------- 5. slides/*.html (skip file berawalan "_") ---------- */
const slidesDir = path.resolve(SRC, deck.slides || "slides");
/* CSS lokal deck: slides/*.css ditempel setelah design+theme (CSS tambahan milik deck) */
const deckCss = fs.existsSync(slidesDir)
  ? fs.readdirSync(slidesDir).filter((f) => f.endsWith(".css") && !f.startsWith("_")).sort()
    .map((f) => "\n/* ==== DECK CSS: " + f + " ==== */\n" + fs.readFileSync(path.join(slidesDir, f), "utf8")).join("")
  : "";
const layoutDirs = [path.join(SRC, "layouts"), path.join(DIR, "layouts")];
const locale = deck.locale || "id-ID";

/* <chart> <diagram> <icon> <shape> <connector> <pre class="mermaid"> → SVG inline. Gagal = peringatan, sumber dibiarkan. */
function renderComponents(s, f, problems) {
  const guard = (kind, fn, orig) => { try { return fn(); } catch (e) { problems.push(f + ": " + kind + " — " + e.message); return orig; } };
  s = s.replace(/<chart\b([^>]*)>([\s\S]*?)<\/chart>/g, (m, at, body) => guard("<chart>", () => renderChart(parseAttrs(at), body, { locale }), m));
  s = s.replace(/<diagram\b([^>]*)>([\s\S]*?)<\/diagram>/g, (m, at, body) => guard("<diagram>", () => renderDiagram(parseAttrs(at), unesc(body)), m));
  s = s.replace(/<icon\b([^>]*?)\/?>(?:\s*<\/icon>)?/g, (m, at) => guard("<icon>", () => renderIcon(parseAttrs(at)), m));
  s = s.replace(/<pre\b([^>]*\bclass\s*=\s*"[^"]*\bmermaid\b[^"]*"[^>]*)>([\s\S]*?)<\/pre>/g, (m, at, body) => guard("mermaid", () => {
    const a = parseAttrs(at);
    return renderFlow(body, { width: a["data-width"], height: a["data-height"], class: (a.class || "").replace(/\bmermaid\b/, "").trim() });
  }, m));
  s = s.replace(/<shape\b([^>]*?)(?:\/>|>([\s\S]*?)<\/shape>)/g, (m, at, body) => guard("<shape>", () => renderShape(parseAttrs(at), body), m));
  s = s.replace(/<connector\b([^>]*?)\/?>(?:\s*<\/connector>)?/g, (m, at) => guard("<connector>", () => renderConnector(parseAttrs(at)), m));
  return s;
}
/* Aset lokal (gambar, video, font di CSS) di-inline sebagai data: URI — hasil build WAJIB satu file mandiri.
   Path dicari relatif ke slides/, lalu ke folder deck. URL jaringan dibiarkan tapi diperingatkan (deck tidak lagi offline). */
const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif",
  svg: "image/svg+xml", bmp: "image/bmp", ico: "image/x-icon", mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf" };
const assetCache = new Map();
const assetDims = new Map();   /* data: URI → {w,h} — ditulis ke <img width height> agar ruang dipesan sebelum gambar dimuat */
let assetBytes = 0;
/* Ukuran asli dari header berkas (PNG, GIF, JPEG, WebP, SVG). null bila tidak terbaca. */
function imgSize(buf, mime) {
  try {
    if (mime === "image/png" && buf.toString("ascii", 12, 16) === "IHDR") return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    if (mime === "image/gif") return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
    if (mime === "image/jpeg") {
      for (let i = 2; i + 9 < buf.length;) {
        if (buf[i] !== 0xff) { i++; continue; }
        const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
        i += 2 + len;
      }
    }
    if (mime === "image/webp" && buf.toString("ascii", 8, 12) === "WEBP") {
      const t = buf.toString("ascii", 12, 16);
      if (t === "VP8X") return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
      if (t === "VP8L") { const b = buf.readUInt32LE(21); return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) }; }
      if (t === "VP8 ") return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    }
    if (mime === "image/svg+xml") {
      const head = buf.toString("utf8", 0, 4000);
      const tag = (head.match(/<svg\b[^>]*>/i) || [""])[0];
      const vb = tag.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
      const wa = tag.match(/\swidth\s*=\s*["']([\d.]+)(px)?["']/i), ha = tag.match(/\sheight\s*=\s*["']([\d.]+)(px)?["']/i);
      if (wa && ha) return { w: Math.round(+wa[1]), h: Math.round(+ha[1]) };
      if (vb) return { w: Math.round(+vb[1]), h: Math.round(+vb[2]) };
    }
  } catch (e) { /* header rusak → tanpa ukuran */ }
  return null;
}
function inlineRef(ref, where, notes, baseDir) {
  const raw = unesc(ref.trim());
  if (!raw || /^(data:|#|about:|javascript:|mailto:|tel:)/i.test(raw)) return null;
  if (/^(https?:)?\/\//i.test(raw)) { notes.push(where + ": aset dari jaringan (" + raw.slice(0, 60) + ") — deck tidak offline; simpan file lokal agar di-inline"); return null; }
  const rel = decodeURIComponent(raw.replace(/[?#].*$/, "").replace(/^file:\/\/\/?/i, ""));
  const p = [baseDir && path.resolve(baseDir, rel), path.resolve(slidesDir, rel), path.resolve(SRC, rel)].filter(Boolean).find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!p) { notes.push(where + ": aset tidak ketemu: " + raw); return null; }
  const mime = MIME[path.extname(p).slice(1).toLowerCase()];
  if (!mime) { notes.push(where + ": tipe aset tidak dikenal, tidak di-inline: " + raw); return null; }
  if (!assetCache.has(p)) {
    const buf = fs.readFileSync(p);
    assetBytes += buf.length;
    if (buf.length > 2 * 1024 * 1024) notes.push(where + ": " + path.basename(p) + " " + Math.round(buf.length / 1048576) + " MB — kecilkan/kompres supaya deck ringan");
    const uri = "data:" + mime + ";base64," + buf.toString("base64");
    assetCache.set(p, uri);
    const dim = imgSize(buf, mime);
    if (dim && dim.w > 0 && dim.h > 0) assetDims.set(uri, dim);
  }
  return assetCache.get(p);
}
const inlineCssUrls = (css, where, notes, baseDir) => css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => { const d = inlineRef(u, where, notes, baseDir); return d ? "url(" + d + ")" : m; });
function inlineAssets(html, where, notes) {
  html = html.replace(/(<(?:img|source|video|audio|image|input|embed)\b[^>]*?\s(?:src|poster|href|xlink:href)\s*=\s*)(["'])(.*?)\2/gi,
    (m, pre, q, u) => { const d = inlineRef(u, where, notes); return d ? pre + q + d + q : m; });
  /* <img> tanpa width/height → isi ukuran asli (rasio aspek dipesan; CSS tetap yang menentukan ukuran tampil) */
  html = html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (/\s(width|height)\s*=/i.test(tag)) return tag;
    const src = (tag.match(/\ssrc\s*=\s*(["'])(.*?)\1/i) || [])[2];
    const d = src && assetDims.get(src);
    return d ? tag.replace(/^<img\b/i, '<img width="' + d.w + '" height="' + d.h + '"') : tag;
  });
  html = html.replace(/(<(?:img|source)\b[^>]*?\ssrcset\s*=\s*)(["'])(.*?)\2/gi, (m, pre, q, set) => pre + q +
    set.split(",").map((part) => { const [u, ...d] = part.trim().split(/\s+/); const x = inlineRef(u, where, notes); return [x || u, ...d].join(" "); }).join(", ") + q);
  html = html.replace(/(\sstyle\s*=\s*)(["'])(.*?)\2/gi, (m, pre, q, css) => pre + q + inlineCssUrls(css.replace(/&quot;/g, '"'), where, notes).replace(/"/g, "&quot;") + q);
  return html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, a, css, b) => a + inlineCssUrls(css, where, notes) + b);
}

if (!fs.existsSync(slidesDir)) fail("folder slide tidak ketemu: " + slidesDir);
const files = fs.readdirSync(slidesDir)
  .filter((f) => f.endsWith(".html") && !f.startsWith("_"))
  .sort();
if (!files.length) fail("slides/ kosong — copy dari templates/ dulu.");

const total = files.length;
const leftovers = [];
const notesList = {};
const rendered = []; /* HTML slide yang sudah dirender, untuk pemeriksaan interaktif */
const slides = files.map((f, i) => {
  let s = fs.readFileSync(path.join(slidesDir, f), "utf8");
  try {
    const ex = expandSlide(s, layoutDirs);
    s = ex.html;
    ex.warnings.forEach((w) => leftovers.push(f + ": " + w));
  } catch (e) { fail(f + ": " + e.message); }
  s = renderComponents(s, f, leftovers);
  s = inlineAssets(s, f, leftovers);
  /* design bersampul terang (design.json "cover": "light"): slide layout title jadi slide terang biasa,
     supaya tombol, .cmd, dan teks memakai warna untuk latar terang (bukan varian .dark) */
  if (lightCover && /\blay-title\b/.test(s)) s = s.replace(/(<section\b[^>]*class=")([^"]*)"([^>]*?)\sstyle="background:var\(--cover\);color:var\(--on-navy\)"/, (m, a, b, c) => a + b.replace(/\s*\bdark\b/, "").trim() + '"' + c);
  if (darkCanvas) s = s.replace(/(<section\b[^>]*class=")([^"]*\bslide\b[^"]*)"/, (m, a, b) => (/\bon-dark\b/.test(b) ? m : a + b + ' on-dark"'));
  if (!/<section\b[^>]*class="[^"]*\bslide\b/.test(s)) leftovers.push(f + ': tidak ada <section class="slide"> atau <slide layout="...">');
  for (const tb of s.match(/<table\b(?![^>]*\bpp-)[\s\S]*?<\/table>/g) || []) {
    const rows = (tb.match(/<tr\b/g) || []).length;
    if (rows > 8) leftovers.push(f + ": tabel " + rows + " baris (maks 7 + header) — pecah ke slide lanjutan; autofit akan mengecilkannya");
  }
  s = s.split("{{N}}").join(String(i + 1)).split("{{TOTAL}}").join(String(total));
  if (deck.footer !== undefined) s = s.split("[Footer kiri]").join(deck.footer);
  if (/\{\{[A-Z_]+\}\}/.test(s)) leftovers.push(f + ": {{...}} tersisa");
  if (s.includes("[Footer kiri]") && deck.footer === undefined) leftovers.push(f + ": [Footer kiri] (deck.footer kosong)");
  /* placeholder template: [teks] di isi slide (juga teks chart/diagram; bukan di kode) yang memuat kata, mis. [Judul slide]. [1], [2–4] (sitasi) lolos. */
  const bare = s.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(pre|code|script|style|textarea)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");
  const phs = (bare.match(/\[[^\]\n]{2,90}\]/g) || []).filter((m) => m !== "[Footer kiri]" && /\p{L}{2}/u.test(m) && !/^\[(sic|dst\.?|et al\.?|n\.d\.)\]$/i.test(m));
  if (phs.length) leftovers.push(f + ": placeholder belum diisi: " + [...new Set(phs)].slice(0, 3).map((m) => (m.length > 44 ? m.slice(0, 42) + "…]" : m)).join(" ") + (new Set(phs).size > 3 ? " …" : ""));
  // === Aksesibilitas: landmark + label slide, dan peringatan <img> tanpa alt ===
  if (/<img\b(?![^>]*\balt=)/i.test(s)) leftovers.push(f + ": <img> tanpa alt (aksesibilitas)");
  s = s.replace(/<section\b(?![^>]*\baria-label=)/, '<section aria-roledescription="slide" aria-label="Slide ' + (i + 1) + ' dari ' + total + '"');
  // === Speaker notes: halaman catatan print-only setelah slide (masuk ke PDF) ===
  const nm = s.match(/data-notes="([^"]*)"/);
  let notesPage = "";
  if (nm) {
    const noteText = unesc(nm[1]);
    notesList[f] = noteText;
    notesPage = '\n<div class="slide-notes" role="note" aria-label="Catatan slide ' + (i + 1) + '">' +
      '<div class="slide-notes-h">Catatan — ' + (i + 1) + ' / ' + total + '</div>' +
      '<div class="slide-notes-b">' + esc(noteText) + '</div></div>';
  }
  rendered.push({ f, html: s });
  return "<!-- " + f + " -->\n" + s + notesPage;
}).join("\n");

/* deck.json "interactive": "live" (dipresentasikan, penonton tidak bisa hover) | "shared" (dibaca sendiri lewat tautan) */
const INTERACTIVE = ["live", "shared"].includes(deck.interactive) ? deck.interactive : "";
if (deck.interactive !== undefined && !INTERACTIVE) warn('deck.interactive harus "live" atau "shared" — diabaikan');
lintInteractive(rendered, INTERACTIVE).forEach((m) => leftovers.push(m));

/* CSS milik deck (slides/*.css) dan design milik deck boleh merujuk gambar lokal → ikut di-inline */
const deckCssInline = inlineCssUrls(deckCss, "slides/*.css", leftovers);
const componentsInline = isOwn(designDir) ? inlineCssUrls(components, "design " + designName, leftovers, designDir) : components;
if (assetBytes) console.log("  aset di-inline: " + assetCache.size + " file, " + Math.round(assetBytes / 1024) + " KB");

if (leftovers.length) {
  console.log("  ! " + leftovers.length + " peringatan slide:");
  leftovers.forEach((m) => console.log("    - " + m));
}

/* ---------- 6. rangkai output ---------- */
/* Slot template diisi sekali jalan: isi slot yang kebetulan memuat "{{SLOT}}" tidak ikut diganti.
   Switcher + catatan disisipkan sebelum </body> TERAKHIR (bukan yang pertama — bisa ada di contoh kode slide). */
/* <head> dari deck.json: description, url (kanonik), image (gambar pratinjau tautan), icon (favicon, di-inline). */
const head = ['<meta name="generator" content="slideck-html ' + VERSION + '">'];
if (deck.description) head.push('<meta name="description" content="' + escAttr(deck.description) + '">');
if (deck.url) head.push('<link rel="canonical" href="' + escAttr(deck.url) + '">', '<meta property="og:url" content="' + escAttr(deck.url) + '">');
if (deck.title) head.push('<meta property="og:title" content="' + escAttr(deck.title) + '">');
if (deck.description) head.push('<meta property="og:description" content="' + escAttr(deck.description) + '">');
if (deck.image) {
  let img = String(deck.image);
  if (!/^https?:/i.test(img) && deck.url) { try { img = new URL(img, deck.url).href; } catch (e) { /* biarkan relatif */ } }
  head.push('<meta property="og:image" content="' + escAttr(img) + '">', '<meta name="twitter:card" content="summary_large_image">');
}
if (deck.icon) { const ic = inlineRef(String(deck.icon), "deck.icon", leftovers, SRC); head.push('<link rel="icon" href="' + escAttr(ic) + '">'); }
const SCROLL = ["auto", "on", "off"].includes(deck.scroll) ? deck.scroll : "auto";
if (deck.scroll !== undefined && deck.scroll !== SCROLL) warn('deck.scroll harus "auto", "on" atau "off" — dipakai "auto"');
const slots = { TITLE: esc(deck.title || "Deck"), LANG: escAttr(LANG), SCROLL, MOTION: escAttr(motionName), INTERACTIVE: INTERACTIVE || "auto", HEAD: head.join("\n"), HINT: esc(UI.hint),
  FONTS: fonts, COMPONENTS: componentsInline + allThemeCss + deckCssInline, SLIDES: slides };
const SLOT_RE = /\{\{(TITLE|LANG|SCROLL|MOTION|INTERACTIVE|HEAD|HINT|FONTS|COMPONENTS|SLIDES)\}\}/g;
const filled = template.replace(SLOT_RE, (m, k) => slots[k]);
const remaining = template.replace(SLOT_RE, "").match(/\{\{[A-Z_]+\}\}/g);
if (remaining) warn("placeholder template tidak dikenal: " + [...new Set(remaining)].join(", "));
const bodyEnd = filled.lastIndexOf("</body>");
/* identitas pembuat: hanya terlihat di source (komentar setelah doctype + <meta name="generator">) */
const stamp = "<!-- Generated by slideck-html " + VERSION + " · https://github.com/mahdyarief/slideck-html -->\n";
const withStamp = (s) => s.replace(/^(<!DOCTYPE html>\s*\n?)/i, (m) => m + stamp);
const out = withStamp(filled.slice(0, bodyEnd)) + themeSwitcherHtml + "\n<script>" + themeSwitcherJs + "</script>\n<script>window.__slideckNotes=" +
  scriptJson(notesList) + ";</script>\n" + filled.slice(bodyEnd);

fs.mkdirSync(path.join(SRC, "dist"), { recursive: true });
const outPath = path.join(SRC, "dist", deck.output);
fs.writeFileSync(outPath, out);

console.log("slideck-html v" + VERSION + " | design=" + designName + " theme=" + themeName + " motion=" + motionName +
  " | " + total + " slides | fonts=" + (fonts ? faces.length + " face inline (" + fontMode + ")" : "sistem") +
  " | " + Math.round(Buffer.byteLength(out) / 1024) + " KB");
console.log("  -> " + path.relative(DIR, outPath).replace(/\\/g, "/"));
