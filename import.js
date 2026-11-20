/* slideck-html import.js — .pptx → slides/NN-*.html (+ deck.json). Zero dependency (node stdlib only). */
/* Parser PPTX: lib/pptx-read.js (+ lib/xml.js, lib/zip.js).
   Pakai:  node import.js <file.pptx> [--root <deckdir>] [--force]
   Isi pptx dialirkan ulang ke sintaks <slide layout="..."><ph name="...">, jadi deck ikut
   design/theme slideck. Font, ukuran dan warna pptx dibuang. */
const fs = require("fs");
const path = require("path");
const { readPptx } = require("./lib/pptx-read");

const STAGE_W = 1920;
const STAGE_H = 1080;
const TABLE_MAX_ROWS = 7; // aturan slideck: tabel max 7 baris isi (+ 1 header) per slide

const warn = (m) => console.warn("  ! " + m);
const fail = (m) => { console.error("  x " + m); process.exit(1); };

/* ---------- 1. argumen ---------- */
const argv = process.argv.slice(2);
const flagVal = (name) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : null; };
const VALUE_FLAGS = new Set(["--root", "--mode"]);
const positional = argv.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
const force = argv.includes("--force");
const ROOT = path.resolve(flagVal("--root") || process.cwd());

if (argv.includes("--help") || argv.includes("-h") || !positional.length) {
  console.log("Pakai: node import.js <file.pptx> [--root <deckdir>] [--force]");
  console.log("  --root   folder deck tujuan (default: folder kerja). Menulis <deckdir>/slides/ dan deck.json bila belum ada.");
  console.log("  --force  timpa slides/ yang sudah berisi (menghapus *.html dan import.css lama di dalamnya)");
  process.exit(positional.length ? 0 : 1);
}
const modeArg = flagVal("--mode");
if (modeArg && modeArg !== "semantic") fail("--mode " + modeArg + " sudah dihapus — import selalu semantic (isi ikut layout slideck).");
const pptxPath = path.resolve(positional[0]);
if (!fs.existsSync(pptxPath)) fail("file tidak ketemu: " + pptxPath);

