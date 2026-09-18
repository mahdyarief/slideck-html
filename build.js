/* slideck-html build.js — gabung slides/*.html → dist/<deck>.html. Zero dependency (node stdlib only). */
/* Versi: 1.1.0 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const DIR = __dirname;

const VERSION = "1.1.0";
const FROZEN = ["template.html", "components.css", "build.js"];
const LOCK_FILE = "FROZEN.json";
const relock = process.argv.includes("--lock");

const readIf = (p) => { try { return fs.readFileSync(p, "utf8"); } catch (e) { return null; } };
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 16);
const warn = (m) => console.warn("  ! " + m);

/* ---------- 1. deck.json ---------- */
const deck = JSON.parse(fs.readFileSync(path.join(DIR, "deck.json"), "utf8"));
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
const base = fs.readFileSync(path.join(DIR, "components.css"), "utf8");
let extra = "";
const themeCss = readIf(path.join(DIR, "themes", themeName + ".css"));
if (themeCss === null) warn("theme tidak ketemu: " + themeName + " — pakai token default dari components.css");
else extra += "\n" + themeCss;
const motionCss = readIf(path.join(DIR, "motions", motionName + ".css"));
if (motionCss === null) warn("motion tidak ketemu: " + motionName + " — pakai animasi default");
else extra += "\n" + motionCss;
const components = base + extra;

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
const slidesDir = path.join(DIR, "slides");
const files = fs.readdirSync(slidesDir)
  .filter((f) => f.endsWith(".html") && !f.startsWith("_"))
  .sort();
if (!files.length) { console.error("  x slides/ kosong — copy dari templates/ dulu."); process.exit(1); }

const total = files.length;
const leftovers = [];
const slides = files.map((f, i) => {
  let s = fs.readFileSync(path.join(slidesDir, f), "utf8");
  s = s.split("{{N}}").join(String(i + 1)).split("{{TOTAL}}").join(String(total));
  if (deck.footer !== undefined) s = s.split("[Footer kiri]").join(deck.footer);
  if (/\{\{[A-Z_]+\}\}/.test(s)) leftovers.push(f + ": {{...}} tersisa");
  if (s.includes("[Footer kiri]") && deck.footer === undefined) leftovers.push(f + ": [Footer kiri] (deck.footer kosong)");
  if (/\[(KICKER|Judul|Isi|Detail|TAG|LABEL)[^\]]*\]/.test(s)) leftovers.push(f + ": placeholder [...] belum diisi");
  return "<!-- " + f + " -->\n" + s;
}).join("\n");

if (leftovers.length) {
  console.log("  ! " + leftovers.length + " placeholder belum diganti:");
  leftovers.forEach((m) => console.log("    - " + m));
}

/* ---------- 6. rangkai output ---------- */
const out = template
  .split("{{TITLE}}").join(deck.title || "Deck")
  .split("{{FONTS}}").join(fonts)
  .split("{{COMPONENTS}}").join(components)
  .split("{{SLIDES}}").join(slides);

const remaining = out.match(/\{\{[A-Z_]+\}\}/g);
if (remaining) warn("placeholder template tersisa di output: " + [...new Set(remaining)].join(", "));

fs.mkdirSync(path.join(DIR, "dist"), { recursive: true });
const outPath = path.join(DIR, "dist", deck.output);
fs.writeFileSync(outPath, out);

console.log("slideck-html v" + VERSION + " | theme=" + themeName + " motion=" + motionName +
  " | " + total + " slides | fonts=" + (fonts ? "inline" : "sistem") +
  " | " + Math.round(Buffer.byteLength(out) / 1024) + " KB");
console.log("  -> dist/" + deck.output);
