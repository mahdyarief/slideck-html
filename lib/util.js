/* slideck-html lib/util.js — FROZEN. Helper bersama untuk lib/*.js. Zero dependency. */

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");
const unesc = (s) => String(s)
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, "&");

/* 'a="1" b=2 c' → {a:"1", b:"2", c:""}. Nilai di-unescape (&amp; → &) — pemanggil wajib escape ulang saat menulis HTML. */
function parseAttrs(str) {
  const out = {};
  const re = /([A-Za-z_:][-\w:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(str || ""))) {
    out[m[1].toLowerCase()] = unesc(m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : "");
  }
  return out;
}

const num = (v, d) => {
  if (v === undefined || v === null || v === "") return d;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
};

/* Pembulatan koordinat SVG: 2 desimal, tanpa nol di belakang. */
const r2 = (n) => String(Math.round(n * 100) / 100);

/* Perkiraan lebar teks tanpa browser (build berjalan di node). Rata-rata sans-serif. */
function textW(str, size, bold) {
  let w = 0;
  for (const ch of String(str)) {
    if (" .,:;'|!iIljt`".includes(ch)) w += 0.3;
    else if ("fr()[]{}-/\\\"*".includes(ch)) w += 0.38;
    else if ("mwMW@%".includes(ch)) w += 0.9;
    else if (ch >= "0" && ch <= "9") w += 0.6;
    else if (ch >= "A" && ch <= "Z") w += 0.7;
    else if (ch.codePointAt(0) > 0x2e7f) w += 1;
    else w += 0.56;
  }
  return w * size * (bold ? 1.06 : 1);
}

/* Bungkus teks jadi beberapa baris agar tiap baris <= maxW (perkiraan). */
function wrapText(str, size, maxW, bold) {
  const out = [];
  for (const para of String(str).split(/\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (line && textW(t, size, bold) > maxW) { out.push(line); line = w; }
      else line = t;
    }
    out.push(line);
  }
  return out;
}

/* Skala sumbu "angka bagus": → { min, max, step, ticks[] } */
function niceScale(lo, hi, want) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) { lo = 0; hi = 1; }
  if (lo > 0) lo = 0;
  if (hi < 0) hi = 0;
  if (lo === hi) hi = lo + 1;
  const raw = (hi - lo) / Math.max(1, want || 5);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  const min = Math.floor(lo / step + 1e-9) * step;
  const max = Math.ceil(hi / step - 1e-9) * step;
  const ticks = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v / step) * step);
  return { min, max, step, ticks };
}

/* nilai flag CLI: --name <nilai> → nilai | null */
const argOf = (name, argv = process.argv) => { const i = argv.indexOf("--" + name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null; };

/* Folder deck: --root <dir>, lalu folder kerja bila ada deck.json di sana, lalu folder tool (repo).
   Dengan begitu `node <plugin>/build.js` dari folder proyek pengguna langsung memakai deck di folder itu. */
function deckRoot(toolDir, argv = process.argv) {
  const path = require("path");
  const r = argOf("root", argv);
  if (r) return path.resolve(r);
  if (require("fs").existsSync(path.join(process.cwd(), "deck.json"))) return process.cwd();
  return toolDir;
}

/* deck.json di folder src → path HTML hasil build (dist/<output>). Error yang jelas, bukan stack trace.
   Dipakai check.js, pdf.js, pptx.js; build.js memakai default output yang sama ("deck.html"). */
function deckHtml(src, hint) {
  const p = require("path").join(src, "deck.json");
  const fs = require("fs");
  if (!fs.existsSync(p)) throw new Error("deck.json tidak ketemu di " + src + (hint ? " (" + hint + ")" : ""));
  let deck;
  try { deck = JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { throw new Error("deck.json bukan JSON yang valid: " + e.message); }
  return require("path").join(src, "dist", outputName(deck.output));
}

/* Nama file output: default "deck.html"; ".html" ditambahkan bila tidak ada (tanpa itu browser membukanya sebagai teks). */
const outputName = (o) => { const s = String(o || "").trim() || "deck.html"; return /\.html?$/i.test(s) ? s : s + ".html"; };

module.exports = { argOf, deckRoot, deckHtml, outputName, esc, escAttr, unesc, parseAttrs, num, r2, textW, wrapText, niceScale };
