/* slideck-html build.js — gabung slides/*.html → dist/<deck>.html. Zero dependency (node stdlib only). */
/* Versi: 1.4.0 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const DIR = __dirname;

const VERSION = "1.4.0";
const LOCK_FILE = "FROZEN.json";
const relock = process.argv.includes("--lock");

/* --root <dir>: baca deck.json + slides/ dari folder lain (dipakai examples/).
   Template, components, themes, motions, dan assets tetap diambil dari repo root. */
const rootFlag = (() => {
  const i = process.argv.indexOf("--root");
  return i >= 0 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : null;
})();
const SRC = rootFlag || DIR;

const readIf = (p) => { try { return fs.readFileSync(p, "utf8"); } catch (e) { return null; } };
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 16);
const warn = (m) => console.warn("  ! " + m);

/* File beku = shell + build + semua design/theme/motion (infrastruktur bersama). */
const walk = (rel) => {
  const abs = path.join(DIR, rel);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return [rel];
  return fs.readdirSync(abs).flatMap((n) => walk(rel + "/" + n));
};
const FROZEN = ["template.html", "build.js", "pdf.js", ...walk("designs"), ...walk("themes"), ...walk("motions")].sort();

/* ---------- 1. deck.json ---------- */
const deck = JSON.parse(fs.readFileSync(path.join(SRC, "deck.json"), "utf8"));
const themeName = deck.theme || "navy";
const motionName = deck.motion || "corporate";

/* ---------- 2. frozen-file lock ---------- */
const currentLock = {};
for (const f of FROZEN) currentLock[f] = sha(path.join(DIR, f));
const lockPath = path.join(DIR, LOCK_FILE);
const savedLock = readIf(lockPath) ? JSON.parse(readIf(lockPath)) : null;
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
const designName = deck.design || "default";
const base = readIf(path.join(DIR, "designs", designName, "components.css"));
if (base === null) { console.error("  x design tidak ketemu: designs/" + designName + "/components.css"); process.exit(1); }
let extra = "";
const themeCss = readIf(path.join(DIR, "themes", themeName + ".css"));
if (themeCss === null) warn("theme tidak ketemu: " + themeName + " — pakai token default dari components.css");
else extra += "\n" + themeCss;
const motionCss = readIf(path.join(DIR, "motions", motionName + ".css"));
if (motionCss === null) warn("motion tidak ketemu: " + motionName + " — pakai animasi default");
else extra += "\n" + motionCss;
const components = base + extra;

