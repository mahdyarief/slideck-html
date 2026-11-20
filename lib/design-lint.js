/* slideck-html lib/design-lint.js — FROZEN. Cek aturan design (bawaan maupun buatan pengguna). Zero dependency.
   Aturan lengkap + alasannya: docs/custom-design.md. Kode aturan (D1..D9) dipakai di pesan dan di dokumen itu.

   lintDesign(dir, { themes, motions }) → { name, errors: [{rule, msg}], warnings: [{rule, msg}] }
     dir      folder design: berisi components.css + design.json
     themes   nama theme yang tersedia (untuk cek recommended.theme)
     motions  nama motion yang tersedia */
const fs = require("fs");
const path = require("path");

/* Token yang disediakan theme (kontrak) + core.css. Design boleh memakai ini, ditambah custom property buatannya sendiri. */
const THEME_TOKENS = ["surface", "navy", "on-navy", "on-navy-mut", "grey", "ink", "mut", "teal", "teal-d", "mint",
  "accent-line", "tag-bg", "line", "accent2", "on-accent2", "cover", "font-d", "font-s", "ease"];
const CORE_TOKENS = ["c1", "c2", "c3", "c4", "c5", "c6", "on-teal"];
const KNOWN = new Set([...THEME_TOKENS, ...CORE_TOKENS]);

/* Kelas yang dipakai layouts/ + templates/ — design harus memberi gaya pada inti ini, sisanya boleh diwarisi core.css. */
const REQUIRED = ["pad", "kicker", "title", "card", "bul", "small", "foot", "tag", "kpi-num", "kpi-lab", "t"];
const RECOMMENDED = ["rule", "quote", "timeline", "checklist", "map", "mapcol", "arrow", "grid2", "grid3"];

