/* slideck-html lib/diagram.js — FROZEN. <diagram> → SVG inline saat build. Zero dependency.
   Diagram konsep yang tidak bisa digambar Mermaid. Warna hanya lewat class token di core.css (.dg ...).

   <diagram type="venn|matrix|cycle|funnel|pyramid|scale|nested|positioning|gantt" [width="1200"] [height="600"] [key="2"]>
   Judul item: keterangan singkat          ← satu baris per item (keterangan boleh kosong)
   key: 2                                  ← item yang ditonjolkan (1 = pertama; boleh "1,3")
   </diagram>
   Baris khusus per tipe:
     venn    2–3 himpunan;  overlap: teks di irisan tengah
     matrix  tepat 4 kuadran urut kiri-atas, kanan-atas, kiri-bawah, kanan-bawah;  x: judul sumbu datar  y: judul sumbu tegak
     cycle   3–6 tahap searah jarum jam dari atas;  center: teks di tengah
     funnel  2–6 tahap dari atas (lebar) ke bawah (sempit)
     pyramid 2–6 lapis dari puncak ke dasar
     scale   2–7 titik dari kiri ke kanan;  from: label ujung kiri  to: label ujung kanan
     nested  2–4 lingkaran bersarang dari luar ke dalam (TAM, SAM, SOM); keterangan tampil di kanan
     positioning 2–12 titik "Nama: x y" (0–100);  x/y: judul sumbu, atau "ujung rendah | ujung tinggi"
     gantt   1–10 baris "Tugas: 2-4" (periode 2 s.d. 4) atau "Tugas: 5" (tonggak), sisa teks = catatan;  periods: Jan | Feb | … */
const { esc, escAttr, num, r2, textW, wrapText } = require("./util");

const TYPES = ["venn", "matrix", "cycle", "funnel", "pyramid", "scale", "nested", "positioning", "gantt"];
const OPTS = ["key", "x", "y", "from", "to", "center", "overlap", "periods"];
const FS = { tt: 26, td: 22, ax: 22 };
const LH = { tt: 32, td: 28 };

function parse(body) {
  const items = [], opt = {};
  for (const raw of String(body || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("%%")) continue;
    const i = line.indexOf(":");
    const k = (i < 0 ? line : line.slice(0, i)).trim(), v = i < 0 ? "" : line.slice(i + 1).trim();
    if (i >= 0 && OPTS.includes(k.toLowerCase())) { opt[k.toLowerCase()] = v; continue; }
    items.push({ t: k, d: v });
  }
  return { items, opt };
}

const T = (x, y, s, cls, anchor, extra) => '<text class="' + cls + '" x="' + r2(x) + '" y="' + r2(y) + '" text-anchor="' + (anchor || "middle") +
  '" dominant-baseline="central"' + (extra || "") + ">" + esc(s) + "</text>";

/* judul tebal + keterangan, dibungkus ke maxW. o.top = tepi atas (default: dipusatkan di cy). → { svg, h } */
function measure(t, d, maxW) {
  const tl = t ? wrapText(t, FS.tt, maxW, true) : [], dl = d ? wrapText(d, FS.td, maxW) : [];
  return { tl, dl, h: tl.length * LH.tt + (tl.length && dl.length ? 6 : 0) + dl.length * LH.td };
}
function block(x, cy, t, d, maxW, o) {
  o = o || {};
  const m = measure(t, d, maxW), on = o.on ? " on" : "";
  let y = o.top !== undefined ? o.top : cy - m.h / 2, s = "";
  for (const l of m.tl) { s += T(x, y + LH.tt / 2, l, "tt" + on, o.anchor); y += LH.tt; }
  if (m.tl.length && m.dl.length) y += 6;
  for (const l of m.dl) { s += T(x, y + LH.td / 2, l, "td" + on, o.anchor); y += LH.td; }
  return { svg: s, h: m.h };
}
const poly = (pts, cls) => '<path class="' + cls + '" d="M' + pts.map((p) => r2(p[0]) + " " + r2(p[1])).join("L") + 'Z"/>';
/* kepala panah: ujung p, arah u (vektor satuan) */
const head = (p, u, len, half) => poly([p, [p[0] - u[0] * len - u[1] * half, p[1] - u[1] * len + u[0] * half], [p[0] - u[0] * len + u[1] * half, p[1] - u[1] * len - u[0] * half]], "ah");
const keys = (v, n) => new Set(String(v || "").split(/[,\s]+/).map((s) => parseInt(s, 10)).filter((k) => k >= 1 && k <= n));
const need = (items, lo, hi, type) => { if (items.length < lo || items.length > hi) throw new Error(type + " butuh " + lo + "–" + hi + " item, ada " + items.length); };