// === Theme switcher: inject semua theme CSS + switcher UI ke output ===
const themeDir = path.join(DIR, "themes");
const allThemes = [];
let allThemeCss = "";
if (fs.existsSync(themeDir)) {
  const themeFiles = fs.readdirSync(themeDir).filter((f) => f.endsWith(".css")).sort();
  for (const tf of themeFiles) {
    const name = tf.replace(/\.css$/, "");
    const css = fs.readFileSync(path.join(themeDir, tf), "utf8");
    allThemes.push(name);
    // scope theme CSS agar bisa di-switch: :root → [data-theme="nama"]
    const scoped = css.replace(/:root\s*\{/, `[data-theme="${name}"] {`);
    allThemeCss += "\n/* ==== THEME: " + name + " ==== */\n" + scoped;
  }
}
const themeOptions = allThemes.map((name) => {
  const active = name === themeName ? " selected" : "";
  return `    <option value="${name}"${active}>${name}</option>`;
}).join("\n");

const themeSwitcherHtml = `
<style>
/* ==== THEME SWITCHER CSS (inject oleh build.js) ==== */
.deck-theme-switcher{position:fixed;top:20px;right:20px;z-index:1002;display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.55);padding:8px 14px;border-radius:10px;color:#fff;font-size:14px;font-family:system-ui,-apple-system,sans-serif;backdrop-filter:blur(8px)}
.deck-theme-label{font-weight:600;white-space:nowrap}
.deck-theme-select{appearance:none;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:7px;padding:6px 32px 6px 10px;font-size:13px;cursor:pointer;outline:none;font-family:inherit}
.deck-theme-select:hover{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.4)}
.deck-theme-select option{background:#1a1a2e;color:#fff}
.deck-theme-select option:hover{background:#2a2a4e}
@media (prefers-reduced-motion:reduce){
  .deck-theme-select{transition:none}
}
/* ==== SPEAKER NOTES (print-only, jadi halaman PDF) ==== */
.slide-notes{display:none}
@media print{
  .deck-theme-switcher{display:none!important}
  .slide-notes{display:block;box-sizing:border-box;width:1920px;height:1080px;page-break-after:always;break-after:page;padding:120px 140px;background:#fff;color:#111;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
  .slide-notes-h{font-size:34px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#888;margin-bottom:36px;border-bottom:3px solid #ddd;padding-bottom:20px}
  .slide-notes-b{font-size:44px;line-height:1.5;white-space:pre-wrap}
}
</style>
<div class="deck-theme-switcher" role="group" aria-label="Pilih tema">
  <label for="theme-select" class="deck-theme-label">Tema:</label>
  <select id="theme-select" class="deck-theme-select" aria-label="Pilih tema">
${themeOptions}
  </select>
</div>`;

const allThemesArr = JSON.stringify(allThemes);
const themeSwitcherJs = `
/* ==== THEME SWITCHER (inject oleh build.js) ==== */
(function(){
  var ts = document.getElementById('theme-select');
  if(!ts) return;
  var st = document.documentElement;
  var validThemes = ${allThemesArr};
  function apply(t){
    st.setAttribute('data-theme', t);
    try{localStorage.setItem('slideck-theme', t)}catch(e){}
  }
  ts.addEventListener('change', function(){ apply(ts.value) });
  var saved = null;
  try{ saved = localStorage.getItem('slideck-theme') }catch(e){}
  if(saved && validThemes.indexOf(saved) >= 0){ ts.value = saved; st.setAttribute('data-theme', saved) }
  else{ ts.value = '${themeName}'; st.setAttribute('data-theme','${themeName}') }
})();`;

/* ---------- 4. font @font-face (base64 inline) ---------- */
let fonts = "";
const fontsJsonPath = path.join(DIR, "assets", "fonts", "fonts.json");
const fontMap = readIf(fontsJsonPath) ? JSON.parse(readIf(fontsJsonPath)) : {};
const themeFonts = fontMap[themeName];
if (Array.isArray(themeFonts) && themeFonts.length) {
  const faces = themeFonts.map((f) => {
    const b64 = fs.readFileSync(path.join(DIR, "assets", "fonts", f.file)).toString("base64");
    return "@font-face{font-family:'" + f.family + "';font-style:normal;font-weight:" + f.weight +
      ";font-display:swap;src:url(data:font/woff2;base64," + b64 + ") format('woff2')}";
  });
  fonts = faces.join("\n");
} else if (themeFonts === undefined) {
  // theme tanpa entri fonts.json → pakai font sistem (tidak perlu @font-face)
}

/* ---------- 5. slides/*.html (skip file berawalan "_") ---------- */
const slidesDir = path.resolve(SRC, deck.slides || "slides");
const files = fs.readdirSync(slidesDir)
  .filter((f) => f.endsWith(".html") && !f.startsWith("_"))
  .sort();
if (!files.length) { console.error("  x slides/ kosong — copy dari templates/ dulu."); process.exit(1); }

const total = files.length;
const leftovers = [];
const notesList = {};
const slides = files.map((f, i) => {
  let s = fs.readFileSync(path.join(slidesDir, f), "utf8");
  s = s.split("{{N}}").join(String(i + 1)).split("{{TOTAL}}").join(String(total));
  if (deck.footer !== undefined) s = s.split("[Footer kiri]").join(deck.footer);
  if (/\{\{[A-Z_]+\}\}/.test(s)) leftovers.push(f + ": {{...}} tersisa");
  if (s.includes("[Footer kiri]") && deck.footer === undefined) leftovers.push(f + ": [Footer kiri] (deck.footer kosong)");
  if (/\[(KICKER|Judul|Isi|Detail|TAG|LABEL)[^\]]*\]/.test(s)) leftovers.push(f + ": placeholder [...] belum diisi");
  // === Aksesibilitas: landmark + label slide, dan peringatan <img> tanpa alt ===
  if (/<img\b(?![^>]*\balt=)/i.test(s)) leftovers.push(f + ": <img> tanpa alt (aksesibilitas)");
  s = s.replace(/<section\b(?![^>]*\baria-label=)/, '<section aria-roledescription="slide" aria-label="Slide ' + (i + 1) + ' dari ' + total + '"');
  // === Speaker notes: halaman catatan print-only setelah slide (masuk ke PDF) ===
  const nm = s.match(/data-notes="([^"]*)"/);
  let notesPage = "";
  if (nm) {
    notesList[f] = nm[1];
    const esc = nm[1].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    notesPage = '\n<div class="slide-notes" role="note" aria-label="Catatan slide ' + (i + 1) + '">' +
      '<div class="slide-notes-h">Catatan — ' + (i + 1) + ' / ' + total + '</div>' +
      '<div class="slide-notes-b">' + esc + '</div></div>';
  }
  return "<!-- " + f + " -->\n" + s + notesPage;
}).join("\n");

if (leftovers.length) {
  console.log("  ! " + leftovers.length + " placeholder belum diganti:");
  leftovers.forEach((m) => console.log("    - " + m));
}

/* ---------- 6. rangkai output ---------- */
const out = template
  .split("{{TITLE}}").join(deck.title || "Deck")
  .split("{{FONTS}}").join(fonts)
  .split("{{COMPONENTS}}").join(components + allThemeCss)
  .split("{{SLIDES}}").join(slides)
  .replace("</body>", themeSwitcherHtml + "\n<script>" + themeSwitcherJs + "</script>\n<script>window.__slideckNotes=" + JSON.stringify(notesList) + ";</script>\n</body>");

const remaining = out.match(/\{\{[A-Z_]+\}\}/g);
if (remaining) warn("placeholder template tersisa di output: " + [...new Set(remaining)].join(", "));

fs.mkdirSync(path.join(SRC, "dist"), { recursive: true });
const outPath = path.join(SRC, "dist", deck.output);
fs.writeFileSync(outPath, out);

console.log("slideck-html v" + VERSION + " | design=" + designName + " theme=" + themeName + " motion=" + motionName +
  " | " + total + " slides | fonts=" + (fonts ? "inline" : "sistem") +
  " | " + Math.round(Buffer.byteLength(out) / 1024) + " KB");
console.log("  -> " + path.relative(DIR, outPath).replace(/\\/g, "/"));
