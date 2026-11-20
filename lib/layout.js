/* slideck-html lib/layout.js — FROZEN. Layout ber-placeholder ala PowerPoint. Zero dependency.

   File slide boleh memakai sintaks ringkas ini sebagai ganti <section class="slide">:

   <slide layout="two-content" [dark] [notes="..."] [class="..."] [fit="off"]>
     <ph name="kicker">LAPORAN</ph>
     <ph name="title">Judul slide</ph>
     <ph name="left"><ul><li>Poin<ul><li>Sub-poin</li></ul></li></ul></ph>
     <ph name="right"><chart type="bar">...</chart></ph>
     <shape type="arrow" x="900" y="520" w="120" h="80"></shape>   ← di luar <ph>: ditempel apa adanya
   </slide>

   Layout = layouts/<nama>.html. Tiap placeholder satu baris berisi data-ph="nama" dan {{PH}}.
   Placeholder yang tidak diisi dibuang (seperti PowerPoint). {{FREE}} = tempat konten di luar <ph>.
   <ph name="body" x="100" y="300" w="800" h="500"> memindah kotak ke posisi absolut (px stage). */
const fs = require("fs");
const path = require("path");
const { escAttr, parseAttrs, num } = require("./util");

function loadLayout(name, dirs) {
  if (!/^[\w-]+$/.test(name)) throw new Error('nama layout tidak valid: "' + name + '"');
  for (const d of dirs) {
    const p = path.join(d, name + ".html");
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  const avail = listLayouts(dirs);
  throw new Error('layout tidak ketemu: "' + name + '" (tersedia: ' + avail.join(", ") + ")");
}

function listLayouts(dirs) {
  const set = new Set();
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    fs.readdirSync(d).filter((f) => f.endsWith(".html")).forEach((f) => set.add(f.replace(/\.html$/, "")));
  }
  return [...set].sort();
}

/* → { html, warnings[] }. Kalau sumber tidak memakai <slide>, dikembalikan apa adanya. */
function expandSlide(src, dirs) {
  const warnings = [];
  const m = /<slide\b([^>]*)>([\s\S]*?)<\/slide>/.exec(src);
  if (!m) return { html: src, warnings };
  if (/<slide\b/.test(src.slice(m.index + m[0].length))) warnings.push("lebih dari satu <slide> dalam satu file — hanya yang pertama dipakai");
  const a = parseAttrs(m[1]);
  let inner = m[2];
  const layout = loadLayout(a.layout || "title-content", dirs);

  let notes = a.notes;
  inner = inner.replace(/<notes>([\s\S]*?)<\/notes>/, (_, t) => { notes = t.trim(); return ""; });

  const filled = new Map();
  inner = inner.replace(/<ph\b([^>]*)>([\s\S]*?)<\/ph>/g, (_, at, body) => {
    const pa = parseAttrs(at);
    if (!pa.name) { warnings.push("<ph> tanpa name diabaikan"); return ""; }
    if (filled.has(pa.name)) warnings.push('<ph name="' + pa.name + '"> ganda — yang terakhir dipakai');
    filled.set(pa.name, { attrs: pa, body: body.trim() });
    return "";
  });
  const free = inner.trim();

  const used = new Set();
  const lines = layout.split(/\r?\n/).filter((l) => !/^\s*<!--.*-->\s*$/.test(l));
  let out = lines.map((line) => {
    const pm = /data-ph="([\w-]+)"/.exec(line);
    if (!pm) return line;
    const f = filled.get(pm[1]);
    if (!f || !f.body) return null;
    used.add(pm[1]);
    let l = line.split("{{PH}}").join(f.body);
    const p = f.attrs;
    if (p.x !== undefined || p.y !== undefined || p.w !== undefined || p.h !== undefined) {
      const st = "position:absolute;left:" + num(p.x, 0) + "px;top:" + num(p.y, 0) + "px;" +
        (p.w !== undefined ? "width:" + num(p.w, 0) + "px;" : "") + (p.h !== undefined ? "height:" + num(p.h, 0) + "px;" : "");
      l = l.replace(/<(\w+)\b/, '<$1 style="' + st + '"');
    }
    if (p.anchor) l = l.replace(/data-ph="/, 'data-anchor="' + escAttr(p.anchor) + '" data-ph="');
    /* atribut data-* pada <ph> (mis. data-step, data-morph) ikut ke kotak placeholder */
    const extra = Object.keys(p).filter((k) => /^data-/.test(k) && k !== "data-ph").map((k) => k + '="' + escAttr(p[k] === true ? "" : String(p[k] == null ? "" : p[k])) + '" ').join("");
    if (extra) l = l.replace(/data-ph="/, extra + 'data-ph="');
    return l;
  }).filter((l) => l !== null).join("\n");

  for (const name of filled.keys()) {
    if (!used.has(name) && filled.get(name).body) warnings.push('layout "' + (a.layout || "title-content") + '" tidak punya placeholder "' + name + '" — isinya ditaruh sebagai konten bebas');
  }
  const orphan = [...filled.entries()].filter(([n, f]) => !used.has(n) && f.body).map(([, f]) => f.body).join("\n");
  const freeAll = [orphan, free].filter(Boolean).join("\n");
  out = out.includes("{{FREE}}") ? out.split("{{FREE}}").join(freeAll) : out.replace(/<\/section>\s*$/, freeAll + "\n</section>");

  /* atribut pada <section> */
  out = out.replace(/<section\b([^>]*)>/, (_, sat) => {
    const sa = parseAttrs(sat);
    let cls = sa.class || "slide";
    let style = sa.style || "";
    if ("dark" in a && !/\bdark\b/.test(cls)) { cls += " dark"; if (!/var\(--navy\)/.test(style)) style = "background:var(--navy);color:var(--on-navy);" + style; }
    if ("light" in a) { cls = cls.replace(/\s*\bdark\b/, ""); style = style.replace(/background:var\(--navy\);?/, "").replace(/color:var\(--on-navy\);?/, ""); }
    if (a.class) cls += " " + a.class;
    if (a.style) style += (style && !style.endsWith(";") ? ";" : "") + a.style;
    let s = '<section class="' + escAttr(cls) + '"';
    if (a.id) s += ' id="' + escAttr(a.id) + '"';
    s += ' data-layout="' + escAttr(a.layout || "title-content") + '"';
    if (style) s += ' style="' + escAttr(style) + '"';
    if (a.fit) s += ' data-fit="' + escAttr(a.fit) + '"';
    if (notes) s += ' data-notes="' + escAttr(notes) + '"';
    return s + ">";
  });

  return { html: src.slice(0, m.index) + out + src.slice(m.index + m[0].length), warnings };
}

module.exports = { expandSlide, listLayouts };