/* Milik shell (template.html) — design tidak boleh menyentuhnya. */
const SHELL = /(\.deck-(controls|stage|viewport|theme-switcher|theme-select|theme-label)|\.progress\b|\.slide-notes|\.dts-[\w-]+|#(bar|pg|stage|editflag|theme-select|theme-btn|theme-list|theme-sw|theme-name)\b|\.cn-[hl]\b|body\.editing)/;
/* Properti .slide yang dikunci shell: ukuran dan tumpukan stage. */
const SLIDE_LOCKED = /^(width|height|min-width|min-height|max-width|max-height|position|inset|top|left|right|bottom|display|visibility|opacity|transform|z-index|pointer-events|transition)$/;

const NAMED = "white|black|red|green|blue|yellow|orange|purple|gray|grey|pink|brown|navy|teal|silver|gold|maroon|olive|lime|aqua|fuchsia|cyan|magenta|beige|ivory|tan|coral|salmon|crimson|indigo|violet";
const COLOR_LITERAL = new RegExp("#[0-9a-fA-F]{3,8}\\b|\\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\\(|(^|[\\s:,(])(" + NAMED + ")(?=[\\s;,)!]|$)", "i");
const COLOR_PROPS = /^(color|background|background-color|background-image|border|border-(top|right|bottom|left)|border-(top-|right-|bottom-|left-)?color|outline|outline-color|box-shadow|text-shadow|fill|stroke|caret-color|text-decoration|text-decoration-color|column-rule|accent-color|filter)$/;

/* Pecah CSS jadi aturan datar {sel, body, at}. Cukup untuk CSS design (tanpa string berisi kurung kurawal). */
function rules(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@(import|charset|namespace)\b[^;{]*;/g, "");
  const out = [];
  const walk = (src, at) => {
    let i = 0;
    while (i < src.length) {
      const open = src.indexOf("{", i);
      if (open < 0) break;
      const head = src.slice(i, open).trim();
      let depth = 1, j = open + 1;
      while (j < src.length && depth) { if (src[j] === "{") depth++; else if (src[j] === "}") depth--; j++; }
      const body = src.slice(open + 1, j - 1);
      if (head.startsWith("@media") || head.startsWith("@supports") || head.startsWith("@layer")) walk(body, head);
      else out.push({ sel: head.replace(/^[;\s]+/, ""), body, at });
      i = j;
    }
  };
  walk(css, "");
  return out;
}

const decls = (body) => body.split(";").map((d) => {
  const k = d.indexOf(":");
  return k < 0 ? null : { prop: d.slice(0, k).trim().toLowerCase(), value: d.slice(k + 1).trim() };
}).filter((d) => d && d.prop);

function lintDesign(dir, opts = {}) {
  const name = path.basename(dir);
  const errors = [], warnings = [];
  const err = (rule, msg) => errors.push({ rule, msg });
  const wrn = (rule, msg) => warnings.push({ rule, msg });

  /* D1 — berkas wajib */
  const cssPath = path.join(dir, "components.css");
  const metaPath = path.join(dir, "design.json");
  if (!fs.existsSync(cssPath)) { err("D1", "components.css tidak ada"); return { name, errors, warnings }; }
  const css = fs.readFileSync(cssPath, "utf8");

  /* D2 — design.json */
  let meta = null;
  if (!fs.existsSync(metaPath)) err("D2", "design.json tidak ada");
  else {
    try { meta = JSON.parse(fs.readFileSync(metaPath, "utf8")); } catch (e) { err("D2", "design.json bukan JSON valid: " + e.message); }
  }
  if (meta) {
    if (meta.name !== name) err("D2", 'design.json "name" (' + meta.name + ") harus sama dengan nama folder (" + name + ")");
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) err("D2", "nama design hanya huruf kecil, angka, dan '-'");
    for (const k of ["label", "description"]) if (!meta[k] || typeof meta[k] !== "string") err("D2", 'design.json butuh "' + k + '" (teks)');
    if (meta.canvas && !["dark", "light"].includes(meta.canvas)) err("D2", '"canvas" hanya "dark" atau "light"');
    const rec = meta.recommended || {};
    if (!meta.recommended) wrn("D2", 'design.json sebaiknya punya "recommended": {"theme", "motion"}');
    if (rec.theme && opts.themes && !opts.themes.includes(rec.theme)) err("D2", "recommended.theme tidak ada: " + rec.theme);
    if (rec.motion && opts.motions && !opts.motions.includes(rec.motion)) err("D2", "recommended.motion tidak ada: " + rec.motion);
  }

  const list = rules(css);
  const own = new Set();
  for (const r of list) for (const d of decls(r.body)) if (d.prop.startsWith("--")) own.add(d.prop.slice(2));

  for (const r of list) {
    const isRoot = /^:root$/.test(r.sel);
    /* D3 — tidak menyentuh shell */
    if (SHELL.test(r.sel)) err("D3", "selektor milik shell: " + r.sel);
    if (/^@(page|font-face)/.test(r.sel)) err("D3", r.sel.split(/\s/)[0] + " tidak boleh di design (milik shell / build)");
    if (/^(html|body)$/.test(r.sel)) for (const d of decls(r.body)) if (d.prop !== "font-family" && d.prop !== "-webkit-font-smoothing") err("D3", r.sel + "{" + d.prop + "} — design hanya boleh men-set font di " + r.sel);

    for (const d of decls(r.body)) {
      /* D4 — .slide: ukuran/tumpukan dikunci shell */
      if (/^(\.deck-stage\s*>\s*)?\.slide$/.test(r.sel) && SLIDE_LOCKED.test(d.prop) && !(d.prop === "position" && d.value === "relative"))
        err("D4", ".slide{" + d.prop + "} dikunci shell (stage 1920×1080)");

      /* D5 — warna hanya lewat token */
      /* :root boleh berisi nilai cadangan token kontrak (theme selalu menimpanya).
         Token buatan design sendiri harus diturunkan dari token, karena theme tidak pernah menimpanya. */
      if (isRoot && d.prop.startsWith("--")) {
        if (!KNOWN.has(d.prop.slice(2)) && COLOR_LITERAL.test(d.value))
          err("D5", ":root " + d.prop + ": " + d.value.slice(0, 40) + " — token buatan design harus dari token theme, mis. color-mix(in srgb, var(--teal) 30%, var(--surface))");
        continue;
      }
      if (d.prop.startsWith("--") ? COLOR_LITERAL.test(d.value) : (COLOR_PROPS.test(d.prop) || d.prop.startsWith("--")) && COLOR_LITERAL.test(d.value)) {
        const shadowOnly = /shadow$/.test(d.prop) && /rgba?\(\s*(0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255)\s*,/.test(d.value) && !/#|hsl/.test(d.value);
        if (shadowOnly) wrn("D5", r.sel + "{" + d.prop + "} pakai rgba hitam/putih — lebih baik color-mix(in srgb, var(--ink) N%, transparent)");
        else err("D5", r.sel + "{" + d.prop + ": " + d.value.slice(0, 60) + "} — warna tetap; pakai var(--token) atau color-mix() dari token");
      }

      /* D6 — token tidak dikenal */
      for (const m of d.value.matchAll(/var\(\s*--([\w-]+)/g)) {
        if (!KNOWN.has(m[1]) && !own.has(m[1])) err("D6", "var(--" + m[1] + ") bukan token theme/core dan tidak didefinisikan di design");
      }

      /* D7 — tanpa jaringan: build harus tetap offline */
      if (/url\(\s*['"]?(https?:)?\/\//i.test(d.value)) err("D7", r.sel + " memuat url() dari jaringan — inline sebagai data: atau hapus");

      /* D8 — keterbacaan di stage 1920×1080 */
      const fs_ = d.prop === "font-size" && /^([\d.]+)px$/.exec(d.value);
      if (fs_ && Number(fs_[1]) < 18) wrn("D8", r.sel + "{font-size:" + d.value + "} < 18px — sulit terbaca saat diproyeksikan");
    }
  }
  if (/@import\b/.test(css)) err("D7", "@import tidak boleh — build harus mandiri tanpa jaringan");

  /* D9 — cakupan kelas: inti wajib, sisanya disarankan */
  const sels = list.map((r) => r.sel).join(" ");
  const has = (c) => new RegExp("\\." + c.replace(/-/g, "\\-") + "(?![\\w-])").test(sels);
  const missing = REQUIRED.filter((c) => !has(c));
  if (missing.length) err("D9", "kelas inti belum diberi gaya: " + missing.map((c) => "." + c).join(" ") + " (lihat designs/default/components.css)");
  const missRec = RECOMMENDED.filter((c) => !has(c));
  if (missRec.length) wrn("D9", "kelas template tanpa gaya design (pakai bawaan core/browser): " + missRec.map((c) => "." + c).join(" "));

  return { name, errors, warnings };
}

/* ---------- theme ---------- */
const hex2rgb = (v) => {
  let h = (/#([0-9a-f]{3,8})\b/i.exec(v) || [])[1];
  if (!h) { const m = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(v); return m ? [+m[1], +m[2], +m[3]] : null; }
  if (h.length <= 4) h = h.slice(0, 3).split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/* [teks, latar, minimum] menurut WCAG 2.x AA dan cara token dipakai:
   4.5 = teks biasa (isi, teks redup, footer, caption, tag 18px);
   3   = teks besar (kicker 19px tebal, angka besar, judul diagram) dan isian aksen di balik teks --on-teal. */
const PAIRS = [["ink", "surface", 4.5], ["ink", "grey", 4.5], ["ink", "mint", 4.5], ["mut", "surface", 4.5], ["mut", "grey", 4.5],
  ["on-navy", "navy", 4.5], ["on-navy", "cover", 4.5], ["on-navy-mut", "navy", 4.5], ["on-navy-mut", "cover", 4.5],
  ["teal-d", "surface", 4.5], ["teal-d", "mint", 4.5], ["teal-d", "tag-bg", 4.5], ["on-accent2", "accent2", 4.5],
  ["teal", "surface", 3], ["teal", "grey", 3], ["teal-d", "grey", 4.5], ["teal", "navy", 3], ["teal", "cover", 3], ["on-teal", "teal", 3]];

function lintTheme(file) {
  const name = path.basename(file, ".css");
  const errors = [], warnings = [];
  const css = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const list = rules(css);
  for (const r of list) if (r.sel !== ":root") errors.push({ rule: "T1", msg: "theme hanya boleh berisi :root{…} token — ketemu " + r.sel });
  const tok = {};
  for (const r of list.filter((x) => x.sel === ":root")) for (const d of decls(r.body)) if (d.prop.startsWith("--")) tok[d.prop.slice(2)] = d.value;
  const need = THEME_TOKENS.filter((t) => !["accent2", "on-accent2", "cover"].includes(t));
  const miss = need.filter((t) => !(t in tok));
  if (miss.length) errors.push({ rule: "T2", msg: "token kontrak belum ada: " + miss.map((t) => "--" + t).join(" ") });
  const optMiss = ["accent2", "on-accent2", "cover"].filter((t) => !(t in tok));
  if (optMiss.length) warnings.push({ rule: "T2", msg: "token 2.1 belum ada (pakai default core.css): " + optMiss.map((t) => "--" + t).join(" ") });
  if (tok["font-d"] && !/,\s*(sans-serif|serif|system-ui|ui-sans-serif|monospace)/.test(tok["font-d"])) warnings.push({ rule: "T4", msg: "--font-d tanpa fallback generik (mis. …, sans-serif)" });
  /* nilai token bisa var(--lain); --on-teal default core.css = var(--surface) */
  const col = (t) => {
    let v = tok[t] || (t === "on-teal" ? "var(--surface)" : null);
    for (let i = 0; i < 3 && v; i++) { const m = String(v).trim().match(/^var\(--([\w-]+)\)$/); if (!m) break; v = tok[m[1]]; }
    return v ? hex2rgb(v) : null;
  };
  const cover = col("cover") || col("navy");
  for (const [fg, bg, min] of PAIRS) {
    /* kicker di latar gelap memakai --accent-on-dark bila theme menulisnya */
    const fgTok = fg === "teal" && (bg === "navy" || bg === "cover") && tok["accent-on-dark"] ? "accent-on-dark" : fg;
    const a = col(fgTok), b = bg === "cover" ? cover : col(bg);
    if (!a || !b) continue;
    const c = contrast(a, b);
    if (c < min) (min >= 4.5 && c < 3 ? errors : warnings).push({ rule: "T3", msg: "kontras --" + fgTok + " di --" + bg + " = " + c.toFixed(2) + " (min " + min + ")" });
  }
  const navy = col("navy");
  if (navy && lum(navy) > 0.18) errors.push({ rule: "T3", msg: "--navy harus permukaan GELAP (luminans " + lum(navy).toFixed(2) + ")" });
  return { name, errors, warnings };
}

/* Folder design yang tersedia: milik deck (src/designs) menimpa bawaan (tool/designs) dengan nama sama. */
function designDirs(toolDir, srcDir) {
  const out = new Map();
  for (const base of [path.join(toolDir, "designs"), srcDir && path.join(srcDir, "designs")]) {
    if (!base || !fs.existsSync(base)) continue;
    for (const n of fs.readdirSync(base)) if (fs.statSync(path.join(base, n)).isDirectory()) out.set(n, path.join(base, n));
  }
  return out;
}

module.exports = { lintDesign, lintTheme, designDirs, THEME_TOKENS, CORE_TOKENS, REQUIRED, RECOMMENDED };
