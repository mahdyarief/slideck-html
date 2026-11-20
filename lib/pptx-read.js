"use strict";
/* lib/pptx-read.js — pembaca .pptx ramping (node stdlib) untuk import.js mode semantic.
   Yang dibaca: urutan slide, ukuran slide, judul dokumen, slide tersembunyi, catatan pembicara,
   tipe layout, latar (warna solid/gradien, untuk deteksi slide gelap), dan pohon objek:
   shape/teks (placeholder + pewarisan posisi/tipe/bullet dari layout & master), gambar,
   video/audio, tabel (merge), chart (bar/line/area/pie/doughnut + seri), SmartArt (teks
   simpul saja), grup, konektor.
   Yang TIDAK: render visual (geometri, efek, font, warna teks), EMF/WMF/TIFF, animasi.
   Model keluaran: { width, height, props:{title}, slides:[{ index, name, hidden, notes, layoutType,
     background:{fill}, elements:[...], error }], warnings:[...] } — satuan px (96 dpi). */

const { zipRead } = require("./zip");
const X = require("./xml");

const EMU = 9525; // EMU per px
const px = (v) => (Number(v) || 0) / EMU;

/* ---------- paket ---------- */
function openPackage(buf) {
  const files = new Map();
  for (const e of zipRead(buf)) files.set(e.name.replace(/^\/+/, ""), e.data);
  const xmlCache = new Map();
  const xml = (p) => {
    if (!p || !files.has(p)) return null;
    if (!xmlCache.has(p)) xmlCache.set(p, X.parseXml(files.get(p)));
    return xmlCache.get(p);
  };
  const dirOf = (p) => p.slice(0, p.lastIndexOf("/") + 1);
  const resolve = (base, target) => {
    if (target.startsWith("/")) return target.slice(1);
    const parts = (dirOf(base) + target).split("/");
    const out = [];
    for (const s of parts) { if (s === "..") out.pop(); else if (s !== ".") out.push(s); }
    return out.join("/");
  };
  const relsCache = new Map();
  /* rels part → Map id → { type, target (path di paket), external, url } */
  const rels = (p) => {
    if (relsCache.has(p)) return relsCache.get(p);
    const m = new Map();
    const doc = xml(dirOf(p) + "_rels/" + p.slice(p.lastIndexOf("/") + 1) + ".rels");
    for (const r of X.kids(doc, "Relationship")) {
      const external = r.a.TargetMode === "External";
      m.set(r.a.Id, {
        type: (r.a.Type || "").replace(/^.*\//, ""),
        external,
        url: external ? r.a.Target : null,
        target: external ? null : resolve(p, r.a.Target || ""),
      });
    }
    relsCache.set(p, m);
    return m;
  };
  const relOfType = (p, type) => [...rels(p).values()].find((r) => r.type === type) || null;
  return { files, xml, rels, relOfType };
}

/* ---------- warna ---------- */
const hex = (s) => { const n = parseInt(s, 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; };
function applyMods(c, el) {
  let { r, g, b } = c;
  for (const m of X.kids(el)) {
    const v = Number(m.a.val) / 100000;
    if (m.n === "a:lumMod") { r *= v; g *= v; b *= v; }
    else if (m.n === "a:lumOff") { r += 255 * v; g += 255 * v; b += 255 * v; }
    else if (m.n === "a:shade") { r *= v; g *= v; b *= v; }
    else if (m.n === "a:tint") { r += (255 - r) * (1 - v); g += (255 - g) * (1 - v); b += (255 - b) * (1 - v); }
  }
  const cl = (x) => Math.max(0, Math.min(255, Math.round(x)));
  return { r: cl(r), g: cl(g), b: cl(b) };
}
/* elemen pembungkus warna (a:solidFill, a:gs, ...) → {r,g,b} | null */
function colorOf(wrap, ctx) {
  if (!wrap) return null;
  for (const c of X.kids(wrap)) {
    if (c.n === "a:srgbClr") return applyMods(hex(c.a.val), c);
    if (c.n === "a:sysClr") return applyMods(hex(c.a.lastClr || "000000"), c);
    if (c.n === "a:schemeClr") {
      const key = ctx.clrMap[c.a.val] || c.a.val;
      const base = ctx.scheme[key];
      return base ? applyMods(base, c) : null;
    }
    if (c.n === "a:prstClr") return applyMods(c.a.val === "white" ? hex("FFFFFF") : hex("000000"), c);
  }
  return null;
}
function fillOf(el, ctx) {
  if (!el) return null;
  const solid = X.kid(el, "a:solidFill");
  if (solid) { const color = colorOf(solid, ctx); return color ? { type: "solid", color } : null; }
  const grad = X.kid(el, "a:gradFill");
  if (grad) {
    const stops = X.kids(X.kid(grad, "a:gsLst"), "a:gs").map((gs) => ({ pos: Number(gs.a.pos) / 1000, color: colorOf(gs, ctx) }));
    return { type: "grad", stops };
  }
  if (X.kid(el, "a:blipFill")) return { type: "image" };
  return null;
}
function backgroundOf(cSld, ctx) {
  const bg = X.kid(cSld, "p:bg");
  if (!bg) return null;
  const pr = X.kid(bg, "p:bgPr");
  if (pr) return fillOf(pr, ctx);
  const ref = X.kid(bg, "p:bgRef");
  if (ref) { const color = colorOf(ref, ctx); return color ? { type: "solid", color } : null; }
  return null;
}

/* ---------- placeholder ---------- */
const phOf = (nvPr) => {
  const ph = X.kid(nvPr, "p:ph");
  return ph ? { type: ph.a.type || null, idx: ph.a.idx != null ? String(ph.a.idx) : null } : null;
};
const nvPrOf = (el) => {
  const nv = X.kids(el).find((k) => /^p:nv\w+Pr$/.test(k.n));
  return nv ? X.kid(nv, "p:nvPr") : null;
};
const cNvPrOf = (el) => {
  const nv = X.kids(el).find((k) => /^p:nv\w+Pr$/.test(k.n));
  return nv ? X.kid(nv, "p:cNvPr") : null;
};
/* daftar placeholder sebuah part (layout/master) → [{type, idx, el}] */
function phList(doc) {
  const tree = X.path(doc, "p:cSld/p:spTree");
  const out = [];
  for (const el of X.kids(tree)) {
    const ph = phOf(nvPrOf(el));
    if (ph) out.push({ type: ph.type || "obj", idx: ph.idx, el });
  }
  return out;
}
const sameKind = (a, b) => a === b || (a === "ctrTitle" && b === "title") || (a === "title" && b === "ctrTitle") ||
  (["obj", "body", "subTitle"].includes(a) && b === "body");
function matchPh(list, ph, byTypeOnly) {
  if (!list || !ph) return null;
  if (!byTypeOnly && ph.idx != null) {
    const m = list.find((x) => x.idx === ph.idx);
    if (m) return m;
  }
  const t = ph.type || "obj";
  return list.find((x) => x.type === t) || list.find((x) => sameKind(t, x.type)) || null;
}

/* ---------- transform ---------- */
function xfrmOf(el) {
  const sp = X.kids(el).find((k) => k.n === "p:spPr" || k.n === "p:grpSpPr");
  const xf = sp ? X.kid(sp, "a:xfrm") : X.kid(el, "p:xfrm");
  if (!xf) return null;
  const off = X.kid(xf, "a:off"), ext = X.kid(xf, "a:ext");
  if (!off || !ext) return null;
  const r = { x: px(off.a.x), y: px(off.a.y), w: px(ext.a.cx), h: px(ext.a.cy) };
  const choff = X.kid(xf, "a:chOff"), chext = X.kid(xf, "a:chExt");
  if (choff && chext) r.ch = { x: px(choff.a.x), y: px(choff.a.y), w: px(chext.a.cx), h: px(chext.a.cy) };
  return r;
}

/* ---------- teks ---------- */
/* gaya bullet per level dari sebuah lstStyle / txStyles: lvl → "none"|"num"|"char"|undefined */
function bulletLevels(lst) {
  const out = {};
  if (!lst) return out;
  for (const k of X.kids(lst)) {
    const m = /^a:lvl(\d)pPr$/.exec(k.n);
    if (!m) continue;
    const b = bulletOfPPr(k);
    if (b) out[Number(m[1]) - 1] = b;
  }
  return out;
}
function bulletOfPPr(pPr) {
  if (!pPr) return undefined;
  if (X.kid(pPr, "a:buNone")) return "none";
  if (X.kid(pPr, "a:buAutoNum")) return "num";
  if (X.kid(pPr, "a:buChar") || X.kid(pPr, "a:buBlip")) return "char";
  return undefined;
}
const flag = (v) => v === "1" || v === "true";

function runStyle(rPr) {
  if (!rPr) return { bold: false, italic: false, underline: false, strike: false, baseline: 0 };
  return {
    bold: flag(rPr.a.b),
    italic: flag(rPr.a.i),
    underline: !!rPr.a.u && rPr.a.u !== "none",
    strike: !!rPr.a.strike && rPr.a.strike !== "noStrike",
    baseline: Number(rPr.a.baseline) || 0,
  };
}
function linkOf(rPr, part, pkg) {
  const h = rPr && X.kid(rPr, "a:hlinkClick");
  if (!h || !h.a["r:id"]) return null;
  const r = pkg.rels(part).get(h.a["r:id"]);
  return r && r.external ? { url: r.url } : null;
}
/* txBody → { paragraphs:[{ lvl, bullet:{kind}|null, runs:[...] }] }
   bulletChain: fungsi lvl → "none"|"num"|"char"|undefined dari pewarisan. */
function textBody(txBody, part, pkg, bulletChain) {
  if (!txBody) return null;
  const own = bulletLevels(X.kid(txBody, "a:lstStyle"));
  const paragraphs = [];
  for (const p of X.kids(txBody, "a:p")) {
    const pPr = X.kid(p, "a:pPr");
    const lvl = Number(pPr && pPr.a.lvl) || 0;
    let b = bulletOfPPr(pPr);
    if (b === undefined) b = own[lvl];
    if (b === undefined) b = bulletChain(lvl);
    const runs = [];
    for (const r of X.kids(p)) {
      if (r.n === "a:r") {
        const rPr = X.kid(r, "a:rPr");
        runs.push({ kind: "text", text: X.text(X.kid(r, "a:t")), style: runStyle(rPr), link: linkOf(rPr, part, pkg) });
      } else if (r.n === "a:br") runs.push({ kind: "br", text: "" });
      else if (r.n === "a:fld") runs.push({ kind: "field", text: X.text(X.kid(r, "a:t")), style: runStyle(X.kid(r, "a:rPr")), link: null });
    }
    paragraphs.push({ lvl, bullet: b === "num" ? { kind: "num" } : b === "char" ? { kind: "char" } : null, runs });
  }
  return { paragraphs };
}

/* ---------- media ---------- */
const MIME = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", bmp: "image/bmp", svg: "image/svg+xml", webp: "image/webp",
  mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm", mov: "video/quicktime", mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg",
};
const UNVIEWABLE = new Set(["emf", "wmf", "tif", "tiff", "wdp"]);
function mediaOf(part, rid, pkg) {
  if (!rid) return null;
  const r = pkg.rels(part).get(rid);
  if (!r) return null;
  if (r.external) return { external: true, url: r.url };
  const ext = (r.target.split(".").pop() || "").toLowerCase();
  const data = pkg.files.get(r.target);
  if (!data) return null;
  if (UNVIEWABLE.has(ext)) return { unsupported: ext, path: r.target };
  return { path: r.target, mime: MIME[ext] || "application/octet-stream", data };
}

/* ---------- chart ---------- */
function cacheValues(ref) {
  const cache = ref && (X.find(ref, "c:strCache") || X.find(ref, "c:numCache") || X.find(ref, "c:multiLvlStrCache"));
  if (!cache) {
    const lit = ref && (X.kid(ref, "c:strLit") || X.kid(ref, "c:numLit"));
    if (!lit) return [];
    return cacheFrom(lit);
  }
  return cacheFrom(cache);
}
function cacheFrom(cache) {
  const n = Number(X.attr(X.kid(cache, "c:ptCount"), "val", 0));
  const isNum = cache.n === "c:numCache" || cache.n === "c:numLit";
  const vals = new Array(n).fill(null);
  const pts = cache.n === "c:multiLvlStrCache" ? X.kids(X.kid(cache, "c:lvl"), "c:pt") : X.kids(cache, "c:pt");
  for (const pt of pts) {
    const i = Number(pt.a.idx);
    const v = X.text(X.kid(pt, "c:v"));
    if (i >= vals.length) vals.length = i + 1;
    vals[i] = isNum ? (v === "" || isNaN(Number(v)) ? null : Number(v)) : v;
  }
  return vals;
}
function readChart(part, pkg) {
  const doc = pkg.xml(part);
  const chart = X.kid(doc, "c:chart");
  if (!chart) return null;
  const plotArea = X.kid(chart, "c:plotArea");
  const plots = [];
  for (const k of X.kids(plotArea)) {
    if (!/Chart$/.test(k.n)) continue;
    const type = k.n.slice(2);
    const series = X.kids(k, "c:ser").map((s) => {
      const tx = X.kid(s, "c:tx");
      const name = tx ? (X.text(X.find(tx, "c:v")) || X.text(tx)).trim() : "";
      const cat = X.kid(s, "c:cat"), val = X.kid(s, "c:val") || X.kid(s, "c:yVal");
      return { name, cat: cat ? { values: cacheValues(X.kids(cat)[0]) } : null, val: val ? { values: cacheValues(X.kids(val)[0]) } : null };
    });
    plots.push({ type, barDir: X.attr(X.kid(k, "c:barDir"), "val", null), grouping: X.attr(X.kid(k, "c:grouping"), "val", null), series });
  }
  let title = null;
  const t = X.kid(chart, "c:title");
  if (t) {
    const rich = X.find(t, "c:rich");
    const s = rich ? X.kids(rich, "a:p").map((p) => X.findAll(p, "a:t").map(X.text).join("")).join(" ").trim() : X.text(X.find(t, "c:v")).trim();
    title = { text: s };
  }
  return { kind: "chart", plots, title };
}

/* ---------- SmartArt: teks simpul dari data model ---------- */
function readSmartArtTexts(part, pkg) {
  const doc = pkg.xml(part);
  const out = [];
  for (const pt of X.findAll(X.kid(doc, "dgm:ptLst"), "dgm:pt")) {
    const type = pt.a.type || "node";
    if (type !== "node") continue;
    const t = X.kid(pt, "dgm:t");
    if (!t) continue;
    const s = X.kids(t, "a:p").map((p) => X.findAll(p, "a:t").map(X.text).join("")).join("\n").trim();
    if (s) out.push(s);
  }
  return out;
}
const plainTb = (s) => ({ paragraphs: s.split("\n").map((line) => ({ lvl: 0, bullet: null, runs: [{ kind: "text", text: line, style: runStyle(null), link: null }] })) });

/* ---------- pohon objek ---------- */
function readTree(tree, part, pkg, ctx, warn) {
  const out = [];
  for (let el of X.kids(tree)) {
    if (el.n === "mc:AlternateContent") {
      const alt = X.kid(el, "mc:Fallback") || X.kid(el, "mc:Choice");
      for (const k of X.kids(alt)) { const r = readOne(k, part, pkg, ctx, warn); if (r) out.push(r); }
      continue;
    }
    const r = readOne(el, part, pkg, ctx, warn);
    if (r) out.push(r);
  }
  return out;
}

function readOne(el, part, pkg, ctx, warn) {
  const nvPr = nvPrOf(el);
  const cNvPr = cNvPrOf(el);
  const base = { name: X.attr(cNvPr, "name", ""), descr: X.attr(cNvPr, "descr", "") || X.attr(cNvPr, "title", ""), layer: "slide" };
  let ph = phOf(nvPr);
  let lay = null, mas = null;
  if (ph) {
    lay = matchPh(ctx.layoutPh, ph, false);
    mas = matchPh(ctx.masterPh, { type: ph.type || (lay && lay.type) || "obj", idx: null }, true);
    ph = { type: ph.type || (lay && lay.type) || "obj", idx: ph.idx };
  }
  const box = xfrmOf(el) || (lay && xfrmOf(lay.el)) || (mas && xfrmOf(mas.el)) || { x: 0, y: 0, w: 0, h: 0 };
  const common = { ...base, ph, x: box.x, y: box.y, w: box.w, h: box.h };

  if (el.n === "p:sp" || el.n === "p:cxnSp") {
    const t = ph && ph.type;
    const layLst = bulletLevels(lay && X.find(lay.el, "a:lstStyle"));
    const masLst = bulletLevels(mas && X.find(mas.el, "a:lstStyle"));
    const style = !ph ? ctx.otherStyle : (t === "title" || t === "ctrTitle") ? ctx.titleStyle : ctx.bodyStyle;
    const chain = (lvl) => layLst[lvl] !== undefined ? layLst[lvl] : masLst[lvl] !== undefined ? masLst[lvl] : style[lvl];
    return { ...common, kind: "shape", connector: el.n === "p:cxnSp", text: textBody(X.kid(el, "p:txBody"), part, pkg, chain) };
  }
  if (el.n === "p:pic") {
    const blip = X.find(X.kid(el, "p:blipFill"), "a:blip");
    // SVG asli (ekstensi Office 2016) lebih tajam dan kecil daripada PNG cadangannya
    const svg = blip && X.find(blip, "asvg:svgBlip");
    const image = blip ? mediaOf(part, (svg && svg.a["r:embed"]) || blip.a["r:embed"] || blip.a["r:link"], pkg) : null;
    if (image && image.unsupported) warn("gambar ." + image.unsupported + " (" + image.path + ") tidak bisa ditampilkan browser — dilewati");
    const pic = { ...common, kind: "pic", blip: image && !image.unsupported ? { image } : null };
    const vf = nvPr && (X.kid(nvPr, "a:videoFile") || X.kid(nvPr, "a:audioFile"));
    if (vf) {
      const p14 = X.find(nvPr, "p14:media");
      const src = mediaOf(part, (p14 && p14.a["r:embed"]) || vf.a["r:link"], pkg);
      pic.media = { kind: vf.n === "a:videoFile" ? "video" : "audio", src: src && !src.unsupported ? src : null };
    }
    return pic;
  }
  if (el.n === "p:grpSp") {
    const g = xfrmOf(el);
    const children = readTree(el, part, pkg, ctx, warn);
    if (g && g.ch && g.ch.w && g.ch.h) {
      const sx = g.w / g.ch.w, sy = g.h / g.ch.h;
      const map = (c) => {
        c.x = (c.x - g.ch.x) * sx; c.y = (c.y - g.ch.y) * sy; c.w *= sx; c.h *= sy;
      };
      children.forEach(map);
    }
    return { ...common, kind: "group", children };
  }
  if (el.n === "p:graphicFrame") {
    const gd = X.find(el, "a:graphicData");
    const uri = X.attr(gd, "uri", "");
    if (/\/table$/.test(uri)) {
      const tbl = X.kid(gd, "a:tbl");
      const rows = X.kids(tbl, "a:tr").map((tr) => ({
        cells: X.kids(tr, "a:tc").map((tc) => ({
          text: textBody(X.kid(tc, "a:txBody"), part, pkg, () => undefined),
          gridSpan: Number(tc.a.gridSpan) || 1, rowSpan: Number(tc.a.rowSpan) || 1,
          hMerge: flag(tc.a.hMerge), vMerge: flag(tc.a.vMerge),
        })),
      }));
      return { ...common, kind: "table", table: { rows } };
    }
    if (/\/chart$/.test(uri)) {
      const c = X.kid(gd, "c:chart");
      const r = c && pkg.rels(part).get(c.a["r:id"]);
      let chart = null;
      try { chart = r && !r.external ? readChart(r.target, pkg) : null; } catch (e) { warn("chart " + (r && r.target) + " gagal dibaca: " + e.message); }
      return { ...common, kind: "chart", chart };
    }
    if (/\/diagram$/.test(uri)) {
      const ids = X.kid(gd, "dgm:relIds");
      const r = ids && pkg.rels(part).get(ids.a["r:dm"]);
      const texts = r && !r.external ? readSmartArtTexts(r.target, pkg) : [];
      const children = texts.map((s) => ({ kind: "shape", x: 0, y: 0, w: 0, h: 0, layer: "slide", text: plainTb(s) }));
      return { ...common, kind: "group", smartArt: true, children };
    }
    return { ...common, kind: "ole" };
  }
  if (el.n === "p:contentPart") return { ...common, kind: "ink" };
  return null;
}

/* ---------- presentasi ---------- */
function readPptx(buf) {
  const pkg = openPackage(buf);
  const warnings = [];
  const warn = (m) => warnings.push(m);
  const root = pkg.relOfType("", "officeDocument");
  // rels paket ada di _rels/.rels → rels("") membaca "_rels/.rels"
  const presPath = root ? root.target : "ppt/presentation.xml";
  const pres = pkg.xml(presPath);
  if (!pres) throw new Error("bukan file .pptx (ppt/presentation.xml tidak ada)");
  const sz = X.kid(pres, "p:sldSz");
  const width = sz ? px(sz.a.cx) : 960, height = sz ? px(sz.a.cy) : 540;

  const core = pkg.xml("docProps/core.xml");
  const title = core ? X.text(X.find(core, "dc:title")).trim() : "";

  const masterCache = new Map();
  const master = (p) => {
    if (masterCache.has(p)) return masterCache.get(p);
    const doc = pkg.xml(p);
    const themeRel = pkg.relOfType(p, "theme");
    const theme = themeRel && pkg.xml(themeRel.target);
    const scheme = {};
    for (const c of X.kids(X.find(theme, "a:clrScheme"))) {
      const v = X.kids(c)[0];
      if (!v) continue;
      scheme[c.n.slice(2)] = v.n === "a:srgbClr" ? hex(v.a.val) : v.n === "a:sysClr" ? hex(v.a.lastClr || "000000") : null;
    }
    const cm = X.kid(doc, "p:clrMap");
    const clrMap = cm ? { ...cm.a } : { bg1: "lt1", tx1: "dk1", bg2: "lt2", tx2: "dk2" };
    const tx = X.kid(doc, "p:txStyles");
    const m = {
      doc, ph: phList(doc), scheme, clrMap,
      titleStyle: bulletLevels(X.kid(tx, "p:titleStyle")),
      bodyStyle: bulletLevels(X.kid(tx, "p:bodyStyle")),
      otherStyle: bulletLevels(X.kid(tx, "p:otherStyle")),
    };
    masterCache.set(p, m);
    return m;
  };

  const slides = [];
  const presRels = pkg.rels(presPath);
  const ids = X.kids(X.kid(pres, "p:sldIdLst"), "p:sldId");
  ids.forEach((sid, index) => {
    const r = presRels.get(sid.a["r:id"]);
    const slide = { index, name: "", hidden: false, notes: "", layoutType: "", background: null, elements: [], error: null };
    slides.push(slide);
    try {
      const part = r.target;
      const doc = pkg.xml(part);
      if (!doc) throw new Error("part " + part + " tidak ada");
      slide.hidden = X.attr(doc, "show", "1") === "0";
      const cSld = X.kid(doc, "p:cSld");
      slide.name = X.attr(cSld, "name", "");
      const layRel = pkg.relOfType(part, "slideLayout");
      const layDoc = layRel && pkg.xml(layRel.target);
      const masRel = layRel && pkg.relOfType(layRel.target, "slideMaster");
      const m = masRel ? master(masRel.target) : { ph: [], scheme: {}, clrMap: {}, titleStyle: {}, bodyStyle: {}, otherStyle: {} };
      slide.layoutType = X.attr(layDoc, "type", "");
      // clrMap override di slide / layout
      const ovr = X.find(X.kid(doc, "p:clrMapOvr"), "a:overrideClrMapping");
      const ctx = {
        layoutPh: layDoc ? phList(layDoc) : [], masterPh: m.ph,
        scheme: m.scheme, clrMap: ovr ? { ...ovr.a } : m.clrMap,
        titleStyle: m.titleStyle, bodyStyle: m.bodyStyle, otherStyle: m.otherStyle,
      };
      slide.background = { fill: backgroundOf(cSld, ctx) || (layDoc && backgroundOf(X.kid(layDoc, "p:cSld"), ctx)) || (m.doc && backgroundOf(X.kid(m.doc, "p:cSld"), ctx)) || null };
      slide.elements = readTree(X.kid(cSld, "p:spTree"), part, pkg, ctx, (msg) => warn("slide " + (index + 1) + ": " + msg));
      // catatan pembicara: placeholder body di notesSlide
      const nRel = pkg.relOfType(part, "notesSlide");
      const nDoc = nRel && pkg.xml(nRel.target);
      if (nDoc) {
        for (const sp of X.kids(X.path(nDoc, "p:cSld/p:spTree"), "p:sp")) {
          const ph = phOf(nvPrOf(sp));
          if (!ph || ph.type !== "body") continue;
          slide.notes = X.kids(X.kid(sp, "p:txBody"), "a:p")
            .map((p) => X.kids(p).map((k) => (k.n === "a:br" ? "\n" : k.n === "a:r" || k.n === "a:fld" ? X.text(X.kid(k, "a:t")) : "")).join(""))
            .join("\n").trim();
        }
      }
    } catch (e) {
      slide.error = e.message;
    }
  });
  return { width, height, props: { title }, slides, warnings };
}

module.exports = { readPptx };