/* ---------- 2. util teks ---------- */
/* "{{" dan "[Judul..." dalam isi pptx jangan sampai dianggap placeholder oleh build.js. */
const guard = (s) => s.split("{{").join("&#123;&#123;")
  .replace(/\[(?=(KICKER|Judul|Isi|Detail|TAG|LABEL|Footer kiri))/g, "&#91;");
const esc = (s) => guard(String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");
const px = (n) => Math.round(n) + "px";
const slugify = (s) => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");

const isTextRun = (r) => r.kind !== "br" && r.text;
const hasText = (tb) => !!tb && tb.paragraphs.some((p) => p.runs.some((r) => r.kind !== "br" && r.text.trim().length));
const plainText = (tb) => !tb ? "" : tb.paragraphs
  .map((p) => p.runs.map((r) => (r.kind === "br" ? " " : r.text)).join("")).join(" ").replace(/\s+/g, " ").trim();
/* Kotak teks yang isinya cuma field (nomor slide / tanggal) = dekorasi footer. */
const onlyFields = (tb) => tb.paragraphs.every((p) => p.runs.every((r) => r.kind === "field" || r.kind === "br" || !r.text.trim()));

/* Bold/italic yang dipakai di SEMUA run satu kotak = gaya kotak (milik design), bukan penekanan. */
function uniformStyle(tb) {
  const runs = tb.paragraphs.flatMap((p) => p.runs.filter(isTextRun).filter((r) => r.text.trim()));
  return {
    bold: runs.length > 0 && runs.every((r) => r.style.bold),
    italic: runs.length > 0 && runs.every((r) => r.style.italic),
  };
}

function safeHref(link) {
  if (!link || !link.url) return null;
  return /^(https?:|mailto:|tel:)/i.test(link.url) ? link.url : null;
}

/* Satu paragraf → HTML inline: <b>/<i>/<u>/<s>/<sup>/<sub>/<a>. Font, ukuran, warna dibuang. */
function paraInline(p, drop) {
  const segs = [];
  for (const r of p.runs) {
    if (r.kind === "br") { segs.push({ br: true }); continue; }
    if (!r.text) continue;
    const st = r.style || {};
    const href = safeHref(r.link);
    const f = {
      href,
      b: !!st.bold && !drop.bold,
      i: !!st.italic && !drop.italic,
      u: !!st.underline && !href, // garis bawah link sudah bawaan <a>
      s: !!st.strike,
      sup: st.baseline > 0,
      sub: st.baseline < 0,
    };
    const key = JSON.stringify(f);
    const last = segs[segs.length - 1];
    if (last && !last.br && last.key === key) last.text += r.text;
    else segs.push({ key, f, text: r.text });
  }
  while (segs.length && segs[segs.length - 1].br) segs.pop();
  while (segs.length && segs[0].br) segs.shift();
  let out = "";
  for (const s of segs) {
    if (s.br) { out += "<br>"; continue; }
    let t = esc(s.text.replace(/\t/g, " ")).replace(/\v/g, "<br>");
    if (!t.trim()) { out += t; continue; }
    const f = s.f;
    if (f.sup) t = "<sup>" + t + "</sup>";
    if (f.sub) t = "<sub>" + t + "</sub>";
    if (f.s) t = "<s>" + t + "</s>";
    if (f.u) t = "<u>" + t + "</u>";
    if (f.i) t = "<i>" + t + "</i>";
    if (f.b) t = "<b>" + t + "</b>";
    if (f.href) t = '<a href="' + escAttr(f.href) + '" target="_blank" rel="noopener noreferrer">' + t + "</a>";
    out += t;
  }
  return out.trim();
}

/* Kotak teks → satu baris inline (judul, subjudul, kepala kolom, sel tabel). */
function inlineHtml(tb) {
  if (!tb) return "";
  const drop = uniformStyle(tb);
  return tb.paragraphs.map((p) => paraInline(p, drop)).filter(Boolean).join("<br>");
}

/* Kotak teks → blok: level paragraf jadi <ul>/<ol> bersarang, paragraf tanpa bullet jadi <p>. */
function blocksHtml(tb) {
  if (!tb) return "";
  const drop = uniformStyle(tb);
  const out = [];
  let stack = [];
  const renderList = (l) => "<" + l.tag + ">" + l.items.map((it) => "<li>" + it.html + it.kids.map(renderList).join("") + "</li>").join("") + "</" + l.tag + ">";
  const flush = () => { if (stack.length) { out.push(renderList(stack[0])); stack = []; } };
  const child = (parent, tag, lvl) => {
    const n = { tag, lvl, items: [] };
    parent.items[parent.items.length - 1].kids.push(n);
    stack.push(n);
    return n;
  };
  for (const p of tb.paragraphs) {
    const html = paraInline(p, drop);
    if (!html) continue;
    if (!p.bullet) { flush(); out.push("<p>" + html + "</p>"); continue; }
    const tag = p.bullet.kind === "num" ? "ol" : "ul";
    while (stack.length > 1 && stack[stack.length - 1].lvl > p.lvl) stack.pop();
    let top = stack[stack.length - 1];
    if (!top) { top = { tag, lvl: p.lvl, items: [] }; stack.push(top); }
    else if (p.lvl > top.lvl && top.items.length) top = child(top, tag, p.lvl);
    else if (top.tag !== tag) {
      if (stack.length === 1) { flush(); top = { tag, lvl: p.lvl, items: [] }; stack.push(top); }
      else { stack.pop(); top = child(stack[stack.length - 1], tag, p.lvl); }
    }
    top.items.push({ html, kids: [] });
  }
  flush();
  return out.join("\n");
}

/* Catatan pembicara: teks polos, di-escape sebagai nilai atribut HTML (newline dipertahankan). */
const notesAttr = (name, notes) => (notes ? " " + name + '="' + escAttr(notes) + '"' : "");

/* ---------- 3. util gambar / tabel / chart ---------- */
/* Petakan kotak pptx ke stage 1920x1080: titik tengah proporsional, ukuran di-scale seragam
   (rasio gambar tetap utuh walau slide sumbernya 4:3). */
function stageBox(box, env) {
  const w = box.w * env.k, h = box.h * env.k;
  const cx = ((box.x + box.w / 2) / env.W) * STAGE_W, cy = ((box.y + box.h / 2) / env.H) * STAGE_H;
  return { left: cx - w / 2, top: cy - h / 2, width: w, height: h };
}
function absStyle(box, env) {
  const b = stageBox(box, env);
  return "position:absolute;left:" + px(b.left) + ";top:" + px(b.top) + ";width:" + px(b.width) + ";height:" + px(b.height);
}

function mediaUrl(media) {
  if (!media || media.external || !media.data) return ""; // tidak boleh ada request keluar
  return "data:" + media.mime + ";base64," + media.data.toString("base64");
}

function imgTag(el, env, style) {
  const url = mediaUrl(el.blip && el.blip.image);
  if (!url) return "";
  env.stats.gambar++;
  const alt = el.descr || el.name || "Gambar";
  return '<img src="' + url + '" alt="' + escAttr(alt) + '"' + (style ? ' style="' + style + '"' : "") + ">";
}

function mediaTag(el, env, style) {
  const url = mediaUrl(el.media && el.media.src);
  if (!url) return "";
  const tag = el.media.kind === "video" ? "video" : "audio";
  const poster = tag === "video" ? mediaUrl(el.blip && el.blip.image) : "";
  env.stats.media++;
  return "<" + tag + ' controls preload="metadata" src="' + url + '"' + (poster ? ' poster="' + poster + '"' : "") +
    ' aria-label="' + escAttr(el.descr || el.name || "Media") + '"' + (style ? ' style="' + style + '"' : "") + "></" + tag + ">";
}

/* Tabel → <table class="t">, baris pertama jadi <th>. Lebih dari 7 baris isi → dipecah
   (header diulang); potongan ke-2 dst. jadi slide lanjutan. Mengembalikan array potongan. */
function tableChunks(el, env) {
  const rows = [];
  for (const [ri, row] of el.table.rows.entries()) {
    let tr = "";
    for (const c of row.cells) {
      if (c.hMerge || c.vMerge) continue;
      const tag = ri === 0 ? "th" : "td";
      const span = (c.gridSpan > 1 ? ' colspan="' + c.gridSpan + '"' : "") + (c.rowSpan > 1 ? ' rowspan="' + c.rowSpan + '"' : "");
      tr += "<" + tag + span + ">" + inlineHtml(c.text) + "</" + tag + ">";
    }
    rows.push("<tr>" + tr + "</tr>");
  }
  env.stats.tabel++;
  const wrap = (list) => '<table class="t">\n' + list.join("\n") + "\n</table>";
  if (rows.length <= TABLE_MAX_ROWS + 1) return [wrap(rows)];
  const head = rows[0], body = rows.slice(1), per = TABLE_MAX_ROWS, out = [];
  for (let i = 0; i < body.length; i += per) out.push(wrap([head, ...body.slice(i, i + per)]));
  return out;
}

const CHART_TYPES = {
  barChart: "bar", bar3DChart: "bar", lineChart: "line", line3DChart: "line", areaChart: "area", area3DChart: "area",
  pieChart: "pie", pie3DChart: "pie", doughnutChart: "doughnut",
};

function chartTitle(chart) {
  const t = chart.title;
  if (!t) return "";
  if (t.text) return String(t.text).trim();
  if (t.rich && t.rich.paras) return t.rich.paras.map((p) => p.runs.map((r) => r.text).join("")).join(" ").trim();
  return "";
}

/* Chart → <chart type=...>{JSON}</chart> bila modelnya punya kategori/seri; kalau tidak → null. */
function chartTag(el, env) {
  const chart = el.chart;
  if (!chart || chart.kind !== "chart" || !chart.plots.length) return null;
  if (new Set(chart.plots.map((p) => p.type)).size !== 1) return null; // chart kombinasi
  const plot = chart.plots[0];
  let type = CHART_TYPES[plot.type];
  if (!type) return null;
  if (type === "bar" && plot.barDir === "bar") type = "hbar";
  let sers = chart.plots.flatMap((p) => p.series);
  const n = Math.max(0, ...sers.map((s) => (s.val ? s.val.values.length : 0)));
  if (!sers.length || !n) return null;
  if (type === "pie") sers = sers.slice(0, 1);
  const cat = sers.find((s) => s.cat && s.cat.values && s.cat.values.length);
  const labels = Array.from({ length: n }, (_, i) => (cat && cat.cat.values[i] != null ? String(cat.cat.values[i]) : String(i + 1)));
  const series = sers.map((s, i) => ({
    name: s.name || "Seri " + (i + 1),
    data: Array.from({ length: n }, (_, j) => (s.val && typeof s.val.values[j] === "number" ? s.val.values[j] : null)),
  }));
  const k = env.k;
  const width = Math.round(Math.min(1720, Math.max(480, el.w * k)));
  const height = Math.round(Math.min(780, Math.max(320, el.h * k)));
  const title = chartTitle(chart);
  const stacked = /stacked/i.test(plot.grouping || "") && type !== "pie" && type !== "doughnut";
  const json = JSON.stringify({ labels, series }).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").split("{{").join("{ {");
  env.stats.chart++;
  return '<chart type="' + type + '" width="' + width + '" height="' + height + '"' +
    (title ? ' title="' + escAttr(title) + '"' : "") + (stacked ? " stacked" : "") + ">" + json + "</chart>";
}

/* ---------- 4. mode semantic ---------- */
const FOOTER_PH = new Set(["dt", "ftr", "sldNum", "hdr"]);

/* Ratakan pohon elemen slide (hanya layer "slide"; dekorasi master/layout milik design slideck). */
function collectItems(slide, env) {
  const items = [];
  const skipped = {};
  const skip = (what) => { skipped[what] = (skipped[what] || 0) + 1; };
  const walk = (el, ox, oy) => {
    const box = { x: ox + el.x, y: oy + el.y, w: el.w, h: el.h };
    const t = el.ph && el.ph.type;
    if (t && FOOTER_PH.has(t)) return;
    if (el.kind === "group") {
      if (el.smartArt) {
        const texts = [];
        const grab = (g) => { for (const c of g.children || []) { if (c.kind === "group") grab(c); else if (hasText(c.text)) texts.push(inlineHtml(c.text)); } };
        grab(el);
        if (texts.length) { items.push({ type: "smartart", el, box, texts }); env.stats.disederhanakan++; }
        else skip("SmartArt");
        return;
      }
      for (const c of el.children || []) walk(c, box.x, box.y);
      return;
    }
    if (el.kind === "shape") {
      if (el.connector) return skip("konektor");
      if (!hasText(el.text)) { if (!el.ph) skip("shape"); return; }
      if (t === "title" || t === "ctrTitle") return void items.push({ type: "title", el, box });
      if (t === "subTitle") return void items.push({ type: "subtitle", el, box });
      if (el.ph) return void items.push({ type: "content", sub: "text", el, box });
      if (onlyFields(el.text)) return;
      return void items.push({ type: "free", sub: "text", el, box });
    }
    if (el.kind === "pic") {
      if (el.media) {
        if (!el.media.src || el.media.src.external) return skip("media eksternal");
        return void items.push({ type: el.ph ? "content" : "free", sub: "media", el, box });
      }
      if (!el.blip || !el.blip.image) return skip("gambar tanpa data");
      if (el.blip.image.external) return skip("gambar eksternal");
      return void items.push({ type: el.ph ? "content" : "free", sub: "pic", el, box });
    }
    if (el.kind === "table" || el.kind === "chart") return void items.push({ type: el.ph ? "content" : "free", sub: el.kind, el, box });
    skip(el.kind || "objek");
  };
  for (const el of slide.elements) if (el.layer === "slide") walk(el, 0, 0);
  return { items, skipped, skip };
}

function isDark(bg) {
  const f = bg && bg.fill;
  if (!f) return false;
  let cols = [];
  if (f.type === "solid" && f.color) cols = [f.color];
  else if (f.type === "grad") cols = (f.stops || []).map((s) => s.color).filter(Boolean);
  if (!cols.length) return false;
  const lum = cols.reduce((a, c) => a + (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255, 0) / cols.length;
  return lum < 0.4;
}

/* Satu slide pptx → satu atau lebih slide slideck (lebih dari satu bila tabel dipecah). */
function semanticSlide(slide, env) {
  env.slide = slide;
  const { items, skipped, skip } = collectItems(slide, env);
  const no = slide.index + 1;
  const continuations = []; // potongan tabel lanjutan
  const area = env.W * env.H;

  const titleItem = items.find((i) => i.type === "title") || null;
  const subItem = items.find((i) => i.type === "subtitle") || null;
  let contents = items.filter((i) => i.type === "content");
  let frees = items.filter((i) => i.type === "free" || i.type === "smartart");
  // judul kedua dst. diperlakukan sebagai teks bebas
  for (const i of items) if ((i.type === "title" && i !== titleItem) || (i.type === "subtitle" && i !== subItem)) frees.push({ ...i, type: "free", sub: "text" });

  // gambar yang menutup hampir seluruh slide = latar; tidak dipetakan
  frees = frees.filter((i) => {
    if (i.sub === "pic" && (i.box.w * i.box.h) / area >= 0.85) { skip("gambar latar"); return false; }
    return true;
  });

  /* animasi on-click di pptx → langkah slideck (data-step / data-steps per paragraf) */
  const stepOf = (i) => (i.el && i.el.step) || 0;
  const stepWrap = (i, html) => {
    if (!html || !stepOf(i)) return html;
    if (i.el.paraBuild && i.sub === "text") return /^<(ul|ol)\b[^>]*>[\s\S]*<\/\1>$/.test(html.trim()) ? html.trim().replace(/^<(ul|ol)\b/, "<$1 data-steps") : "<div data-steps>\n" + html + "\n</div>";
    return "<div data-step=\"" + stepOf(i) + "\">\n" + html + "\n</div>";
  };
  /* isi sebuah item sebagai HTML blok (untuk di dalam <ph>) */
  const itemHtml = (i) => stepWrap(i, itemHtmlRaw(i));
  const itemHtmlRaw = (i) => {
    if (i.type === "smartart") return "<ul>" + i.texts.map((t) => "<li>" + t + "</li>").join("") + "</ul>";
    switch (i.sub) {
      case "text": return blocksHtml(i.el.text);
      case "pic": return imgTag(i.el, env);
      case "media": return mediaTag(i.el, env);
      case "table": {
        const chunks = tableChunks(i.el, env);
        continuations.push(...chunks.slice(1));
        return chunks[0];
      }
      case "chart": return chartTag(i.el, env) || (skip("chart (tipe tidak didukung)"), "");
      default: return "";
    }
  };
  /* item bebas → elemen berposisi absolut di luar <ph>; langkahnya jadi atribut di elemen terluar */
  const freeAbs = (i) => {
    const h = freeAbsRaw(i), s = stepOf(i);
    if (!h || !s) return h;
    return h.replace(/^<(\w+)/, "<$1 " + (i.el.paraBuild && i.sub === "text" ? "data-steps" : "data-step=\"" + s + "\""));
  };
  const freeAbsRaw = (i) => {
    const st = absStyle(i.box, env);
    if (i.type === "smartart") return '<div class="small" style="' + st + '">' + itemHtmlRaw(i) + "</div>";
    switch (i.sub) {
      case "text": return '<div class="small" style="' + st + '">' + blocksHtml(i.el.text) + "</div>";
      case "pic": return imgTag(i.el, env, st);
      case "media": return mediaTag(i.el, env, st);
      case "chart": {
        const tag = chartTag(i.el, env);
        if (tag) return '<div style="' + st + '">' + tag + "</div>";
        return skip("chart (tipe tidak didukung)"), "";
      }
      default: return '<div style="' + st + '">' + itemHtmlRaw(i) + "</div>";
    }
  };
  const byReading = (a, b) => (a.box.y - b.box.y) || (a.box.x - b.box.x);
  const byX = (a, b) => (a.box.x + a.box.w / 2) - (b.box.x + b.box.w / 2);
  const isTextPh = (i) => i.sub === "text";

  const ph = []; // [nama, html, blok?]
  const put = (name, html, block) => { if (html) ph.push([name, html, block]); };
  const outside = [];
  const lt = slide.layoutType || "";
  let layout;

  const titleHtml = titleItem ? inlineHtml(titleItem.el.text) : "";
  put("title", titleHtml);

  const textContents = contents.filter(isTextPh);
  if ((lt === "title" || (titleItem && titleItem.el.ph.type === "ctrTitle")) && contents.length <= 1 && textContents.length === contents.length) {
    layout = "title";
    const sub = subItem || contents[0];
    if (sub) put("subtitle", inlineHtml(sub.el.text));
    if (subItem && contents[0]) frees.push({ ...contents[0], type: "free" });
    contents = [];
  } else if (lt === "secHead" && contents.length <= 1 && textContents.length === contents.length) {
    layout = "section";
    const sub = subItem || contents[0];
    if (sub) put("subtitle", inlineHtml(sub.el.text));
    contents = [];
  } else {
    if (subItem) contents.unshift({ ...subItem, type: "content", sub: "text" });
    const picPh = contents.find((i) => i.sub === "pic" && i.el.ph.type === "pic");
    if (lt === "twoTxTwoObj" && contents.length >= 3 && contents.length <= 4) {
      layout = "comparison";
      const sorted = [...contents].sort(byX);
      const mid = env.W / 2;
      let left = sorted.filter((i) => i.box.x + i.box.w / 2 < mid), right = sorted.filter((i) => i.box.x + i.box.w / 2 >= mid);
      if (!left.length || !right.length) { left = sorted.slice(0, Math.ceil(sorted.length / 2)); right = sorted.slice(left.length); }
      for (const [side, list] of [["left", left], ["right", right]]) {
        list.sort(byReading);
        const head = list.length > 1 && isTextPh(list[0]) ? list.shift() : null;
        if (head) put(side + "-head", inlineHtml(head.el.text));
        put(side, list.map(itemHtml).filter(Boolean).join("\n"), true);
      }
    } else if (picPh && contents.length <= 2) {
      layout = "picture-caption";
      put("picture", itemHtml(picPh), true);
      const cap = contents.find((i) => i !== picPh);
      if (cap) put("caption", itemHtml(cap), true);
    } else if (lt === "objTx" && contents.length === 2 && contents.some((i) => isTextPh(i) && i.el.ph.type === "body")) {
      layout = "content-caption";
      const cap = contents.find((i) => isTextPh(i) && i.el.ph.type === "body");
      put("caption", itemHtml(cap), true);
      put("body", itemHtml(contents.find((i) => i !== cap)), true);
    } else {
      // --- umum: tentukan dari jumlah isi + objek bebas ---
      if (!contents.length) {
        // tidak ada body: kotak teks / tabel / chart / SmartArt bebas menjadi body
        const flow = frees.filter((i) => i.sub !== "pic" && i.sub !== "media").sort(byReading);
        const [fa, fb] = [...flow].sort(byX);
        if (flow.length === 2 && fa.box.x + fa.box.w <= fb.box.x + fb.box.w * 0.1) {
          // dua objek berdampingan → dua kolom
          contents = [{ ...fa, type: "content" }, { ...fb, type: "content" }];
          frees = frees.filter((i) => !flow.includes(i));
        } else if (flow.length) {
          contents = [{ type: "content", sub: "flow", parts: flow, box: flow[0].box }];
          frees = frees.filter((i) => !flow.includes(i));
        }
      }
      if (contents.length === 1 && frees.length === 1 && frees[0].sub !== "text" && frees[0].type !== "smartart" &&
          (frees[0].box.w * frees[0].box.h) / area >= 0.06) {
        // satu body + satu visual bebas (gambar/chart/tabel/media) → dua kolom, sisi mengikuti posisi di pptx
        const v = { ...frees[0], type: "content" };
        contents = v.box.x + v.box.w / 2 < env.W / 2 ? [v, contents[0]] : [contents[0], v];
        contents._ordered = true;
        frees = [];
      }
      const html = (i) => (i.sub === "flow" ? i.parts.map(itemHtml).filter(Boolean).join("\n") : itemHtml(i));
      if (contents.length === 2) {
        layout = "two-content";
        const [l, r] = contents._ordered ? contents : [...contents].sort(byX);
        put("left", html(l), true);
        put("right", html(r), true);
      } else if (contents.length >= 1) {
        layout = "title-content";
        const parts = [...contents].sort(byReading).map(html);
        if (contents.length === 1) {
          // tabel/chart/SmartArt bebas ditaruh setelah isi body
          const after = frees.filter((i) => i.sub === "table" || i.sub === "chart" || i.type === "smartart").sort(byReading);
          parts.push(...after.map(itemHtml));
          frees = frees.filter((i) => !after.includes(i));
        }
        put("body", parts.filter(Boolean).join("\n"), true);
      } else {
        layout = titleItem ? "title-only" : "blank";
      }
    }
  }
  for (const i of frees.sort(byReading)) { const h = freeAbs(i); if (h) outside.push(h); }

  const nSkip = Object.values(skipped).reduce((a, b) => a + b, 0);
  if (nSkip) {
    env.stats.dilewati += nSkip;
    warn("slide " + no + ": " + nSkip + " objek dilewati (" + Object.entries(skipped).map(([k, v]) => k + " ×" + v).join(", ") + ")");
  }
  if (slide.steps) warn("slide " + no + ": " + slide.steps + " langkah dari animasi on-click PowerPoint → data-step");
  if (continuations.length) warn("slide " + no + ": tabel > " + TABLE_MAX_ROWS + " baris — dipecah jadi " + (continuations.length + 1) + " slide");

  const attrs = (lay, withNotes) => '<slide layout="' + lay + '"' + (isDark(slide.background) ? " dark" : "") + (withNotes ? notesAttr("notes", slide.notes) : "") + ">";
  const phTag = ([name, html, block]) => (block ? '<ph name="' + name + '">\n' + html + "\n</ph>" : '<ph name="' + name + '">' + html + "</ph>");
  const titlePlain = titleItem ? plainText(titleItem.el.text) : "";
  const main = [attrs(layout, true), ...ph.map(phTag), ...outside, "</slide>"].join("\n") + "\n";
  const out = [{ html: main, title: titlePlain || slide.name || "", hidden: slide.hidden }];
  continuations.forEach((chunk) => {
    const t = titleHtml ? phTag(["title", titleHtml + " (lanjutan)"]) + "\n" : "";
    out.push({ html: attrs("title-content", false) + "\n" + t + phTag(["body", chunk, true]) + "\n</slide>\n", title: (titlePlain || "tabel") + " lanjutan", hidden: slide.hidden });
  });
  return out;
}

/* ---------- 5. main ---------- */
function main() {
  /* --- slides/ tujuan: jangan menimpa tanpa --force --- */
  const slidesDir = path.join(ROOT, "slides");
  const existing = fs.existsSync(slidesDir) ? fs.readdirSync(slidesDir) : [];
  if (existing.length && !force) {
    fail("slides/ sudah berisi " + existing.length + " file (" + path.relative(process.cwd(), slidesDir).replace(/\\/g, "/") +
      ") — pakai --force untuk menimpa, atau --root <folder deck baru>.");
  }

  /* --- parse --- */
  let pres;
  try {
    pres = readPptx(fs.readFileSync(pptxPath));
  } catch (e) {
    fail("gagal membaca pptx: " + e.message);
  }
  if (!pres.slides.length) fail("pptx tidak punya slide.");

  const env = {
    pres, W: pres.width, H: pres.height, k: Math.min(STAGE_W / pres.width, STAGE_H / pres.height), slide: null,
    stats: { gambar: 0, tabel: 0, chart: 0, media: 0, dilewati: 0, disederhanakan: 0 },
  };

  const outSlides = pres.slides.flatMap((s) => {
    if (s.error) warn("slide " + (s.index + 1) + ": gagal diparse (" + s.error + ") — jadi slide kosong");
    return semanticSlide(s, env);
  });

  /* --- tulis slides/ --- */
  if (existing.length) {
    for (const f of existing) if (f.endsWith(".html") || f === "import.css") fs.rmSync(path.join(slidesDir, f));
  }
  fs.mkdirSync(slidesDir, { recursive: true });
  const digits = Math.max(2, String(outSlides.length).length);
  const used = new Set();
  let bytes = 0, hidden = 0;
  outSlides.forEach((s, i) => {
    let name = String(i + 1).padStart(digits, "0") + "-" + (slugify(s.title) || "slide") + ".html";
    if (s.hidden) { name = "_" + name; hidden++; } // slide tersembunyi di pptx → dilewati build (awalan "_")
    while (used.has(name)) name = name.replace(/\.html$/, "-x.html");
    used.add(name);
    fs.writeFileSync(path.join(slidesDir, name), s.html);
    bytes += Buffer.byteLength(s.html);
  });

  /* --- deck.json (hanya bila belum ada) --- */
  const deckPath = path.join(ROOT, "deck.json");
  const baseName = path.basename(pptxPath).replace(/\.pptx$/i, "");
  let deckNote = "deck.json dipertahankan";
  if (!fs.existsSync(deckPath)) {
    const deck = {
      title: (pres.props && pres.props.title) || baseName,
      footer: "",
      output: (slugify(baseName) || "deck") + ".html",
      design: "default", theme: "navy", motion: "corporate",
    };
    fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2) + "\n");
    deckNote = "deck.json dibuat";
  }

  /* --- ringkasan --- */
  for (const w of pres.warnings.slice(0, 12)) warn(w);
  if (pres.warnings.length > 12) warn("… " + (pres.warnings.length - 12) + " catatan parser lain");
  if (hidden) warn(hidden + " slide tersembunyi ditulis dengan awalan \"_\" (dilewati build)");
  const st = env.stats;
  console.log("slideck-html import | " + pres.slides.length + " slide pptx (" + Math.round(pres.width) + "x" + Math.round(pres.height) + ") → " +
    outSlides.length + " file | gambar=" + st.gambar + " tabel=" + st.tabel + " chart=" + st.chart + (st.media ? " media=" + st.media : "") +
    " | dilewati=" + st.dilewati + (st.disederhanakan ? " disederhanakan=" + st.disederhanakan : "") +
    " | " + Math.round(bytes / 1024) + " KB | " + deckNote);
  console.log("  -> " + (path.relative(process.cwd(), slidesDir).replace(/\\/g, "/") || ".") + "/");
}

main();
