/* slideck-html pptx.js — konversi hasil build (dist/<output>.html) ke PowerPoint (.pptx) yang BISA DIEDIT.
   Bukan screenshot: teks jadi text box, kartu/garis/pill jadi bentuk, <table> jadi tabel native,
   <img>/<svg> jadi gambar (SVG tetap vektor lewat svgBlip + PNG cadangan), .shape[data-prst] jadi preset shape.

   Cara kerja: deck HTML dimuat di Chrome/Edge headless ukuran 1920x1080 (skala stage = 1), sebuah script
   mengukur tiap elemen (getBoundingClientRect + computed style) lalu mengirim daftar objek gambar per slide;
   Node merakit paket OOXML-nya sendiri (lib/ooxml.js + lib/zip.js).

   Zero dependency: hanya Node stdlib + browser Chromium/Edge/Chrome yang sudah terpasang.

   Pakai:
     node pptx.js                       # baca deck.json di folder ini, konversi dist/<output>.html
     node pptx.js --root <dir>          # deck.json ada di folder lain
     node pptx.js --html <file.html>    # konversi file HTML hasil build langsung (tanpa deck.json)
     node pptx.js --out <file.pptx>     # tentukan nama output
     CHROME_PATH=<exe> node pptx.js     # paksa path browser tertentu

   Ukuran: slide 16:9 = 12192000 x 6858000 EMU; 1 px stage = 6350 EMU; 1 px font = 0,5 pt.
*/
const fs = require("fs");
const path = require("path");
const url = require("url");
const { OUT_SNIPPET, findBrowser, probe } = require("./lib/browser.js");
const { buildPackage, checkPackage, PRESETS } = require("./lib/ooxml.js");
const { zipWrite, zipRead } = require("./lib/zip.js");
const fontLib = require("./lib/font.js");

const DIR = __dirname;

/* ---------- font embed ----------
   Sumber: @font-face base64 yang sudah di-inline build.js di HTML deck. Tiap face → sfnt → EOT (.fntdata).
   PowerPoint mengenal font lewat nama keluarga Windows (name ID 1), bukan nama CSS: weight 800 statis biasanya
   bernama "Inter ExtraBold" (Regular), jadi run CSS weight 800 dipetakan ke typeface itu, bukan bold sintetis. */