function venn(items, opt, W, H) {
  need(items, 2, 3, "venn");
  const n = items.length;
  let s = "", C, r, cx = W / 2, cy = H / 2, labelAt, labelW, midW;
  if (n === 2) {
    r = Math.min(H / 2 - 6, W / 3.3);
    const dx = r * 0.62;
    C = [[cx - dx, cy], [cx + dx, cy]];
    labelAt = (i) => [C[i][0] + (i ? 1 : -1) * r * 0.4, cy];
    labelW = r * 0.9; midW = r * 0.66;
  } else {
    r = Math.min((H - 12) / 2.9, W / 3.2);
    const d = r * 0.6;
    cy = H / 2 - 0.15 * r;
    C = [-150, -30, 90].map((deg) => [cx + d * Math.cos(deg * Math.PI / 180), cy + d * Math.sin(deg * Math.PI / 180)]);
    labelAt = (i) => { const ux = (C[i][0] - cx) / d, uy = (C[i][1] - cy) / d; return [C[i][0] + ux * r * 0.42, C[i][1] + uy * r * 0.42]; };
    labelW = r * 0.86; midW = r * 0.5;
  }
  C.forEach((c, i) => { s += '<circle class="v v' + (i + 1) + '" cx="' + r2(c[0]) + '" cy="' + r2(c[1]) + '" r="' + r2(r) + '"/>'; });
  items.forEach((it, i) => { const p = labelAt(i); s += block(p[0], p[1], it.t, it.d, labelW).svg; });
  if (opt.overlap) s += block(cx, n === 2 ? cy : cy, opt.overlap, "", midW).svg;
  return s;
}

function matrix(items, opt, W, H, key) {
  need(items, 4, 4, "matrix");
  const axes = opt.x || opt.y, pl = axes ? 72 : 0, pb = axes ? 64 : 0, gap = 14;
  const gw = W - pl, gh = H - pb, qw = (gw - gap) / 2, qh = (gh - gap) / 2;
  let s = "";
  items.forEach((it, i) => {
    const qx = pl + (i % 2) * (qw + gap), qy = Math.floor(i / 2) * (qh + gap), k = key.has(i + 1);
    s += '<rect class="' + (k ? "k" : "q") + '" x="' + r2(qx) + '" y="' + r2(qy) + '" width="' + r2(qw) + '" height="' + r2(qh) + '" rx="14"/>';
    s += block(qx + 34, 0, it.t, it.d, qw - 68, { top: qy + 30, anchor: "start", on: k }).svg;
  });
  if (opt.y) {
    s += '<line class="ln" x1="34" y1="' + r2(gh) + '" x2="34" y2="12"/>' + head([34, 0], [0, -1], 18, 10);
    s += T(12, gh / 2, opt.y, "ax", "middle", ' transform="rotate(-90 12 ' + r2(gh / 2) + ')"');
  }
  if (opt.x) {
    s += '<line class="ln" x1="' + pl + '" y1="' + r2(gh + 22) + '" x2="' + r2(W - 12) + '" y2="' + r2(gh + 22) + '"/>' + head([W, gh + 22], [1, 0], 18, 10);
    s += T(pl + gw / 2, gh + 50, opt.x, "ax");
  }
  return s;
}