function collectFaces(html, warn) {
  const faces = [];
  const re = /@font-face\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(html))) {
    const body = m[1];
    const fam = /font-family\s*:\s*['"]?([^;'"]+)['"]?/.exec(body);
    const src = /url\(\s*['"]?data:[^;,]*;base64,([A-Za-z0-9+/=]+)['"]?\s*\)/.exec(body);
    if (!fam || !src) continue;
    const weight = parseInt((/font-weight\s*:\s*(\d+)/.exec(body) || [])[1], 10) || 400;
    const italic = /font-style\s*:\s*(italic|oblique)/.test(body);
    let sfnt, info;
    try {
      sfnt = fontLib.toSfnt(Buffer.from(src[1], "base64"));
      info = fontLib.fontInfo(sfnt);
    } catch (e) { warn("font " + fam[1].trim() + " " + weight + " tidak bisa di-embed: " + e.message); continue; }
    if (!fontLib.embeddable(info)) { warn("font " + info.family + " berlisensi restricted (fsType 2) — tidak di-embed"); continue; }
    if (info.variable) { warn("font " + info.family + " variable — PowerPoint hanya memakai instance default"); }
    faces.push({ css: fam[1].trim(), weight, italic, sfnt, info });
  }
  return faces;
}

/* pencocokan font CSS (sederhana): weight ≤500 cari ke bawah dulu, >500 ke atas dulu */
function pickFace(faces, css, w, italic) {
  let pool = faces.filter((f) => f.css.toLowerCase() === String(css || "").toLowerCase());
  if (!pool.length) return null;
  const sameStyle = pool.filter((f) => f.italic === !!italic);
  if (sameStyle.length) pool = sameStyle;
  const down = pool.filter((f) => f.weight <= w).sort((a, b) => b.weight - a.weight);
  const up = pool.filter((f) => f.weight > w).sort((a, b) => a.weight - b.weight);
  /* exact > (w>500: lebih tebal dulu, lalu lebih tipis) / (w≤500: lebih tipis dulu, lalu lebih tebal) */
  const exact = pool.find((f) => f.weight === w);
  if (exact) return exact;
  return (w > 500 ? up[0] || down[0] : down[0] || up[0]) || pool[0];
}

/* ganti font CSS di setiap run dengan typeface Windows + flag bold yang sesuai; kumpulkan face yang terpakai */
function applyEmbeddedFonts(model, faces) {
  const used = new Set();
  const fix = (r) => {
    const f = pickFace(faces, r.font, r.w || (r.b ? 700 : 400), r.i);
    if (!f) return;
    used.add(f);
    r.font = f.info.family;
    if (r.b && !f.info.bold && f.weight >= 600) r.b = 0; /* face tebal tersendiri (mis. ExtraBold): jangan dipertebal lagi */
    else if (!r.b && f.info.bold) r.b = 1;
  };
  const seen = new Set();
  const walk = (o) => {
    if (!o || typeof o !== "object" || seen.has(o) || Buffer.isBuffer(o)) return;
    seen.add(o);
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (typeof o.font === "string" && typeof o.sz === "number") fix(o);
    for (const k in o) if (k !== "media" && k !== "svgBuf") walk(o[k]);
  };
  model.slides.forEach((s) => walk(s.items));
  for (const k of ["major", "minor"]) {
    const f = pickFace(faces, model.theme[k], k === "major" ? 700 : 400, false);
    if (f) { used.add(f); model.theme[k] = f.info.family; }
  }
  /* kelompokkan per typeface Windows → slot regular/bold/italic/boldItalic */
  const byFam = new Map();
  for (const f of used) {
    const slot = (f.info.bold ? "bold" : "regular").replace("regular", f.info.italic ? "italic" : "regular").replace("bold", f.info.italic ? "boldItalic" : "bold");
    const g = byFam.get(f.info.family) || { typeface: f.info.family, panose: f.info.panose.toString("hex").toUpperCase() };
    if (!g[slot]) g[slot] = fontLib.toEot(f.sfnt, f.info);
    byFam.set(f.info.family, g);
  }
  /* slot bold dari keluarga yang sama walau tidak terpakai langsung: tombol Bold di PowerPoint tetap memakai font asli */
  for (const f of faces) {
    const g = byFam.get(f.info.family);
    if (g && f.info.bold && !f.info.italic && !g.bold) g.bold = fontLib.toEot(f.sfnt, f.info);
  }
  model.fonts = [...byFam.values()];
  return model.fonts;
}

const { argOf, deckRoot, deckHtml } = require("./lib/util.js");

/* =====================================================================================
   BAGIAN BROWSER — fungsi ini di-serialisasi (toString) dan dijalankan DI DALAM halaman deck.
   Tidak boleh memakai variabel Node dari luar. Hasil dikirim lewat __slideckOut(obj).
   Semua koordinat keluaran dalam px stage relatif ke pojok kiri-atas slide.
   ===================================================================================== */
async function pageProbe() {
  const out = { slides: [], warn: [], fonts: {}, tokens: {}, title: document.title || "", lang: document.documentElement.lang || "" };
  const warn = (m) => { if (out.warn.indexOf(m) < 0 && out.warn.length < 80) out.warn.push(m); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  /* sengaja TANPA requestAnimationFrame: di bawah --dump-dom + virtual time rAF kadang tidak pernah terpanggil */
  const raf = () => sleep(60);
  const pending = [];
  const pf = (v) => parseFloat(v) || 0;

  /* ---------- warna ---------- */
  const cv1 = document.createElement("canvas");
  cv1.width = cv1.height = 1;
  const cx1 = cv1.getContext("2d", { willReadFrequently: true });
  const colCache = new Map();
  const h2 = (n) => ("0" + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2);
  function col(str) {
    if (!str) return { hex: "000000", a: 0 };
    let c = colCache.get(str);
    if (c) return c;
    let r = 0, g = 0, b = 0, a = 1;
    const m = /^rgba?\(([^)]+)\)$/.exec(str.trim());
    if (m && m[1].indexOf("%") < 0) {
      const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      r = p[0]; g = p[1]; b = p[2];
      if (p.length > 3) a = p[3];
    } else {
      /* color(srgb …), oklch(), nama warna, dst. → biarkan canvas yang mengubahnya ke sRGB */
      cx1.clearRect(0, 0, 1, 1);
      cx1.fillStyle = "rgba(0,0,0,0)";
      cx1.fillStyle = str;
      cx1.fillRect(0, 0, 1, 1);
      const d = cx1.getImageData(0, 0, 1, 1).data;
      r = d[0]; g = d[1]; b = d[2]; a = d[3] / 255;
    }
    c = { hex: (h2(r) + h2(g) + h2(b)).toUpperCase(), a: isFinite(a) ? a : 1 };
    colCache.set(str, c);
    return c;
  }
  const splitTop = (s) => {
    const parts = [];
    let depth = 0, cur = "";
    for (const ch of s) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; } else cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  };

  /* ---------- zoom + opacity turunan ---------- */
  let SLIDE = null;
  let SR = { left: 0, top: 0, s: 1 };
  const zc = new WeakMap(), ac = new WeakMap();
  function zoomOf(el) {
    if (!el || el === document.documentElement || el === document.body) return 1;
    let z = zc.get(el);
    if (z) return z;
    z = (parseFloat(getComputedStyle(el).zoom) || 1) * zoomOf(el.parentElement);
    zc.set(el, z);
    return z;
  }
  function alphaOf(el) {
    if (!el || el === SLIDE || el === document.body) return 1;
    let a = ac.get(el);
    if (a != null) return a;
    const o = parseFloat(getComputedStyle(el).opacity);
    a = (isFinite(o) ? o : 1) * alphaOf(el.parentElement);
    ac.set(el, a);
    return a;
  }
  const rel = (r) => ({ x: (r.left - SR.left) / SR.s, y: (r.top - SR.top) / SR.s, w: r.width / SR.s, h: r.height / SR.s });

  /* ---------- font: nama yang benar-benar dipakai + metrik baris ---------- */
  const meas = document.createElement("div");
  meas.style.cssText = "position:absolute;left:-99999px;top:-99999px;visibility:hidden;white-space:nowrap;padding:0;border:0;margin:0";
  const measSpan = document.createElement("span");
  measSpan.textContent = "mmmmmmmmmmlli10WQ@#Hg";
  meas.appendChild(measSpan);
  const measBase = document.createElement("i");
  measBase.style.cssText = "display:inline-block;width:1px;height:0;vertical-align:baseline";
  meas.appendChild(measBase);
  document.body.appendChild(meas);
  const isWin = /Win/i.test(navigator.platform || ""), isMac = /Mac/i.test(navigator.platform || "");
  const UI = isWin ? "Segoe UI" : isMac ? "Helvetica Neue" : "Arial";
  const GENERIC = { serif: "Times New Roman", "sans-serif": "Arial", monospace: isWin ? "Consolas" : "Courier New", "system-ui": UI, "ui-sans-serif": UI,
    "ui-serif": "Georgia", "ui-monospace": isWin ? "Consolas" : "Courier New", "ui-rounded": UI, cursive: "Comic Sans MS", fantasy: "Impact",
    emoji: "Segoe UI Emoji", math: "Cambria Math" };
  const wOf = (ff) => { meas.style.font = "400 72px " + ff; return measSpan.getBoundingClientRect().width; };
  const baseW = { mono: wOf("monospace"), serif: wOf("serif") };
  const availCache = {};
  const strip = (n) => n.trim().replace(/^["']|["']$/g, "");
  function available(name) {
    if (name in availCache) return availCache[name];
    let ok = false;
    try { document.fonts.forEach((f) => { if (strip(f.family).toLowerCase() === name.toLowerCase() && f.status === "loaded") ok = true; }); } catch (e) { /* abaikan */ }
    if (!ok) {
      const q = '"' + name.replace(/"/g, "") + '"';
      ok = wOf(q + ",monospace") !== baseW.mono || wOf(q + ",serif") !== baseW.serif;
    }
    availCache[name] = ok;
    return ok;
  }
  const famCache = {};
  function resolveFamily(list) {
    if (list in famCache) return famCache[list];
    let res = null;
    for (const raw of splitTop(list || "")) {
      const n = strip(raw);
      if (!n) continue;
      const g = GENERIC[n.toLowerCase()];
      if (g) { res = g; break; }
      if (available(n)) { res = n; break; }
    }
    famCache[list] = res || "Arial";
    return famCache[list];
  }
  const metCache = {};
  /* n = tinggi baris "normal" / ukuran font; ca = tinggi kotak inline (ascent+descent) / ukuran font; asc = ascent / ukuran font */
  function metrics(cs) {
    const key = cs.fontFamily + "|" + cs.fontWeight + "|" + cs.fontStyle;
    if (metCache[key]) return metCache[key];
    meas.style.font = cs.fontStyle + " " + cs.fontWeight + " 100px " + cs.fontFamily;
    meas.style.lineHeight = "normal";
    const sr = measSpan.getBoundingClientRect();
    const n = meas.getBoundingClientRect().height / 100, ca = sr.height / 100, asc = (measBase.getBoundingClientRect().top - sr.top) / 100;
    metCache[key] = { n: n > 0.5 ? n : 1.2, ca: ca > 0.5 ? ca : 1.2, asc: asc > 0.3 && asc < 1.6 ? asc : 0.95 };
    return metCache[key];
  }

  /* ---------- gaya run teks ---------- */
  const rsCache = new WeakMap();
  function runStyle(el) {
    let s = rsCache.get(el);
    if (s) return s;
    const cs = getComputedStyle(el), z = zoomOf(el);
    let cstr = cs.color;
    const tf = cs.webkitTextFillColor;
    if (tf && tf !== cstr && tf !== "currentcolor") {
      const t = col(tf);
      if (t.a > 0.01) cstr = tf;
      else {
        const g = /(rgba?\([^)]*\))/.exec(cs.backgroundImage || ""); /* teks gradien → pakai warna stop pertama */
        if (g) cstr = g[1];
      }
    }
    const c = col(cstr);
    let u = false, st = false, href = null;
    for (let e = el, i = 0; e && e !== SLIDE && i < 8; e = e.parentElement, i++) {
      const ecs = e === el ? cs : getComputedStyle(e);
      const tl = ecs.textDecorationLine || "";
      if (tl.indexOf("underline") >= 0) u = true;
      if (tl.indexOf("line-through") >= 0) st = true;
      if (!href && e.tagName === "A" && /^(https?:|mailto:)/i.test(e.href || "")) href = e.href;
      if (!/^inline/.test(ecs.display)) break;
    }
    const font = resolveFamily(cs.fontFamily);
    out.fonts[font] = (out.fonts[font] || 0) + 1;
    const m = metrics(cs);
    const ls = cs.letterSpacing === "normal" ? 0 : pf(cs.letterSpacing) * z;
    s = { sz: pf(cs.fontSize) * z, w: parseInt(cs.fontWeight, 10) || 400, b: (parseInt(cs.fontWeight, 10) || 400) >= 600, i: /italic|oblique/.test(cs.fontStyle), u, st,
      hex: c.hex, a: c.a * alphaOf(el), font, spc: Math.abs(ls) > 0.01 ? ls : 0, n: m.n, ca: m.ca, asc: m.asc, href,
      base: cs.verticalAlign === "super" ? 30000 : cs.verticalAlign === "sub" ? -25000 : 0, tt: cs.textTransform, ws: cs.whiteSpace,
      vis: cs.visibility === "visible" };
    rsCache.set(el, s);
    return s;
  }

  /* inline "mengalir" (ikut jadi run teks) vs atomik (diproses sebagai kotak sendiri) */
  const flowCache = new WeakMap();
  const ATOMIC_TAG = { SVG: 1, svg: 1, IMG: 1, CANVAS: 1, TABLE: 1, VIDEO: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1, BUTTON: 1 };
  function flow(el) {
    let f = flowCache.get(el);
    if (f != null) return f;
    const d = getComputedStyle(el).display;
    if (ATOMIC_TAG[el.tagName] || (el.matches && el.matches(".shape[data-prst]"))) f = false;
    else if (d === "inline" || d === "contents") f = true;
    else if (d === "inline-block") {
      f = true;
      for (const c of el.children) {
        if (c.tagName === "BR") continue;
        const cd = getComputedStyle(c).display;
        if (cd === "none") continue;
        if (!/^inline/.test(cd) || !flow(c)) { f = false; break; }
      }
    } else f = false;
    flowCache.set(el, f);
    return f;
  }

  /* kumpulkan paragraf + run dari daftar node. opts.blocks: elemen blok di dalamnya jadi paragraf baru (sel tabel, .shape-t) */
  function collectParas(nodes, baseEl, opts) {
    const paras = [];
    let cur = null, curEl = baseEl, atStart = true, lastSpace = false;
    const trimEnd = () => {
      if (!cur) return;
      while (cur.runs.length) {
        const r = cur.runs[cur.runs.length - 1];
        if (r.br || r.pre) break;
        r.t = r.t.replace(/ +$/, "");
        if (r.t) break;
        cur.runs.pop();
      }
      if (!cur.runs.some((r) => !r.br)) { /* paragraf tanpa teks: buang */
        const i = paras.indexOf(cur);
        if (i >= 0) paras.splice(i, 1);
      }
    };
    const endPara = () => { trimEnd(); cur = null; atStart = true; lastSpace = false; };
    const need = () => { if (!cur) { cur = { el: curEl, runs: [] }; paras.push(cur); } return cur; };
    const push = (t, st, pre) => {
      const p = need();
      const last = p.runs[p.runs.length - 1];
      if (last && !last.br && last.st === st) last.t += t;
      else p.runs.push({ t, st, pre });
    };
    const addText = (str, el) => {
      const st = runStyle(el);
      if (!st.vis) return;
      const ws = st.ws || "normal";
      const pre = /^(pre|pre-wrap|break-spaces)$/.test(ws);
      let s = str;
      if (!pre) {
        s = ws === "pre-line" ? s.replace(/[ \t\r\f]*\n[ \t\r\f]*/g, "\n").replace(/[ \t\r\f]+/g, " ") : s.replace(/[ \t\r\n\f]+/g, " ");
      }
      if (st.tt === "uppercase") s = s.toUpperCase();
      else if (st.tt === "lowercase") s = s.toLowerCase();
      else if (st.tt === "capitalize") s = s.replace(/(^|[\s\-(\["'])(\p{L})/gu, (m0, a, b) => a + b.toUpperCase());
      const segs = s.split("\n");
      segs.forEach((seg, i) => {
        if (i > 0) { trimEnd(); need().runs.push({ br: true, st }); atStart = true; lastSpace = false; }
        if (!pre && (atStart || lastSpace)) seg = seg.replace(/^ +/, "");
        if (!seg) return;
        push(seg, st, pre);
        lastSpace = !pre && / $/.test(seg);
        atStart = false;
      });
    };
    const visit = (node) => {
      if (node.nodeType === 3) { addText(node.nodeValue, node.parentElement); return; }
      if (node.nodeType !== 1) return;
      if (node.tagName === "BR") {
        if (cur) { const p = cur; while (p.runs.length && !p.runs[p.runs.length - 1].br && !p.runs[p.runs.length - 1].pre) { const r = p.runs[p.runs.length - 1]; r.t = r.t.replace(/ +$/, ""); if (r.t) break; p.runs.pop(); } }
        need().runs.push({ br: true, st: runStyle(node.parentElement) });
        atStart = true; lastSpace = false;
        return;
      }
      const cs = getComputedStyle(node);
      if (cs.display === "none") return;
      const blockish = !/^inline/.test(cs.display) && cs.display !== "contents";
      if (opts.blocks) {
        if (ATOMIC_TAG[node.tagName]) { if (node.tagName !== "TABLE") return; }
        if (blockish) {
          endPara();
          const prev = curEl;
          curEl = node;
          for (const c of node.childNodes) visit(c);
          endPara();
          curEl = prev;
          return;
        }
        for (const c of node.childNodes) visit(c);
        return;
      }
      if (!flow(node)) { atStart = false; lastSpace = false; return; }
      /* inline-block ber-padding (pill .tag) di tengah kalimat → beri spasi pemisah di kiri */
      if (cs.display === "inline-block" && cur && cur.runs.length && !lastSpace && !atStart &&
        (pf(cs.marginLeft) + pf(cs.paddingLeft)) * zoomOf(node) > 0.2 * pf(cs.fontSize)) { push(" ", runStyle(node.parentElement), false); lastSpace = true; }
      const before = cur ? cur.runs.length : 0;
      for (const c of node.childNodes) visit(c);
      /* inline-block berjarak (mis. tanda centang ::before dengan margin-right) → sisipkan spasi */
      if (cs.display === "inline-block" && cur && cur.runs.length > before && !lastSpace) {
        const gap = (pf(cs.marginRight) + pf(cs.paddingRight)) * zoomOf(node);
        if (gap > 0.2 * pf(cs.fontSize)) { push(" ", runStyle(node), false); lastSpace = true; }
      }
    };
    for (const n of nodes) visit(n);
    endPara();
    return paras;
  }
  /* run internal → run keluaran (tanpa field metrik) */
  const outRun = (r) => {
    const s = r.st;
    const o = { sz: Math.round(s.sz * 100) / 100, hex: s.hex, a: Math.round(s.a * 1000) / 1000, font: s.font, w: s.w };
    if (r.br) o.br = 1; else o.t = r.t;
    if (s.b) o.b = 1;
    if (s.i) o.i = 1;
    if (s.u) o.u = 1;
    if (s.st) o.st = 1;
    if (s.spc) o.spc = Math.round(s.spc * 100) / 100;
    if (s.base) o.base = s.base;
    if (s.href) o.href = s.href;
    if (r.hl) o.hl = r.hl;
    return o;
  };
  const ALGN = { left: "l", start: "l", center: "ctr", "-webkit-center": "ctr", right: "r", end: "r", "-webkit-right": "r", justify: "just" };
  /* Model jarak baris PowerPoint (diukur dari ekspor PowerPoint 16, sama untuk semua font):
       jarak antar-baris = 1,2 x ukuran font x spcPct
       baseline baris pertama dari tepi atas kotak teks = b1(spcPct) x ukuran font, dengan
         spcPct > 100% → 0,9 x spcPct ; = 100% → 0,967 ; < 100% → 1,2 x spcPct - 0,233
     Jadi spcPct = line-height CSS / (1,2 x font-size), dan kotak digeser supaya baseline pertama jatuh di tempat yang sama. */
  function linePct(cs, z) {
    const fsz = pf(cs.fontSize) * z;
    const lh = cs.lineHeight === "normal" ? metrics(cs).n * fsz : pf(cs.lineHeight) * z;
    return fsz > 0 && lh > 0 ? Math.round(lh / (1.2 * fsz) * 10000) / 10000 : 1;
  }
  const b1 = (pct) => { const P = Math.round(pct * 1000); return P > 1000 ? 0.9 * pct : P === 1000 ? 0.967 : Math.max(0.5, 1.2 * pct - 0.233); };

  /* ---------- geometri kotak ---------- */
  function boxOf(el, cs) {
    const r = rel(el.getBoundingClientRect());
    const t = cs.transform;
    if (t && t !== "none" && el.offsetWidth != null) {
      const m = /^matrix\(([^)]+)\)/.exec(t);
      if (m) {
        const v = m[1].split(",").map(parseFloat);
        const ang = Math.atan2(v[1], v[0]) * 180 / Math.PI;
        if (Math.abs(ang) > 0.05) {
          const z = zoomOf(el), w = el.offsetWidth * z * Math.hypot(v[0], v[1]), h = el.offsetHeight * z * Math.hypot(v[2], v[3]);
          return { x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - h / 2, w, h, rot: Math.round(ang * 100) / 100 };
        }
      }
    }
    r.rot = 0;
    return r;
  }
  function radii(cs, w, h, z) {
    const c = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map((k) => {
      const v = (cs["border" + k + "Radius"] || "0px").split(" ");
      const px = (s, ref) => (/%$/.test(s) ? parseFloat(s) / 100 * ref : pf(s) * z);
      return [px(v[0], w), px(v[1] || v[0], h)];
    });
    let f = 1;
    const chk = (a, b, len) => { if (a + b > len && a + b > 0) f = Math.min(f, len / (a + b)); };
    chk(c[0][0], c[1][0], w); chk(c[3][0], c[2][0], w); chk(c[0][1], c[3][1], h); chk(c[1][1], c[2][1], h);
    return c.map((p) => [p[0] * f, p[1] * f]);
  }
  const grow = (rad, d) => rad.map((p) => (p[0] > 0 && p[1] > 0 ? [Math.max(0, p[0] + d), Math.max(0, p[1] + d)] : [0, 0]));
  function geomOf(rad, w, h) {
    const eq = (a, b) => Math.abs(a - b) < 0.3;
    if (rad.every((p) => p[0] < 0.3 || p[1] < 0.3)) return { t: "rect" };
    if (rad.every((p) => eq(p[0], w / 2) && eq(p[1], h / 2))) return { t: "ellipse" };
    const r = rad[0][0];
    if (rad.every((p) => eq(p[0], r) && eq(p[1], r))) {
      const m = Math.min(w, h);
      return { t: "round", adj: m > 0 ? Math.min(50000, Math.round(r / m * 100000)) : 0 };
    }
    return { t: "cust", c: rad.map((p) => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]) };
  }
  function parseShadows(str, z) {
    if (!str || str === "none") return [];
    return splitTop(str).map((p) => {
      const cm = /[a-z-]+\([^)]*\)/i.exec(p);
      const c = col(cm ? cm[0] : "rgb(0,0,0)");
      const nums = ((cm ? p.replace(cm[0], "") : p).match(/-?[\d.]+px/g) || []).map(parseFloat);
      return { inset: /\binset\b/.test(p), dx: (nums[0] || 0) * z, dy: (nums[1] || 0) * z, blur: (nums[2] || 0) * z, spread: (nums[3] || 0) * z, hex: c.hex, a: c.a };
    });
  }
  /* linear-gradient satu lapis sederhana → gradFill native; selain itu null (dirasterisasi) */
  function simpleGrad(cs, w, h, al) {
    const s = cs.backgroundImage;
    const m = /^linear-gradient\((.*)\)$/.exec(s);
    if (!m || /gradient\(.*gradient\(/.test(s)) return null;
    if (cs.backgroundSize !== "auto" || !/^0(px|%) 0(px|%)$/.test(cs.backgroundPosition)) return null;
    const parts = splitTop(m[1]);
    let ang = 180, i0 = 0;
    const SIDE = { "to top": 0, "to right": 90, "to bottom": 180, "to left": 270, "to top right": 45, "to right top": 45, "to bottom right": 135,
      "to right bottom": 135, "to bottom left": 225, "to left bottom": 225, "to top left": 315, "to left top": 315 };
    if (/^-?[\d.]+deg$/.test(parts[0])) { ang = parseFloat(parts[0]); i0 = 1; }
    else if (parts[0] in SIDE) { ang = SIDE[parts[0]]; i0 = 1; }
    else if (/^(to |-?[\d.]+(rad|turn|grad))/.test(parts[0])) return null;
    const a = ang * Math.PI / 180;
    const len = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
    const stops = [];
    for (const p of parts.slice(i0)) {
      const k = p.lastIndexOf(")");
      if (k < 0) return null;
      const c = col(p.slice(0, k + 1));
      const rest = p.slice(k + 1).trim();
      let pos = null;
      if (rest) {
        if (/\s/.test(rest)) return null;
        pos = /%$/.test(rest) ? parseFloat(rest) : len > 0 ? pf(rest) / len * 100 : 0;
      }
      stops.push({ pos, hex: c.hex, a: c.a * al, raw: c.a });
    }
    if (stops.length < 2) return null;
    if (stops[0].pos == null) stops[0].pos = 0;
    if (stops[stops.length - 1].pos == null) stops[stops.length - 1].pos = 100;
    for (let i = 1; i < stops.length - 1; i++) {
      if (stops[i].pos != null) continue;
      let j = i + 1;
      while (stops[j].pos == null) j++;
      for (let k = i; k < j; k++) stops[k].pos = stops[i - 1].pos + (stops[j].pos - stops[i - 1].pos) * (k - i + 1) / (j - i + 1);
    }
    let prev = 0;
    stops.forEach((st, i) => {
      st.pos = Math.max(prev, Math.min(100, Math.max(0, st.pos)));
      prev = st.pos;
      if (st.raw < 0.004) { /* "transparent" = hitam alpha 0: pinjam RGB tetangga agar tidak keabu-abuan */
        const nb = stops[i + 1] && stops[i + 1].raw > 0.004 ? stops[i + 1] : stops[i - 1];
        if (nb) st.hex = nb.hex;
      }
    });
    return { ang, stops: stops.map((st) => ({ pos: Math.round(st.pos * 100) / 100, hex: st.hex, a: Math.round(st.a * 1000) / 1000 })) };
  }

  /* ---------- rasterisasi ---------- */
  const loadImg = (src) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("gambar gagal dimuat"));
    im.src = src;
  });
  async function svgXmlToPng(xml, w, h, scale) {
    const im = await loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml));
    let cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
    const k = Math.min(1, 4096 / Math.max(cw, ch));
    cw = Math.max(1, Math.round(cw * k)); ch = Math.max(1, Math.round(ch * k));
    const c = document.createElement("canvas");
    c.width = cw; c.height = ch;
    c.getContext("2d").drawImage(im, 0, 0, cw, ch);
    return c.toDataURL("image/png");
  }
  const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  /* background-image rumit (radial, berulang, berlapis) → PNG lewat <foreignObject> */
  function rasterBg(cs, uw, uh, w, h) {
    const props = ["background-image", "background-size", "background-position", "background-repeat", "background-origin", "background-clip"];
    const style = "width:" + uw + "px;height:" + uh + "px;margin:0;" + props.map((p) => p + ":" + cs.getPropertyValue(p)).join(";");
    if (/url\((?!["']?data:)/.test(cs.backgroundImage)) warn("background-image url(...) non-data tidak ikut diekspor");
    const xml = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + uw + " " + uh + '">' +
      '<foreignObject x="0" y="0" width="' + uw + '" height="' + uh + '"><div xmlns="http://www.w3.org/1999/xhtml" style="' + escAttr(style) + '"></div></foreignObject></svg>';
    /* gradien halus berukuran besar cukup setengah resolusi (file jauh lebih kecil); pola berulang/kecil tetap tajam */
    const smooth = !/repeating-|url\(/.test(cs.backgroundImage) && /^auto(, auto)*$/.test(cs.backgroundSize);
    return svgXmlToPng(xml, w, h, w * h > 500000 ? (smooth ? 0.5 : 1) : 2);
  }
  const faceCache = {};
  function fontFaceCss(fams) {
    let css = "";
    for (const fam of fams) {
      if (!(fam in faceCache)) {
        let c = "";
        for (const sh of document.styleSheets) {
          let rules;
          try { rules = sh.cssRules; } catch (e) { continue; }
          for (const r of rules) if (r.type === 5 && strip(r.style.getPropertyValue("font-family")).toLowerCase() === fam.toLowerCase()) c += r.cssText;
        }
        faceCache[fam] = c;
      }
      css += faceCache[fam];
    }
    return css;
  }
  const SVG_SKIP = { defs: 1, style: 1, title: 1, desc: 1, metadata: 1, script: 1, lineargradient: 1, radialgradient: 1, clippath: 1, mask: 1, pattern: 1,
    marker: 1, symbol: 1, filter: 1 };
  /* klon SVG dengan gaya presentasi di-inline (var(), currentColor, class tidak selamat dari serialisasi) → { svg, png } */
  async function svgToPic(svg, w, h, vb) {
    const clone = svg.cloneNode(true);
    const src = [svg].concat([...svg.querySelectorAll("*")]), dst = [clone].concat([...clone.querySelectorAll("*")]);
    const fams = new Set();
    const paint = (d, c, prop) => {
      const v = c.getPropertyValue(prop);
      const op = parseFloat(c.getPropertyValue(prop + "-opacity"));
      if (!v || v === "none") { d.setAttribute(prop, "none"); return; }
      const u = /^url\(["']?(#[^"')]+)["']?\)/.exec(v);
      if (u) { d.setAttribute(prop, "url(" + u[1] + ")"); if (isFinite(op) && op < 1) d.setAttribute(prop + "-opacity", String(op)); return; }
      const k = col(v);
      d.setAttribute(prop, "#" + k.hex);
      const a = k.a * (isFinite(op) ? op : 1);
      if (a < 0.999) d.setAttribute(prop + "-opacity", String(Math.round(a * 1000) / 1000)); else d.removeAttribute(prop + "-opacity");
    };
    for (let i = 0; i < src.length; i++) {
      const s = src[i], d = dst[i];
      const tag = (s.localName || "").toLowerCase();
      if (!(s instanceof SVGElement)) continue;
      if (tag === "stop") {
        const c = getComputedStyle(s), k = col(c.stopColor);
        d.setAttribute("stop-color", "#" + k.hex);
        d.setAttribute("stop-opacity", String(Math.round(k.a * (parseFloat(c.stopOpacity) || (c.stopOpacity === "0" ? 0 : 1)) * 1000) / 1000));
        d.removeAttribute("style"); d.removeAttribute("class");
        continue;
      }
      if (SVG_SKIP[tag] || (s.closest && s !== svg && s.closest("defs") && tag !== "path" && tag !== "g")) { continue; }
      const c = getComputedStyle(s);
      if (c.display === "none") { d.setAttribute("display", "none"); d.removeAttribute("style"); d.removeAttribute("class"); continue; }
      paint(d, c, "fill");
      paint(d, c, "stroke");
      if (c.stroke && c.stroke !== "none") {
        d.setAttribute("stroke-width", String(pf(c.strokeWidth)));
        if (c.strokeDasharray && c.strokeDasharray !== "none") d.setAttribute("stroke-dasharray", c.strokeDasharray.replace(/px/g, ""));
        if (c.strokeLinecap && c.strokeLinecap !== "butt") d.setAttribute("stroke-linecap", c.strokeLinecap);
        if (c.strokeLinejoin && c.strokeLinejoin !== "miter") d.setAttribute("stroke-linejoin", c.strokeLinejoin);
      }
      if (c.fillRule === "evenodd") d.setAttribute("fill-rule", "evenodd");
      if (c.visibility !== "visible" && s !== svg) d.setAttribute("visibility", "hidden");
      if (s !== svg) {
        const o = parseFloat(c.opacity);
        if (isFinite(o) && o < 1) d.setAttribute("opacity", String(o));
        if (c.transform && c.transform !== "none" && !s.hasAttribute("transform")) d.setAttribute("transform", c.transform.replace(/px/g, ""));
      }
      if (tag === "text" || tag === "tspan" || tag === "textpath") {
        const fam = resolveFamily(c.fontFamily);
        fams.add(fam);
        out.fonts[fam] = (out.fonts[fam] || 0) + 1;
        d.setAttribute("font-family", fam);
        d.setAttribute("font-size", String(pf(c.fontSize)));
        d.setAttribute("font-weight", c.fontWeight);
        if (/italic|oblique/.test(c.fontStyle)) d.setAttribute("font-style", "italic");
        if (c.textAnchor && c.textAnchor !== "start") d.setAttribute("text-anchor", c.textAnchor);
        /* PowerPoint mengabaikan dominant-baseline (dan tidak konsisten dengan dy) → geser atribut y secara eksplisit */
        d.removeAttribute("dominant-baseline");
        if (/^(central|middle)$/.test(c.dominantBaseline) && (tag === "text" || d.hasAttribute("y"))) {
          const sh = (c.dominantBaseline === "central" ? 0.35 : 0.3) * pf(c.fontSize);
          d.setAttribute("y", (d.getAttribute("y") || "0").trim().split(/[s,]+/).map((v) => String(Math.round((pf(v) + sh) * 100) / 100)).join(" "));
        }
        if (c.letterSpacing && c.letterSpacing !== "normal") d.setAttribute("letter-spacing", String(pf(c.letterSpacing)));
      }
      d.removeAttribute("style");
      d.removeAttribute("class");
      /* paint-order:stroke (halo di belakang teks) tidak dikenal PowerPoint → pecah jadi dua elemen: garis dulu, isi di atasnya */
      if (/^stroke/.test(c.paintOrder || "") && c.stroke !== "none" && c.fill !== "none" && d.parentNode && s !== svg) {
        const halo = d.cloneNode(true);
        halo.setAttribute("fill", "none");
        halo.removeAttribute("id");
        d.parentNode.insertBefore(halo, d);
        d.setAttribute("stroke", "none");
      }
    }
    const scs = getComputedStyle(svg);
    if (vb) clone.setAttribute("viewBox", vb.map((v) => Math.round(v * 1000) / 1000).join(" "));
    else if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", "0 0 " + (pf(scs.width) || w) + " " + (pf(scs.height) || h));
    clone.setAttribute("width", String(Math.round(w * 100) / 100));
    clone.setAttribute("height", String(Math.round(h * 100) / 100));
    if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    if (scs.overflow === "visible") clone.setAttribute("overflow", "visible");
    for (const e of [...clone.querySelectorAll("script,style")]) e.remove();
    const xml = new XMLSerializer().serializeToString(clone);
    /* untuk raster saja: sertakan @font-face deck supaya <text> memakai font yang sama */
    let rxml = xml;
    const css = fams.size ? fontFaceCss(fams) : "";
    if (css) rxml = xml.replace(/>/, "><style>" + css.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</style>");
    let png;
    try { png = await svgXmlToPng(rxml, w, h, 2); } catch (e) { png = await svgXmlToPng(xml, w, h, 2); }
    return { svg: xml, png };
  }

  /* ---------- pseudo-element → elemen nyata ----------
     ::before/::after tidak bisa diukur langsung. Kita salin SEMUA computed style-nya ke elemen <slideck-px> nyata
     (nilai sudah ter-resolve ke px), sisipkan di posisi yang sama, lalu matikan pseudo aslinya. counter() dihitung sendiri. */
  const ROMAN = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  function fmtCounter(n, style) {
    style = (style || "decimal").trim();
    if (style === "decimal-leading-zero") return (n < 0 ? "-" : "") + (Math.abs(n) < 10 ? "0" : "") + Math.abs(n);
    if (/roman$/.test(style) && n > 0 && n < 4000) {
      let s = "", v = n;
      for (const [k, r] of ROMAN) while (v >= k) { s += r; v -= k; }
      return style === "upper-roman" ? s.toUpperCase() : s;
    }
    if (/(alpha|latin)$/.test(style) && n > 0) {
      let s = "", v = n;
      while (v > 0) { v--; s = String.fromCharCode(97 + (v % 26)) + s; v = Math.floor(v / 26); }
      return /^upper/.test(style) ? s.toUpperCase() : s;
    }
    return String(n);
  }
  function resolveContent(content, el, counters) {
    const re = /"((?:[^"\\]|\\[\s\S])*)"|counters?\(([^)]*)\)|attr\(([^)]*)\)|(url\([^)]*\)|[a-z-]+-gradient\()|([a-z-]+)|\s+|\/[\s\S]*$/gy;
    let res = "", m;
    re.lastIndex = 0;
    while (re.lastIndex < content.length && (m = re.exec(content))) {
      if (m[1] != null) res += m[1].replace(/\\([0-9a-fA-F]{1,6}) ?/g, (x, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\([\s\S])/g, "$1");
      else if (m[2] != null) { const a = m[2].split(","); res += fmtCounter(counters[a[0].trim()] || 0, m[0].startsWith("counters") ? a[2] : a[1]); }
      else if (m[3] != null) res += el.getAttribute(m[3].trim().split(/[\s,]/)[0]) || "";
      else if (m[4] != null) return null; /* konten gambar: tidak didukung */
      if (m[0] === "") break;
    }
    return res;
  }
  function materialise(slide) {
    const counters = {};
    const jobs = [];
    const apply = (cs) => {
      const each = (v, def, fn) => {
        if (!v || v === "none") return;
        const t = v.trim().split(/\s+/);
        for (let i = 0; i < t.length; i++) {
          let n = def;
          if (i + 1 < t.length && /^-?\d+$/.test(t[i + 1])) { n = parseInt(t[i + 1], 10); fn(t[i], n); i++; } else fn(t[i], n);
        }
      };
      each(cs.counterReset, 0, (k, n) => { counters[k] = n; });
      each(cs.counterSet, 0, (k, n) => { counters[k] = n; });
      each(cs.counterIncrement, 1, (k, n) => { counters[k] = (counters[k] || 0) + n; });
    };
    const pseudo = (el, which) => {
      const ps = getComputedStyle(el, which);
      const content = ps.content;
      if (!content || content === "none" || content === "normal" || ps.display === "none") return;
      apply(ps);
      const text = resolveContent(content, el, counters);
      if (text === null) { warn("pseudo-element dengan konten gambar dilewati"); return; }
      let css = "";
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        if (p === "content" || p.startsWith("--")) continue;
        css += p + ":" + ps.getPropertyValue(p) + ";";
      }
      jobs.push({ el, which, text, css });
    };
    const rec = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === "none") return;
      apply(cs);
      if (el instanceof SVGElement || ATOMIC_TAG[el.tagName]) return;
      pseudo(el, "::before");
      for (const c of el.children) rec(c);
      pseudo(el, "::after");
    };
    rec(slide);
    for (const j of jobs) {
      const n = document.createElement("slideck-px");
      n.setAttribute("style", j.css);
      n.setAttribute("data-px", j.which);
      if (j.text) n.textContent = j.text;
      if (j.which === "::before") { j.el.insertBefore(n, j.el.firstChild); j.el.setAttribute("data-px-b", ""); }
      else { j.el.appendChild(n); j.el.setAttribute("data-px-a", ""); }
    }
  }

  /* ---------- emisi objek ---------- */
  let items = [], seq = 0;
  const push = (it, L) => { it.L = L; it.seq = seq++; items.push(it); return it; };
  const r2 = (v) => Math.round(v * 100) / 100;
  const nameOf = (el) => {
    if (el.tagName === "SLIDECK-PX") { const h = el.parentElement; return ((h && h.classList[0]) || (h && h.tagName.toLowerCase()) || "") + el.getAttribute("data-px"); }
    return el.classList[0] || el.tagName.toLowerCase();
  };

  function emitDecor(el, cs, L, isRoot) {
    const z = zoomOf(el), al = alphaOf(el);
    const B = boxOf(el, cs);
    const bg = col(cs.backgroundColor);
    const hasFill = !isRoot && bg.a * al > 0.004;
    const hasImg = !!cs.backgroundImage && cs.backgroundImage !== "none";
    const sides = ["Top", "Right", "Bottom", "Left"].map((s) => {
      const st = cs["border" + s + "Style"];
      const c = col(cs["border" + s + "Color"]);
      const w = st === "none" || st === "hidden" || c.a * al < 0.004 ? 0 : pf(cs["border" + s + "Width"]) * z;
      return { w, st, hex: c.hex, a: c.a * al };
    });
    const vis = sides.filter((s) => s.w > 0);
    const s0 = sides[0];
    const uniform = vis.length === 4 && sides.every((s) => Math.abs(s.w - s0.w) < 0.01 && s.st === s0.st && s.hex === s0.hex && Math.abs(s.a - s0.a) < 0.01);
    const shadows = parseShadows(cs.boxShadow, z).filter((s) => !s.inset && s.a * al > 0.004);
    if (!hasFill && !hasImg && !vis.length && !shadows.length) return;
    if (B.w < 0.4 && B.h < 0.4) return;
    const flat = B.w < 0.4 || B.h < 0.4;
    const rad = radii(cs, B.w, B.h, z);
    const name = nameOf(el);
    const base = (d) => ({ x: r2(B.x - d), y: r2(B.y - d), w: r2(Math.max(0, B.w + 2 * d)), h: r2(Math.max(0, B.h + 2 * d)), rot: B.rot,
      geom: geomOf(grow(rad, d), B.w + 2 * d, B.h + 2 * d) });
    /* bayangan keras (blur 0, termasuk cincin spread) → bentuk tersendiri di belakang; bayangan lembut → outerShdw */
    let soft = null;
    for (let i = shadows.length - 1; i >= 0; i--) {
      const s = shadows[i];
      if (s.blur >= 0.5) { if (!soft || s.blur >= soft.blur) soft = s; continue; } /* outerShdw cuma satu: ambil yang paling lebar */
      if (flat) continue;
      const it = base(s.spread);
      it.k = "sp"; it.name = name + " bayangan"; it.x = r2(it.x + s.dx); it.y = r2(it.y + s.dy); it.fill = { hex: s.hex, a: s.a * al };
      push(it, L);
    }
    const bw = uniform ? s0.w : 0;
    const border = uniform ? { w: r2(bw), hex: s0.hex, a: s0.a, dash: s0.st } : null;
    if (!flat && (hasFill || (uniform && !hasImg))) {
      const it = base(hasImg ? 0 : -bw / 2);
      it.k = "sp"; it.name = name;
      it.fill = hasFill ? { hex: bg.hex, a: bg.a * al } : null;
      if (!hasImg) it.ln = border;
      if (soft && hasFill) it.shadow = { dx: r2(soft.dx), dy: r2(soft.dy), blur: r2(soft.blur), hex: soft.hex, a: soft.a * al,
        sx: r2(Math.max(0.1, (B.w + 2 * soft.spread) / B.w)), sy: r2(Math.max(0.1, (B.h + 2 * soft.spread) / B.h)) };
      push(it, L);
    }
    if (hasImg && !flat) {
      const grad = simpleGrad(cs, B.w, B.h, al);
      if (grad) {
        const it = base(0);
        it.k = "sp"; it.name = name + " gradien"; it.grad = grad;
        push(it, L);
      } else {
        const it = base(0);
        it.k = "pic"; it.name = name + " latar"; it.alpha = al; it.src = null;
        push(it, L);
        pending.push(rasterBg(cs, B.w / z, B.h / z, B.w, B.h).then((png) => { it.src = png; }).catch((e) => {
          it.drop = 1;
          warn("background-image gagal dirasterisasi (" + name + "): " + (e && e.message));
        }));
      }
      if (uniform) {
        const it = base(-bw / 2);
        it.k = "sp"; it.name = name + " bingkai"; it.fill = null; it.ln = border;
        push(it, L);
      }
    }
    if (!uniform) {
      sides.forEach((s, i) => {
        if (!(s.w > 0)) return;
        const hw = s.w / 2;
        const l = i === 0 ? [B.x, B.y + hw, B.x + B.w, B.y + hw] : i === 1 ? [B.x + B.w - hw, B.y, B.x + B.w - hw, B.y + B.h] :
          i === 2 ? [B.x, B.y + B.h - hw, B.x + B.w, B.y + B.h - hw] : [B.x + hw, B.y, B.x + hw, B.y + B.h];
        push({ k: "ln", name: name + " garis", x1: r2(l[0]), y1: r2(l[1]), x2: r2(l[2]), y2: r2(l[3]), w: r2(s.w), hex: s.hex, a: s.a, dash: s.st }, L);
      });
    }
  }

  const BULLET = { disc: "\u2022", circle: "\u25E6", square: "\u25AA" };
  function emitText(el, nodes, blockMode, firstGroup, L) {
    const paras = collectParas(nodes, el, { blocks: false });
    if (!paras.length) return;
    const runs = paras[0].runs;
    /* kotak-kotak baris teks yang sebenarnya */
    const rects = [];
    const tw = (n) => {
      if (n.nodeType === 3) {
        if (!/\S/.test(n.nodeValue) || !runStyle(n.parentElement).vis) return;
        const rg = document.createRange();
        rg.selectNodeContents(n);
        for (const q of rg.getClientRects()) if (q.width > 0.2 && q.height > 0.2) rects.push(q);
      } else if (n.nodeType === 1 && n.tagName !== "BR" && flow(n)) for (const c of n.childNodes) tw(c);
    };
    nodes.forEach(tw);
    if (!rects.length) return;
    rects.sort((a, b) => a.top - b.top);
    let lines = 0, lineBottom = -1e9, f = null, minL = 1e9, maxR = -1e9, flineL = 1e9;
    for (const q of rects) {
      if ((q.top + q.bottom) / 2 > lineBottom) { lines++; lineBottom = q.bottom; } else lineBottom = Math.max(lineBottom, q.bottom);
      if (lines === 1) { if (!f || q.height > f.height) f = q; flineL = Math.min(flineL, q.left); }
      minL = Math.min(minL, q.left); maxR = Math.max(maxR, q.right);
    }
    const U = rel({ left: minL, top: f.top, width: maxR - minL, height: f.height });
    /* sumber gaya blok: elemennya sendiri, atau satu-satunya anak inline-block (mis. pill .tag) */
    let src = el;
    const elems = nodes.filter((n) => n.nodeType === 1 && n.tagName !== "BR"), texts = nodes.filter((n) => n.nodeType === 3 && /\S/.test(n.nodeValue));
    if (!blockMode && !texts.length && elems.length === 1 && flow(elems[0]) && getComputedStyle(elems[0]).display === "inline-block") src = elems[0];
    const cs = getComputedStyle(src), z = zoomOf(src);
    const ecs = getComputedStyle(el);
    const pct = linePct(cs, z);
    let dom = null;
    for (const r of runs) if (!r.br && (!dom || r.st.sz > dom.sz)) dom = r.st;
    if (!dom) return;
    const lh = cs.lineHeight === "normal" ? metrics(cs).n * pf(cs.fontSize) * z : pf(cs.lineHeight) * z;
    /* baseline baris pertama di browser = atas kotak inline + ascent; samakan dengan baseline PowerPoint (lihat b1) */
    let y = U.y + (dom.asc - b1(pct)) * dom.sz;
    let x, w, wrap, algn = ALGN[ecs.textAlign] || "l";
    const single = lines === 1;
    const nowrap = /^(nowrap|pre)$/.test(cs.whiteSpace);
    const B = boxOf(el, ecs);
    let rot = 0;
    if (blockMode) {
      const ez = zoomOf(el);
      const cl = B.x + (pf(ecs.borderLeftWidth) + pf(ecs.paddingLeft)) * ez;
      const cw = B.w - (pf(ecs.borderLeftWidth) + pf(ecs.paddingLeft) + pf(ecs.paddingRight) + pf(ecs.borderRightWidth)) * ez;
      x = cl; w = cw;
      if (B.rot) { rot = B.rot; y = B.y + (pf(ecs.borderTopWidth) + pf(ecs.paddingTop)) * ez + (lh - dom.ca * dom.sz) / 2 + (dom.asc - b1(pct)) * dom.sz; }
      else if (single && algn === "l" && U.x - cl > 1) { w = Math.max(U.w, cl + cw - U.x); x = U.x; } /* ada dekorasi/indent sebelum teks */
      wrap = nowrap || (single && w - U.w < Math.max(2, 0.04 * U.w)) ? "none" : "square";
      /* metrik teks PowerPoint sedikit berbeda dari browser: beri kelonggaran 1% supaya baris tidak patah lebih awal */
      if (!single && wrap === "square" && algn === "l" && !B.rot) w += 2 + 0.01 * w;
    } else {
      x = U.x; w = U.w + (single ? 0 : 2);
      wrap = single || nowrap ? "none" : "square";
      if (/flex|grid/.test(ecs.display) && (ecs.justifyContent === "center" || ecs.alignItems === "center" && /column/.test(ecs.flexDirection))) algn = "ctr";
    }
    const para = { algn, pct, runs: runs.map(outRun) };
    /* <li> berbutir → paragraf dengan bullet + indent gantung */
    if (firstGroup && el.tagName === "LI") {
      const lt = ecs.listStyleType;
      if (ecs.display === "list-item" && lt && lt !== "none") {
        const pad = pf(getComputedStyle(el.parentElement).paddingLeft) * zoomOf(el.parentElement);
        const indent = Math.max(0.7 * dom.sz, Math.min(pad || dom.sz, 1.05 * dom.sz));
        let lvl = -1;
        for (let e = el.parentElement; e && e !== SLIDE; e = e.parentElement) if (e.tagName === "UL" || e.tagName === "OL") lvl++;
        para.bullet = { indent: r2(indent) };
        if (BULLET[lt]) para.bullet.char = BULLET[lt];
        else if (/^(decimal|lower-alpha|upper-alpha|lower-latin|upper-latin|lower-roman|upper-roman)$/.test(lt)) {
          para.bullet.num = lt;
          const sibs = [...el.parentElement.children].filter((c) => c.tagName === "LI");
          para.bullet.start = (parseInt(el.parentElement.getAttribute("start"), 10) || 1) + sibs.indexOf(el);
        } else para.bullet.char = /^"/.test(lt) ? lt.replace(/^"|"$/g, "").trim().slice(0, 1) || "\u2022" : "\u2022";
        if (lvl > 0) para.lvl = Math.min(8, lvl);
        x -= indent; w += indent;
      }
    }
    push({ k: "tx", name: nameOf(src === el ? el : src), x: r2(x), y: r2(y), w: r2(Math.max(1, w)), h: r2(Math.max(lh, lines * lh)), rot, wrap, anchor: "t", paras: [para] }, L);
  }

  function emitTable(tbl, L) {
    const al = alphaOf(tbl);
    const rows = [...tbl.rows].filter((tr) => getComputedStyle(tr).display !== "none" && tr.cells.length);
    if (!rows.length) return;
    const occ = rows.map(() => []);
    const list = [];
    rows.forEach((tr, r) => {
      let c = 0;
      for (const td of tr.cells) {
        while (occ[r][c]) c++;
        const gs = Math.max(1, td.colSpan || 1), rs = Math.max(1, Math.min(td.rowSpan || 1, rows.length - r));
        for (let i = 0; i < rs; i++) for (let j = 0; j < gs; j++) occ[r + i][c + j] = i || j ? { hm: j > 0 ? 1 : 0, vm: i > 0 ? 1 : 0, gs: i > 0 && j === 0 ? gs : 1, rs: i === 0 && j > 0 ? rs : 1 } : { td, gs, rs };
        list.push({ td, r, c, gs, rs });
        c += gs;
      }
    });
    const nCols = Math.max.apply(null, occ.map((o) => o.length));
    const xe = new Array(nCols + 1).fill(null), ye = new Array(rows.length + 1).fill(null);
    rows.forEach((tr, r) => { const q = rel(tr.getBoundingClientRect()); if (ye[r] == null) ye[r] = q.y; ye[r + 1] = q.y + q.h; });
    list.forEach((o) => { const q = rel(o.td.getBoundingClientRect()); if (xe[o.c] == null) xe[o.c] = q.x; if (xe[o.c + o.gs] == null) xe[o.c + o.gs] = q.x + q.w; });
    const T = rel(tbl.getBoundingClientRect());
    if (xe[0] == null) xe[0] = T.x;
    if (xe[nCols] == null) xe[nCols] = T.x + T.w;
    for (let i = 1; i < nCols; i++) {
      if (xe[i] != null) continue;
      let j = i + 1;
      while (xe[j] == null) j++;
      xe[i] = xe[i - 1] + (xe[j] - xe[i - 1]) / (j - i + 1);
    }
    const side = (cs, S, z) => {
      const st = cs["border" + S + "Style"];
      if (st === "none" || st === "hidden") return null;
      const w = pf(cs["border" + S + "Width"]) * z, c = col(cs["border" + S + "Color"]);
      return w > 0 && c.a * al > 0.004 ? { w: r2(w), hex: c.hex, a: c.a * al, dash: st } : null;
    };
    const cells = occ.map((row, r) => {
      const res = [];
      for (let c = 0; c < nCols; c++) {
        const o = row[c];
        if (!o) { res.push({}); continue; }
        if (!o.td) { res.push(o); continue; }
        const td = o.td, cs = getComputedStyle(td), z = zoomOf(td), tr = td.parentElement, trcs = getComputedStyle(tr);
        let fill = null;
        for (const e of [td, tr, tr.parentElement]) {
          if (!e || e === tbl) break;
          const k = col(getComputedStyle(e).backgroundColor);
          if (k.a * al > 0.004) { fill = { hex: k.hex, a: k.a * al }; break; }
        }
        const b = { t: side(cs, "Top", z) || side(trcs, "Top", z), b: side(cs, "Bottom", z) || side(trcs, "Bottom", z),
          l: side(cs, "Left", z) || (c === 0 ? side(trcs, "Left", z) : null), r: side(cs, "Right", z) || (c + o.gs === nCols ? side(trcs, "Right", z) : null) };
        const paras = collectParas([...td.childNodes], td, { blocks: true });
        let padT = pf(cs.paddingTop) * z, padB = pf(cs.paddingBottom) * z;
        const outParas = paras.map((p, i) => {
          const pcs = getComputedStyle(p.el), pz = zoomOf(p.el);
          const pct = linePct(pcs, pz);
          if (i === 0) {
            const st = p.runs.find((q) => !q.br);
            if (st) { /* samakan baseline baris pertama sel dengan browser */
              const q = st.st, lh = pct * 1.2 * pf(pcs.fontSize) * pz;
              const d = (lh - q.ca * q.sz) / 2 + (q.asc - b1(pct)) * q.sz;
              padT += d; padB -= d;
            }
          }
          return { algn: ALGN[pcs.textAlign] || "l", pct, runs: p.runs.map(outRun) };
        });
        const va = cs.verticalAlign;
        res.push({ gs: o.gs, rs: o.rs, fill, b, paras: outParas, anchor: va === "middle" ? "ctr" : va === "bottom" ? "b" : "t",
          pad: [r2(pf(cs.paddingLeft) * z), r2(Math.max(0, padT)), r2(pf(cs.paddingRight) * z), r2(Math.max(0, padB))] });
      }
      return res;
    });
    /* border-collapse: sisi bersama dua sel → yang lebih tebal menang, lalu dipakai keduanya */
    const win = (a, b) => (!a ? b : !b ? a : b.w > a.w ? b : a);
    for (let r = 0; r < cells.length; r++) for (let c = 0; c < nCols; c++) {
      const A = cells[r][c];
      if (!A.b) continue;
      const D = cells[r + A.rs] && cells[r + A.rs][c], Rn = cells[r][c + A.gs];
      if (D && D.b && A.gs === 1 && D.gs === 1) { const k = win(A.b.b, D.b.t); A.b.b = k; D.b.t = k; }
      if (Rn && Rn.b && A.rs === 1 && Rn.rs === 1) { const k = win(A.b.r, Rn.b.l); A.b.r = k; Rn.b.l = k; }
    }
    /* sel gabungan: garis tepi sel asal diteruskan ke posisi grid yang ditutupinya */
    for (let r = 0; r < cells.length; r++) for (let c = 0; c < nCols; c++) {
      const A = cells[r][c];
      if (!A.b || (A.gs === 1 && A.rs === 1)) continue;
      for (let i = 0; i < A.rs; i++) for (let j = 0; j < A.gs; j++) {
        if (!i && !j) continue;
        const o = cells[r + i] && cells[r + i][c + j];
        if (o) { o.b = { t: i === 0 ? A.b.t : null, b: i === A.rs - 1 ? A.b.b : null, l: j === 0 ? A.b.l : null, r: j === A.gs - 1 ? A.b.r : null }; o.fill = A.fill; }
      }
    }
    const colsW = [], rowsH = [];
    for (let i = 0; i < nCols; i++) colsW.push(r2(Math.max(1, xe[i + 1] - xe[i])));
    for (let i = 0; i < rows.length; i++) rowsH.push(r2(Math.max(1, ye[i + 1] - ye[i])));
    push({ k: "tbl", name: nameOf(tbl), x: r2(xe[0]), y: r2(ye[0]), cols: colsW, rows: rowsH, cells }, L);
  }

  function emitImg(img, cs, L) {
    const B = boxOf(img, cs), z = zoomOf(img);
    if (B.w < 1 || B.h < 1) return;
    const src = img.currentSrc || img.src || "";
    if (!src) return;
    const it = { k: "pic", name: nameOf(img), alt: img.alt || "", x: r2(B.x), y: r2(B.y), w: r2(B.w), h: r2(B.h), rot: B.rot, alpha: alphaOf(img),
      geom: geomOf(radii(cs, B.w, B.h, z), B.w, B.h), src: null };
    const nw = img.naturalWidth, nh = img.naturalHeight;
    if (nw > 0 && nh > 0) {
      if (cs.objectFit === "cover") {
        const s = Math.max(B.w / nw, B.h / nh), vw = B.w / s / nw, vh = B.h / s / nh;
        it.crop = { l: (1 - vw) / 2, r: (1 - vw) / 2, t: (1 - vh) / 2, b: (1 - vh) / 2 };
      } else if (cs.objectFit === "contain" || cs.objectFit === "scale-down" || cs.objectFit === "none") {
        /* sama dengan browser: scale-down/none tidak memperbesar; posisi mengikuti object-position (persen atau px) */
        let s = cs.objectFit === "none" ? 1 : Math.min(B.w / nw, B.h / nh);
        if (cs.objectFit === "scale-down") s = Math.min(1, s);
        const w = nw * s, h = nh * s;
        const pos = (cs.objectPosition || "50% 50%").split(/\s+/);
        const at = (v, free) => /%$/.test(v) ? free * parseFloat(v) / 100 : /px$/.test(v) ? parseFloat(v) : free / 2;
        it.x = r2(B.x + at(pos[0] || "50%", B.w - w)); it.y = r2(B.y + at(pos[1] || "50%", B.h - h)); it.w = r2(w); it.h = r2(h); it.geom = { t: "rect" };
      }
    }
    push(it, L);
    if (/^data:image\/(png|jpe?g|gif);base64,/i.test(src) || (/^file:/i.test(src) && /\.(png|jpe?g|gif)$/i.test(src.split(/[?#]/)[0]))) { it.src = src; return; }
    /* format lain (svg, webp, avif, URL jaringan) → gambar ulang ke PNG lewat canvas */
    pending.push((async () => {
      if (!img.complete) await new Promise((r) => { img.addEventListener("load", r); img.addEventListener("error", r); setTimeout(r, 4000); });
      const k = Math.min(1, 4096 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const vec = /svg/i.test(src.slice(0, 40)) || /\.svg$/i.test(src.split(/[?#]/)[0]);
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(vec ? B.w * 2 : (img.naturalWidth || B.w) * k));
      c.height = Math.max(1, Math.round(vec ? B.h * 2 : (img.naturalHeight || B.h) * k));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      it.src = c.toDataURL("image/png");
    })().catch((e) => { it.drop = 1; warn("<img> tidak bisa diekspor (" + src.slice(0, 60) + "): " + (e && e.message)); }));
  }

  function emitSvg(svg, cs, L) {
    let r = rel(svg.getBoundingClientRect());
    let vb = null;
    /* <svg> overflow:visible (mis. svg.connector 1x1 px yang digambar runtime) → pakai kotak isi sebenarnya */
    if (cs.overflow === "visible") {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const g of svg.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse,text,image,use")) {
        if (g.closest("defs,symbol,marker,clipPath,mask,pattern")) continue;
        const q = g.getBoundingClientRect();
        if (q.width <= 0 && q.height <= 0) continue;
        const sw = pf(getComputedStyle(g).strokeWidth) * 2 + 4;
        x0 = Math.min(x0, q.left - sw); y0 = Math.min(y0, q.top - sw); x1 = Math.max(x1, q.right + sw); y1 = Math.max(y1, q.bottom + sw);
      }
      const o = svg.getBoundingClientRect();
      if (x1 > x0 && (x0 < o.left - 0.5 || y0 < o.top - 0.5 || x1 > o.right + 0.5 || y1 > o.bottom + 0.5)) {
        x0 = Math.min(x0, o.left); y0 = Math.min(y0, o.top); x1 = Math.max(x1, o.right); y1 = Math.max(y1, o.bottom);
        const m = svg.getScreenCTM();
        if (m && m.a && m.d) {
          vb = [(x0 - m.e) / m.a, (y0 - m.f) / m.d, (x1 - x0) / m.a, (y1 - y0) / m.d];
          r = rel({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 });
        }
      }
    }
    if (r.w < 1 || r.h < 1 || (!vb && r.w * r.h < 4)) return;
    const it = push({ k: "pic", name: (svg.classList && svg.classList[0]) || "svg", alt: svg.getAttribute("aria-label") || "", x: r2(r.x), y: r2(r.y), w: r2(r.w), h: r2(r.h),
      rot: 0, alpha: alphaOf(svg), src: null }, L);
    pending.push(svgToPic(svg, r.w, r.h, vb).then((p) => { it.src = p.png; it.svg = p.svg; }).catch((e) => {
      it.drop = 1;
      warn("<svg> gagal dirasterisasi: " + (e && e.message));
    }));
  }

  /* <div class="shape" data-prst="chevron"><svg class="shape-g"><path/></svg><div class="shape-t">teks</div></div> → preset shape native */
  function emitPreset(el, cs, L) {
    const B = boxOf(el, cs), al = alphaOf(el);
    if (B.w < 1 || B.h < 1) return;
    const g = el.querySelector(".shape-g path, .shape-g rect, .shape-g circle, .shape-g ellipse, .shape-g polygon, .shape-g polyline, .shape-g line") || el.querySelector(".shape-g");
    const it = { k: "sp", name: el.getAttribute("data-prst"), x: r2(B.x), y: r2(B.y), w: r2(B.w), h: r2(B.h), rot: B.rot, geom: { t: "prst", prst: el.getAttribute("data-prst") }, fill: null, ln: null };
    if (g) {
      const gc = getComputedStyle(g);
      if (gc.fill && gc.fill !== "none" && !/^url/.test(gc.fill)) { const k = col(gc.fill); const a = k.a * (parseFloat(gc.fillOpacity) || 0) * al; if (a > 0.004) it.fill = { hex: k.hex, a }; }
      if (gc.stroke && gc.stroke !== "none" && !/^url/.test(gc.stroke)) {
        const k = col(gc.stroke);
        let sw = pf(gc.strokeWidth);
        try { const m = g.getScreenCTM(); if (m && gc.vectorEffect !== "non-scaling-stroke") sw *= Math.hypot(m.a, m.b) / SR.s; else sw *= zoomOf(el); } catch (e) { /* biarkan */ }
        const a = k.a * (parseFloat(gc.strokeOpacity) || 0) * al;
        if (sw > 0 && a > 0.004) it.ln = { w: r2(sw), hex: k.hex, a, dash: gc.strokeDasharray && gc.strokeDasharray !== "none" ? "dashed" : "solid" };
      }
    }
    const t = el.querySelector(".shape-t");
    if (t) {
      const paras = collectParas([...t.childNodes], t, { blocks: true });
      it.text = { wrap: "square", anchor: "ctr", ins: [0, 0, 0, 0], paras: paras.map((p) => {
        const pcs = getComputedStyle(p.el);
        return { algn: ALGN[pcs.textAlign] || "ctr", pct: linePct(pcs, zoomOf(p.el)), runs: p.runs.map(outRun) };
      }) };
      if (!it.text.paras.length) delete it.text;
    }
    push(it, L);
  }

  const SKIP_TAG = { SCRIPT: 1, STYLE: 1, TEMPLATE: 1, NOSCRIPT: 1, LINK: 1, META: 1, HEAD: 1 };
  function walk(el, ctx, isRoot) {
    if (SKIP_TAG[el.tagName]) return;
    const cs = getComputedStyle(el);
    if (cs.display === "none") return;
    if (!isRoot && parseFloat(cs.opacity) < 0.01) return;
    if (!isRoot && el.matches(".deck-controls,.progress,.deck-theme-switcher,.slide-notes")) return;
    /* urutan gambar: lapis -1 (z-index negatif) < 0 (alur biasa) < 1 (positioned) < 1+z */
    let L = ctx.L, locked = ctx.locked;
    if (!isRoot && !locked) {
      const zi = cs.zIndex === "auto" ? null : parseInt(cs.zIndex, 10);
      if (cs.position !== "static") {
        L = zi == null ? Math.max(L, 1) : zi < 0 ? -1 : Math.max(L, 1 + zi);
        locked = zi != null;
      } else if (parseFloat(cs.opacity) < 1 || (cs.transform && cs.transform !== "none")) { L = Math.max(L, 1); locked = true; }
    }
    const c2 = { L, locked };
    const vis = cs.visibility === "visible";
    const isSvg = el instanceof SVGElement;
    if (isSvg) { if (vis && el.localName === "svg") emitSvg(el, cs, L); return; }
    if (el.tagName === "IMG") { if (vis) { emitDecor(el, cs, L); emitImg(el, cs, L); } return; }
    if (el.tagName === "CANVAS") {
      if (vis) {
        const B = boxOf(el, cs);
        try { push({ k: "pic", name: "canvas", x: r2(B.x), y: r2(B.y), w: r2(B.w), h: r2(B.h), rot: B.rot, alpha: alphaOf(el), src: el.toDataURL("image/png") }, L); }
        catch (e) { warn("<canvas> tidak bisa dibaca"); }
      }
      return;
    }
    if (el.matches(".shape[data-prst]")) { if (vis) emitPreset(el, cs, L); return; }
    if (el.tagName === "TABLE") { if (vis) { emitDecor(el, cs, L); emitTable(el, L); } return; }
    if (/^(VIDEO|IFRAME|OBJECT|EMBED|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) { warn("<" + el.tagName.toLowerCase() + "> tidak diekspor"); return; }
    if (vis) emitDecor(el, cs, L, isRoot);
    kids(el, cs, c2);
  }
  function inlineDecor(n, ctx) {
    if (!flow(n)) { walk(n, ctx); return; }
    const cs = getComputedStyle(n);
    if (cs.display === "none") return;
    if (cs.visibility === "visible" && cs.display !== "contents") emitDecor(n, cs, ctx.L);
    for (const c of n.children) if (c.tagName !== "BR") inlineDecor(c, ctx);
  }
  function kids(el, cs, ctx) {
    const flexish = /flex|grid/.test(cs.display);
    let group = [], broke = false, first = true;
    const flush = (all) => {
      if (!group.length) return;
      const g = group;
      group = [];
      for (const n of g) if (n.nodeType === 1 && n.tagName !== "BR") inlineDecor(n, ctx);
      const hasText = g.some((n) => (n.nodeType === 3 ? /\S/.test(n.nodeValue) : n.tagName !== "BR" && flow(n) && /\S/.test(n.textContent)));
      if (hasText) { emitText(el, g, all && !flexish, first, ctx.L); first = false; }
    };
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { group.push(n); continue; }
      if (n.nodeType !== 1) continue;
      if (n.tagName === "BR") { group.push(n); continue; }
      const ncs = getComputedStyle(n);
      if (ncs.display === "none") continue;
      if (/^inline/.test(ncs.display) || ncs.display === "contents") { group.push(n); continue; }
      if (ncs.position === "absolute" || ncs.position === "fixed" || ncs.cssFloat !== "none") { walk(n, ctx); continue; } /* di luar alur: tidak memutus teks */
      flush(false);
      broke = true;
      walk(n, ctx);
    }
    flush(!broke);
  }

  /* ---------- jalankan ---------- */
  try {
    const st = document.createElement("style");
    st.textContent = "*,*::before,*::after{transition:none!important;animation-delay:0s!important;animation-duration:.001s!important}" +
      ".reveal{opacity:1!important;transform:none!important;transition:none!important}" +
      ".slide.__px{visibility:visible!important;opacity:1!important}" +
      ".deck-stage{transform:none!important}" + /* viewport headless < 1920x1080 → paksa skala stage = 1 */
      "[data-px-b]::before,[data-px-a]::after{content:none!important}";
    document.head.appendChild(st);
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, sleep(1500)]);
    await raf();
    const fit = async () => {
      if (typeof window.slideckFit !== "function") return;
      try { await window.slideckFit(); } catch (e) { warn("slideckFit() melempar galat: " + (e && e.message)); }
      await raf();
    };
    await fit();

    const root = getComputedStyle(document.documentElement);
    for (const k of ["surface", "navy", "on-navy", "on-navy-mut", "teal", "teal-d", "grey", "mut", "ink", "mint", "accent-line", "tag-bg", "line"]) {
      const v = root.getPropertyValue("--" + k).trim();
      if (v) out.tokens[k] = col(v).hex;
    }
    for (const k of ["font-d", "font-s"]) {
      const v = root.getPropertyValue("--" + k).trim();
      if (v) out.tokens[k] = resolveFamily(v);
    }
    const stage = document.querySelector(".deck-stage");
    const stageBg = stage ? col(getComputedStyle(stage).backgroundColor) : { hex: "FFFFFF", a: 1 };

    const slides = [...document.querySelectorAll(".slide")];
    slides.forEach((s) => s.classList.remove("active", "visible"));
    for (const s of slides) {
      s.classList.add("active", "visible", "__px");
      SLIDE = s;
      await fit();
      materialise(s);
      const r = s.getBoundingClientRect();
      SR = { left: r.left, top: r.top, s: r.width / 1920 || 1 };
      items = [];
      seq = 0;
      const bg = col(getComputedStyle(s).backgroundColor);
      const slide = { bg: bg.a > 0.5 ? bg.hex : stageBg.a > 0.5 ? stageBg.hex : "FFFFFF", notes: s.getAttribute("data-notes") || "", items };
      walk(s, { L: 0, locked: false }, true);
      out.slides.push(slide);
      s.classList.remove("active", "visible", "__px");
    }
    await Promise.all(pending);
    for (const sl of out.slides) {
      sl.items = sl.items.filter((it) => !it.drop && !(it.k === "pic" && !it.src));
      sl.items.sort((a, b) => a.L - b.L || a.seq - b.seq);
    }
    out.scale = SR.s;
  } catch (e) {
    out.error = String((e && e.stack) || e);
  }
  __slideckOut(out);
}

/* =====================================================================================
   BAGIAN NODE
   ===================================================================================== */
function decodeMedia(src, htmlDir, warn) {
  let buf = null;
  const m = /^data:([^;,]*)((?:;[^;,]*)*),(.*)$/s.exec(src);
  if (m) buf = /;base64/i.test(m[2]) ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]), "utf8");
  else if (/^file:/i.test(src)) {
    try { buf = fs.readFileSync(url.fileURLToPath(src.split(/[?#]/)[0])); } catch (e) { warn("file gambar tidak terbaca: " + src); return null; }
  } else {
    try { buf = fs.readFileSync(path.resolve(htmlDir, src)); } catch (e) { warn("gambar tidak terbaca: " + src.slice(0, 80)); return null; }
  }
  if (!buf || buf.length < 8) return null;
  const ext = buf[0] === 0x89 && buf[1] === 0x50 ? "png" : buf[0] === 0xff && buf[1] === 0xd8 ? "jpeg" : buf[0] === 0x47 && buf[1] === 0x49 ? "gif" : null;
  if (!ext) { warn("format gambar tidak didukung PowerPoint, dilewati"); return null; }
  return { buf, ext };
}

function toModel(res, htmlPath, warn) {
  const t = res.tokens || {};
  const pick = (k, d) => (/^[0-9A-F]{6}$/i.test(t[k] || "") ? t[k] : d);
  const theme = {
    colors: {
      lt1: pick("surface", "FFFFFF"), dk1: pick("ink", "2E4053"), dk2: pick("navy", "1C2833"), lt2: pick("grey", "F4F6F6"),
      accent1: pick("teal", "5EA8A7"), accent2: pick("teal-d", "2F7E7D"), accent3: pick("mint", "EAF6F4"), accent4: pick("accent-line", "BFDCD8"),
      accent5: pick("tag-bg", "D9ECEA"), accent6: pick("mut", "5A6C7D"), hlink: pick("teal-d", "2F7E7D"), folHlink: pick("mut", "5A6C7D")
    },
    /* teks baru di PowerPoint memakai font minor → samakan dengan font isi deck (--font-d); --font-s jadi font judul */
    major: t["font-s"] || t["font-d"] || "Georgia",
    minor: t["font-d"] || "Arial"
  };
  const htmlDir = path.dirname(htmlPath);
  const stats = { tx: 0, sp: 0, ln: 0, pic: 0, tbl: 0, svg: 0 };
  const slides = res.slides.map((s) => {
    const items = [];
    for (const it of s.items) {
      if (it.k === "pic") {
        const media = decodeMedia(it.src, htmlDir, warn);
        if (!media) continue;
        it.media = media;
        if (it.svg) { it.svgBuf = Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n' + it.svg, "utf8"); stats.svg++; }
      }
      if (it.k === "sp" && it.geom && it.geom.t === "prst" && !PRESETS.has(it.geom.prst)) {
        warn("data-prst tidak dikenal: " + it.geom.prst + " → dipakai rect");
        it.geom = { t: "rect" };
      }
      stats[it.k] = (stats[it.k] || 0) + 1;
      items.push(it);
    }
    return { bg: s.bg, notes: s.notes, items };
  });
  let lang = (res.lang || "").trim();
  if (/^[a-z]{2}$/i.test(lang)) lang = { id: "id-ID", en: "en-US", ms: "ms-MY", ja: "ja-JP", de: "de-DE", fr: "fr-FR", es: "es-ES", nl: "nl-NL" }[lang.toLowerCase()] || "en-US";
  return { model: { title: res.title || path.basename(htmlPath).replace(/\.html?$/i, ""), lang, creator: "slideck-html", theme, slides }, stats };
}

function main() {
  const htmlFlag = argOf("html");
  const outFlag = argOf("out");
  const SRC = deckRoot(DIR);

  let htmlPath;
  if (htmlFlag) {
    htmlPath = path.resolve(htmlFlag);
  } else {
    try { htmlPath = deckHtml(SRC, "atau pakai --html <file.html>"); } catch (e) { console.error("  x " + e.message); process.exit(1); }
  }
  const outPath = outFlag ? path.resolve(outFlag) : htmlPath.replace(/\.html?$/i, "") + ".pptx";

  if (!fs.existsSync(htmlPath)) {
    console.error("  x HTML tidak ketemu: " + htmlPath + "\n    jalankan `node build.js` dulu.");
    process.exit(1);
  }
  const browser = findBrowser();
  if (!browser) {
    console.error("  x Chrome / Edge / Chromium tidak ditemukan.\n    Set CHROME_PATH ke path browser, mis. CHROME_PATH=\"C:/Program Files/Google/Chrome/Application/chrome.exe\"");
    process.exit(1);
  }

  /* halaman probe = deck asli + script pengukur sebelum </body> */
  const html = fs.readFileSync(htmlPath, "utf8");
  const inject = "<script>" + OUT_SNIPPET + ";(" + pageProbe.toString() + ")();</script>";
  const at = html.lastIndexOf("</body>");
  const page = at >= 0 ? html.slice(0, at) + inject + html.slice(at) : html + inject;

  let res;
  try {
    res = probe(browser, page, htmlPath, { size: [1920, 1080], budget: 30000, timeout: 240000 });
  } catch (e) {
    console.error("  x gagal mengukur deck lewat " + browser + ": " + e.message);
    if (e.stderr) process.stderr.write(String(e.stderr).split(/\r?\n/).slice(-8).join("\n") + "\n");
    process.exit(1);
  }
  if (res.error) {
    console.error("  x script pengukur gagal di dalam halaman:\n" + res.error);
    process.exit(1);
  }
  if (!res.slides.length) {
    console.error("  x tidak ada elemen .slide di " + htmlPath);
    process.exit(1);
  }

  const warnings = res.warn.slice();
  const warn = (m) => { if (!warnings.includes(m)) warnings.push(m); };
  const { model, stats } = toModel(res, htmlPath, warn);
  const noEmbed = process.argv.includes("--no-embed-fonts");
  const embedded = noEmbed ? [] : applyEmbeddedFonts(model, collectFaces(html, warn));
  const buf = zipWrite(buildPackage(model));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);

  /* baca ulang hasil sendiri: semua part yang dirujuk ada + semua XML well-formed */
  const files = zipRead(fs.readFileSync(outPath));
  const errs = checkPackage(files);
  const slideCount = files.filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f.name)).length;
  const noteCount = files.filter((f) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f.name)).length;

  console.log("slideck-html pptx | " + path.basename(htmlPath) + " → " + path.basename(outPath));
  console.log("  slides=" + slideCount + " | catatan=" + noteCount + " | teks=" + stats.tx + " bentuk=" + stats.sp + " garis=" + stats.ln +
    " tabel=" + stats.tbl + " gambar=" + stats.pic + " (svg vektor=" + stats.svg + ") | " + Math.round(buf.length / 1024) + " KB");
  if (embedded.length) {
    const kb = embedded.reduce((n, g) => n + ["regular", "bold", "italic", "boldItalic"].reduce((m, k) => m + (g[k] ? g[k].length : 0), 0), 0);
    console.log("  font di-embed: " + embedded.map((g) => g.typeface + " (" + ["regular", "bold", "italic", "boldItalic"].filter((k) => g[k]).join("+") + ")").join(", ") +
      " | " + Math.round(kb / 1024) + " KB");
  }
  const embeddedNames = new Set(embedded.map((g) => g.typeface.toLowerCase()));
  const fonts = Object.keys(res.fonts || {}).sort((a, b) => res.fonts[b] - res.fonts[a])
    .filter((f) => !embeddedNames.has(f.toLowerCase()) && !embedded.some((g) => g.typeface.toLowerCase().startsWith(f.toLowerCase() + " ")));
  if (fonts.length) console.log("  font sistem (tidak di-embed" + (noEmbed ? ", --no-embed-fonts" : "") + "): " + fonts.join(", ") + " — harus terpasang di komputer yang membuka file");
  if (res.scale && Math.abs(res.scale - 1) > 0.001) console.log("  ! skala stage " + res.scale.toFixed(4) + " (bukan 1) — koordinat dinormalkan ke 1920x1080");
  warnings.forEach((m) => console.warn("  ! " + m));
  console.log("  -> " + outPath.replace(/\\/g, "/"));

  if (errs.length) {
    console.error("  x paket TIDAK valid (" + errs.length + " masalah):");
    errs.slice(0, 20).forEach((m) => console.error("    - " + m));
    process.exit(1);
  }
  console.log("  paket OK: " + files.length + " part, XML well-formed, semua relasi ada");
  if (slideCount !== res.slides.length) {
    console.warn("  ! jumlah slide pptx (" + slideCount + ") != slide HTML (" + res.slides.length + ")");
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = { pageProbe };