function cycle(items, opt, W, H, key) {
  need(items, 3, 6, "cycle");
  const n = items.length, nw = n > 4 ? 280 : 320;
  const nh = Math.max(...items.map((it) => measure(it.t, it.d, nw - 40).h)) + 40;
  const cx = W / 2, cy = H / 2, rx = W / 2 - nw / 2 - 4, ry = H / 2 - nh / 2 - 4;
  const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / n;
  const at = (a) => [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  const inside = (p, c, m) => Math.abs(p[0] - c[0]) < nw / 2 + m && Math.abs(p[1] - c[1]) < nh / 2 + m;
  let s = "";
  for (let i = 0; i < n; i++) {
    const a0 = ang(i), a1 = ang(i + 1), c0 = at(a0), c1 = at(a1), pts = [];
    for (let k = 0; k <= 120; k++) { const p = at(a0 + (a1 - a0) * k / 120); if (!inside(p, c0, 16) && !inside(p, c1, 22)) pts.push(p); }
    if (pts.length < 3) continue;
    s += '<path class="ln" d="M' + pts.map((p) => r2(p[0]) + " " + r2(p[1])).join("L") + '"/>';
    const e = pts[pts.length - 1], b = pts[pts.length - 3], L = Math.hypot(e[0] - b[0], e[1] - b[1]) || 1;
    s += head([e[0] + (e[0] - b[0]) / L * 12, e[1] + (e[1] - b[1]) / L * 12], [(e[0] - b[0]) / L, (e[1] - b[1]) / L], 20, 11);
  }
  items.forEach((it, i) => {
    const c = at(ang(i)), k = key.has(i + 1);
    s += '<rect class="' + (k ? "k" : "q") + '" x="' + r2(c[0] - nw / 2) + '" y="' + r2(c[1] - nh / 2) + '" width="' + nw + '" height="' + r2(nh) + '" rx="18"/>';
    s += block(c[0], c[1], it.t, it.d, nw - 40, { on: k }).svg;
  });
  if (opt.center) s += block(cx, cy, opt.center, "", Math.min(rx, ry) * 1.1).svg;
  return s;
}

function funnel(items, opt, W, H, key) {
  need(items, 2, 6, "funnel");
  const n = items.length, gap = 10, lh = (H - gap * (n - 1)) / n;
  const side = items.some((it) => it.d), fw = side ? W * 0.56 : W * 0.8, bw = fw * 0.34, x0 = side ? 0 : (W - fw) / 2;
  const wAt = (i) => fw - (fw - bw) * i / n;
  let s = "";
  items.forEach((it, i) => {
    const y = i * (lh + gap), wt = wAt(i), wb = wAt(i + 1), cx = x0 + fw / 2, k = key.has(i + 1);
    s += poly([[cx - wt / 2, y], [cx + wt / 2, y], [cx + wb / 2, y + lh], [cx - wb / 2, y + lh]], k ? "k" : "l" + Math.min(5, i + 1));
    s += block(cx, y + lh / 2, it.t, "", wb - 40, { on: k }).svg;
    if (it.d) s += block(fw + 44, y + lh / 2, "", it.d, W - fw - 44, { anchor: "start" }).svg;
  });
  return s;
}

function pyramid(items, opt, W, H, key) {
  need(items, 2, 6, "pyramid");
  const n = items.length, gap = 8, bh = (H - gap * (n - 1)) / n;
  const fits = (it, i) => textW(it.t, FS.tt, true) <= (W * 0.56) * ((i + 0.5) * (bh + gap)) / H - 40;
  const side = items.some((it, i) => it.d || !fits(it, i)), bw = side ? W * 0.56 : W * 0.7, ax = side ? bw / 2 : W / 2;
  const wAt = (y) => bw * y / H;
  let s = "";
  items.forEach((it, i) => {
    const yt = i * (bh + gap), yb = yt + bh, ym = yt + bh / 2, k = key.has(i + 1);
    const pts = i === 0 ? [[ax, yt], [ax + wAt(yb) / 2, yb], [ax - wAt(yb) / 2, yb]]
      : [[ax - wAt(yt) / 2, yt], [ax + wAt(yt) / 2, yt], [ax + wAt(yb) / 2, yb], [ax - wAt(yb) / 2, yb]];
    s += poly(pts, k ? "k" : "l" + Math.min(5, i + 1));
    const inside = textW(it.t, FS.tt, true) <= wAt(i === 0 ? yt + bh * 0.75 : ym) - 40;
    if (inside) s += T(ax, i === 0 ? yt + bh * 0.66 : ym, it.t, "tt" + (k ? " on" : ""));
    if (side && (!inside || it.d)) {
      const xr = bw + 44;
      s += '<line class="ln thin" x1="' + r2(ax + wAt(ym) / 2 + 12) + '" y1="' + r2(ym) + '" x2="' + r2(xr - 14) + '" y2="' + r2(ym) + '"/>';
      s += block(xr, ym, inside ? "" : it.t, it.d, W - xr, { anchor: "start" }).svg;
    }
  });
  return s;
}

function scale(items, opt, W, key) {
  need(items, 2, 7, "scale");
  const n = items.length, from = opt.from || "", to = opt.to || "";
  const padL = from ? textW(from, FS.ax, true) + 28 : 0, padR = to ? textW(to, FS.ax, true) + 28 : 0;
  const x0 = padL, x1 = W - padR - 40, step = (x1 - x0) / n, bh = 44;
  const titleH = Math.max(...items.map((it) => measure(it.t, "", step - 24).h));
  const by = titleH + 30, mid = by + bh / 2;
  let s = "";
  const segs = 5;
  for (let i = 0; i < segs; i++) {
    const a = x0 + (x1 - x0) * i / segs, b = x0 + (x1 - x0) * (i + 1) / segs + (i < segs - 1 ? 1 : 0);
    s += '<rect class="l' + (5 - i) + '" x="' + r2(a) + '" y="' + r2(by) + '" width="' + r2(b - a) + '" height="' + bh + '"/>';
  }
  s += poly([[x1, by - 16], [x1 + 40, mid], [x1, by + bh + 16]], "l1");
  if (from) s += T(x0 - 16, mid, from, "ax", "end");
  if (to) s += T(x1 + 56, mid, to, "ax", "start");
  let descH = 0;
  items.forEach((it, i) => {
    const x = x0 + step * (i + 0.5), k = key.has(i + 1);
    s += '<circle class="dot' + (k ? " k" : "") + '" cx="' + r2(x) + '" cy="' + r2(mid) + '" r="' + (k ? 18 : 13) + '"/>';
    s += block(x, 0, it.t, "", step - 24, { top: by - 18 - measure(it.t, "", step - 24).h }).svg;
    if (it.d) { const b = block(x, 0, "", it.d, step - 24, { top: by + bh + 22 }); s += b.svg; descH = Math.max(descH, b.h); }
  });
  return { svg: s, H: Math.ceil(by + bh + (descH ? 22 + descH : 16) + 4) };
}

/* lingkaran bersarang (TAM/SAM/SOM): luar → dalam, rata bawah. Judul di pita tiap lingkaran; keterangan di kanan dengan garis penunjuk. */
function nested(items, opt, W, H, key) {
  need(items, 2, 4, "nested");
  const n = items.length, side = items.some((it) => it.d);
  const r0 = Math.min(H / 2, side ? W * 0.21 : W / 2), cx = side ? r0 : W / 2;
  const R = items.map((_, i) => r0 * (1 - i * (n > 3 ? 0.23 : 0.3)));
  const cyOf = (i) => H - R[i];
  const bandY = (i) => (i === n - 1 ? cyOf(i) : (H - 2 * R[i] + H - 2 * R[i + 1]) / 2);
  const fill = (i) => "l" + Math.max(1, 5 - Math.round(i * 4 / (n - 1)));
  let s = "";
  items.forEach((it, i) => {
    s += '<circle class="' + (key.has(i + 1) ? "k" : fill(i)) + '" cx="' + r2(cx) + '" cy="' + r2(cyOf(i)) + '" r="' + r2(R[i]) + '"/>';
  });
  const xr = 2 * r0 + 70;
  items.forEach((it, i) => {
    const y = bandY(i), k = key.has(i + 1), dy = y - cyOf(i), chord = 2 * Math.sqrt(Math.max(0, R[i] * R[i] - dy * dy));
    const inner = i === n - 1 ? chord : Math.min(chord, 2 * Math.sqrt(Math.max(0, R[i] * R[i] - (H - 2 * R[i + 1] - cyOf(i)) ** 2)));
    const fits = textW(it.t, FS.tt, true) <= inner - 36;
    if (fits) s += T(cx, y, it.t, "tt" + (k ? " on" : ""));
    if (side && (it.d || !fits)) {
      const x1 = fits ? cx + textW(it.t, FS.tt, true) / 2 + 18 : cx;
      s += '<line class="ln thin" x1="' + r2(x1) + '" y1="' + r2(y) + '" x2="' + r2(xr - 16) + '" y2="' + r2(y) + '"/>';
      s += block(xr, y, fits ? "" : it.t, it.d, W - xr, { anchor: "start" }).svg;
    }
  });
  return s;
}

/* peta posisi: titik di bidang dua sumbu. "Nama: x y" (0–100). x/y: "kiri | kanan" = label ujung, tanpa "|" = judul sumbu. */
function positioning(items, opt, W, H, key) {
  need(items, 2, 12, "positioning");
  const ends = (v) => (v && v.includes("|") ? v.split("|").map((t) => t.trim()) : null);
  const ex = ends(opt.x), ey = ends(opt.y), pl = opt.y ? 72 : 0, pb = opt.x ? 64 : 0;
  const gw = W - pl, gh = H - pb;
  let s = '<rect class="q" x="' + pl + '" y="0" width="' + r2(gw) + '" height="' + r2(gh) + '" rx="14"/>';
  s += '<line class="ln thin" x1="' + r2(pl + gw / 2) + '" y1="12" x2="' + r2(pl + gw / 2) + '" y2="' + r2(gh - 12) + '"/>';
  s += '<line class="ln thin" x1="' + r2(pl + 12) + '" y1="' + r2(gh / 2) + '" x2="' + r2(W - 12) + '" y2="' + r2(gh / 2) + '"/>';
  if (opt.y) {
    s += '<line class="ln" x1="34" y1="' + r2(gh) + '" x2="34" y2="12"/>' + head([34, 0], [0, -1], 18, 10);
    if (ey) { s += T(12, gh - 4, ey[0], "ax", "start", ' transform="rotate(-90 12 ' + r2(gh - 4) + ')"'); s += T(12, 30, ey[1] || "", "ax", "end", ' transform="rotate(-90 12 30)"'); }
    else s += T(12, gh / 2, opt.y, "ax", "middle", ' transform="rotate(-90 12 ' + r2(gh / 2) + ')"');
  }
  if (opt.x) {
    s += '<line class="ln" x1="' + pl + '" y1="' + r2(gh + 22) + '" x2="' + r2(W - 12) + '" y2="' + r2(gh + 22) + '"/>' + head([W, gh + 22], [1, 0], 18, 10);
    if (ex) { s += T(pl, gh + 50, ex[0], "ax", "start"); s += T(W - 30, gh + 50, ex[1] || "", "ax", "end"); }
    else s += T(pl + gw / 2, gh + 50, opt.x, "ax");
  }
  items.forEach((it, i) => {
    const v = (it.d.match(/-?\d+(?:[.,]\d+)?/g) || []).map((t) => parseFloat(t.replace(",", ".")));
    if (v.length < 2) throw new Error('positioning: "' + it.t + '" butuh dua angka 0–100 (x y)');
    const k = key.has(i + 1), m = 40;
    const x = pl + m + (gw - 2 * m) * Math.max(0, Math.min(100, v[0])) / 100, y = gh - m - (gh - 2 * m) * Math.max(0, Math.min(100, v[1])) / 100;
    const r = k ? 20 : 14, left = x + r + 14 + textW(it.t, FS.tt, true) > W - 12;
    s += '<circle class="dot' + (k ? " k" : "") + '" cx="' + r2(x) + '" cy="' + r2(y) + '" r="' + r + '"/>';
    s += T(left ? x - r - 14 : x + r + 14, y, it.t, "tt", left ? "end" : "start");
  });
  return s;
}

/* gantt: "Tugas: 2-4" (periode ke-2 s.d. 4) atau "Tugas: 5" (tonggak); sisa teks = catatan. periods: Jan | Feb | Mar … */
function gantt(items, opt, W, key) {
  need(items, 1, 10, "gantt");
  const P = String(opt.periods || "").split(/\s*[|,]\s*/).filter(Boolean);
  const rows = items.map((it) => {
    const m = it.d.match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:[-–]\s*(\d+(?:[.,]\d+)?))?\s*(.*)$/);
    if (!m) throw new Error('gantt: "' + it.t + '" butuh periode, mis. "2-4" atau "5"');
    const a = parseFloat(m[1].replace(",", ".")), b = m[2] ? parseFloat(m[2].replace(",", ".")) : null;
    return { t: it.t, a, b, note: m[3].replace(/^[·—–-]\s*/, "").trim() };
  });
  const nP = Math.max(P.length, ...rows.map((r) => Math.ceil(r.b !== null ? r.b : r.a)));
  const lw = Math.min(460, Math.max(...rows.map((r) => textW(r.t, FS.tt, true))) + 36), hh = 52, rh = 72;
  const x0 = lw, cw = (W - x0) / nP, H = hh + rows.length * rh;
  let s = "";
  for (let p = 0; p < nP; p++) {
    const x = x0 + p * cw;
    if (p % 2 === 0) s += '<rect class="q" x="' + r2(x) + '" y="' + hh + '" width="' + r2(cw) + '" height="' + r2(H - hh) + '"/>';
    s += T(x + cw / 2, hh / 2 - 4, P[p] || String(p + 1), "ax");
  }
  rows.forEach((r, i) => {
    const y = hh + i * rh, cy = y + rh / 2, k = key.has(i + 1);
    s += T(0, cy, r.t, "tt", "start");
    let xEnd, xStart;
    if (r.b !== null) {
      xStart = x0 + (r.a - 1) * cw + 6; xEnd = x0 + r.b * cw - 6;
      s += '<rect class="' + (k ? "k" : "l1") + '" x="' + r2(xStart) + '" y="' + r2(y + 16) + '" width="' + r2(Math.max(12, xEnd - xStart)) + '" height="' + (rh - 32) + '" rx="10"/>';
    } else {
      const xm = x0 + (r.a - 0.5) * cw, d = 18; xStart = xm - d; xEnd = xm + d;
      s += poly([[xm, cy - d], [xm + d, cy], [xm, cy + d], [xm - d, cy]], "dot k");
    }
    if (r.note) {
      const right = xEnd + 14 + textW(r.note, FS.td) <= W;
      s += T(right ? xEnd + 14 : xStart - 14, cy, r.note, "td", right ? "start" : "end");
    }
  });
  return { svg: s, H };
}

function renderDiagram(a, body) {
  const type = String(a.type || "").trim();
  if (!TYPES.includes(type)) throw new Error('type "' + type + '" tidak dikenal (' + TYPES.join("|") + ")");
  const { items, opt } = parse(body);
  const W = num(a.width, 1500);
  const DEF_H = { venn: 600, matrix: 600, cycle: 600, funnel: Math.min(600, items.length * 130), pyramid: 580, nested: 560, positioning: 600 };
  let H = num(a.height, DEF_H[type]), g;
  const key = keys(a.key !== undefined ? a.key : opt.key, items.length);
  if (type === "scale" || type === "gantt") { const r = (type === "scale" ? scale : gantt)(items, opt, W, key); g = r.svg; H = num(a.height, r.H); }
  else g = { venn, matrix, cycle, funnel, pyramid, nested, positioning }[type](items, opt, W, H, key);
  const label = "Diagram " + type + ": " + items.map((it) => it.t + (it.d ? " — " + it.d : "")).join("; ");
  const cls = "dg dg-" + type + (a.class ? " " + a.class : "");
  const style = ("fit" in a ? "width:100%;height:100%" : "width:" + W + "px;height:" + H + "px") + (a.style ? ";" + a.style : "");
  return '<svg class="' + escAttr(cls) + '" data-diagram="' + type + '" viewBox="0 0 ' + W + " " + H + '" style="' + escAttr(style) +
    '" role="img" aria-label="' + escAttr(label) + '" xmlns="http://www.w3.org/2000/svg">' + g + "</svg>";
}

module.exports = { renderDiagram, TYPES };
