/* slideck-html lib/chart.js — FROZEN. <chart> → inline SVG saat build. Zero dependency.
   Warna hanya lewat token (--c1..--c6, currentColor) di core.css — tidak ada hex di sini.

   <chart type="bar|hbar|line|area|pie|doughnut" width="1100" height="520"
          [title="..."] [unit="%"] [prefix="Rp "] [stacked] [values="on|off"] [legend="on|off"] [center="..."]>
   labels: Q1, Q2, Q3
   Target: 10, 12, 14
   Realisasi: 9, 13, 12
   </chart>
   Isi boleh juga JSON: {"labels":[...],"series":[{"name":"A","data":[...]}]}
   Pemisah koma; pakai "|" bila label/angka mengandung koma. */
const { esc, escAttr, num, r2, textW, wrapText, niceScale } = require("./util");

const TYPES = ["bar", "hbar", "line", "area", "pie", "doughnut"];
const FS = { tick: 21, val: 21, leg: 22, title: 26 };

function parseData(body) {
  const src = String(body || "").trim();
  if (!src) throw new Error("data kosong");
  if (src[0] === "{") {
    const j = JSON.parse(src);
    const series = (j.series || []).map((s, i) => ({ name: String(s.name === undefined ? "Seri " + (i + 1) : s.name), data: (s.data || []).map(Number) }));
    return { labels: (j.labels || []).map(String), series };
  }
  let labels = null;
  const series = [];
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("%%")) continue;
    const i = line.indexOf(":");
    if (i < 0) throw new Error('baris tanpa ":" → ' + line);
    const key = line.slice(0, i).trim();
    const rest = line.slice(i + 1);
    const parts = (rest.includes("|") ? rest.split("|") : rest.split(",")).map((s) => s.trim());
    if (/^labels?$/i.test(key)) labels = parts;
    else {
      series.push({
        name: key,
        data: parts.map((p) => {
          /* "|" dipakai → angka boleh format lokal (1.234,5) */
          const v = rest.includes("|") && /,\d+$/.test(p) ? p.replace(/\./g, "").replace(",", ".") : p.replace(/\s/g, "");
          return parseFloat(v);
        })
      });
    }
  }
  if (!series.length) throw new Error("tidak ada seri data");
  if (!labels) labels = series[0].data.map((_, k) => String(k + 1));
  return { labels, series };
}

function makeFmt(a, locale) {
  const pre = a.prefix || "";
  const unit = a.unit || "";
  return (v) => {
    let s;
    try { s = Number(v).toLocaleString(locale || "id-ID", { maximumFractionDigits: 2 }); } catch (e) { s = String(v); }
    return pre + s + unit;
  };
}

const sClass = (i) => "s" + ((i % 6) + 1) + (i >= 6 ? " dim" : "");

function legendRow(names, x, y, maxW) {
  /* → { svg, height } — baris legenda, pindah baris bila tidak muat */
  let cx = x, cy = y, out = "";
  names.forEach((n, i) => {
    const w = 26 + 10 + textW(n, FS.leg) + 34;
    if (cx > x && cx + w > x + maxW) { cx = x; cy += 36; }
    out += '<rect class="' + sClass(i) + '" x="' + r2(cx) + '" y="' + r2(cy - 19) + '" width="24" height="24" rx="5"/>' +
      '<text class="lg" x="' + r2(cx + 34) + '" y="' + r2(cy) + '">' + esc(n) + "</text>";
    cx += w;
  });
  return { svg: out, height: cy - y + 36 };
}

function renderChart(attrs, body, ctx) {
  const a = attrs || {};
  const type = (a.type || "bar").toLowerCase();
  if (!TYPES.includes(type)) throw new Error('type tidak dikenal: "' + type + '" (pilih ' + TYPES.join("|") + ")");
  const W = num(a.width, 1100), H = num(a.height, 520);
  const { labels, series } = parseData(body);
  const n = labels.length;
  series.forEach((s) => { while (s.data.length < n) s.data.push(NaN); s.data.length = n; });
  const fmt = makeFmt(a, ctx && ctx.locale);
  const isPie = type === "pie" || type === "doughnut";
  const stacked = "stacked" in a && (type === "bar" || type === "hbar");
  const showLegend = a.legend ? a.legend !== "off" : (isPie || series.length > 1);
  const points = n * series.length;
  const showValues = a.values ? a.values !== "off" : (isPie || points <= 16);

  let g = "";
  let top = 6;
  if (a.title) { g += '<text class="ct" x="0" y="' + (top + 24) + '">' + esc(a.title) + "</text>"; top += 50; }

  if (isPie) {
    const data = series[0].data.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
    const total = data.reduce((p, c) => p + c, 0) || 1;
    const plotH = H - top - 6;
    const R = Math.min(plotH, W * 0.46) / 2;
    const cx = R + 4, cy = top + plotH / 2;
    const inner = type === "doughnut" ? R * 0.6 : 0;
    let ang = -Math.PI / 2;
    data.forEach((v, i) => {
      if (!v) return;
      const sweep = (v / total) * Math.PI * 2;
      const a0 = ang, a1 = ang + sweep; ang = a1;
      const cls = sClass(i);
      if (sweep >= Math.PI * 2 - 1e-6) {
        g += '<circle class="' + cls + '" cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(R) + '"/>';
        if (inner) g += '<circle class="hole" cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(inner) + '"/>';
        return;
      }
      const large = sweep > Math.PI ? 1 : 0;
      const p = (rad, t) => r2(cx + rad * Math.cos(t)) + " " + r2(cy + rad * Math.sin(t));
      let d = "M" + p(R, a0) + "A" + r2(R) + " " + r2(R) + " 0 " + large + " 1 " + p(R, a1);
      d += inner ? "L" + p(inner, a1) + "A" + r2(inner) + " " + r2(inner) + " 0 " + large + " 0 " + p(inner, a0) + "Z" : "L" + r2(cx) + " " + r2(cy) + "Z";
      g += '<path class="' + cls + ' slice" d="' + d + '"/>';
    });
    if (type === "doughnut") {
      const c = a.center !== undefined ? a.center : fmt(total);
      g += '<text class="cn" x="' + r2(cx) + '" y="' + r2(cy) + '" text-anchor="middle" dominant-baseline="central" style="font-size:' + r2(Math.min(72, inner * 0.5)) + 'px">' + esc(c) + "</text>";
    }
    if (showLegend) {
      const lx = cx + R + 56;
      const rowH = Math.min(58, Math.max(34, plotH / Math.max(1, n)));
      let ly = cy - (rowH * n) / 2 + rowH / 2;
      labels.forEach((lab, i) => {
        const pct = Math.round((data[i] / total) * 1000) / 10;
        g += '<rect class="' + sClass(i) + '" x="' + r2(lx) + '" y="' + r2(ly - 13) + '" width="26" height="26" rx="6"/>' +
          '<text class="lg" x="' + r2(lx + 40) + '" y="' + r2(ly) + '" dominant-baseline="central">' + esc(lab) +
          (showValues ? '<tspan class="lgv" dx="14">' + esc(fmt(data[i])) + " · " + String(pct).replace(".", ",") + "%</tspan>" : "") + "</text>";
        ly += rowH;
      });
    }
    return wrap(a, W, H, g, type, labels, series, fmt);
  }

  if (showLegend) {
    const lg = legendRow(series.map((s) => s.name), 0, top + 22, W);
    g += lg.svg; top += lg.height + 6;
  }

  /* rentang nilai */
  let lo = 0, hi = 0;
  if (stacked) {
    for (let i = 0; i < n; i++) {
      let pos = 0, neg = 0;
      series.forEach((s) => { const v = s.data[i]; if (Number.isFinite(v)) { if (v >= 0) pos += v; else neg += v; } });
      hi = Math.max(hi, pos); lo = Math.min(lo, neg);
    }
  } else {
    series.forEach((s) => s.data.forEach((v) => { if (Number.isFinite(v)) { hi = Math.max(hi, v); lo = Math.min(lo, v); } }));
  }
  const sc = niceScale(lo, hi, 5);
  const tickLabels = sc.ticks.map(fmt);

  if (type === "hbar") {
    const maxLab = Math.min(W * 0.34, Math.max(...labels.map((l) => textW(l, FS.leg))) + 6);
    const left = maxLab + 18, right = showValues ? Math.max(...series.flatMap((s) => s.data.map((v) => textW(fmt(v || 0), FS.val, true)))) + 18 : 14;
    const bottom = 44;
    const pw = W - left - right, ph = H - top - bottom;
    const X = (v) => left + ((v - sc.min) / (sc.max - sc.min)) * pw;
    sc.ticks.forEach((t, k) => {
      g += '<line class="grid" x1="' + r2(X(t)) + '" y1="' + r2(top) + '" x2="' + r2(X(t)) + '" y2="' + r2(top + ph) + '"/>' +
        '<text class="tk" x="' + r2(X(t)) + '" y="' + r2(top + ph + 32) + '" text-anchor="middle">' + esc(tickLabels[k]) + "</text>";
    });
    const band = ph / n, gw = band * 0.7;
    const m = stacked ? 1 : series.length;
    const bh = Math.min(64, (gw - (m - 1) * 4) / m);
    for (let i = 0; i < n; i++) {
      const y0 = top + band * i + (band - (bh * m + (m - 1) * 4)) / 2;
      const lines = wrapText(labels[i], FS.leg, maxLab).slice(0, 2);
      lines.forEach((ln, k) => {
        g += '<text class="lg" x="' + r2(left - 16) + '" y="' + r2(top + band * i + band / 2 + (k - (lines.length - 1) / 2) * 26) + '" text-anchor="end" dominant-baseline="central">' + esc(ln) + "</text>";
      });
      let pos = 0, neg = 0;
      series.forEach((s, j) => {
        const v = s.data[i];
        if (!Number.isFinite(v)) return;
        let a0, a1, y;
        if (stacked) { if (v >= 0) { a0 = pos; pos += v; a1 = pos; } else { a0 = neg; neg += v; a1 = neg; } y = y0; }
        else { a0 = 0; a1 = v; y = y0 + j * (bh + 4); }
        const x0 = Math.min(X(a0), X(a1)), w = Math.abs(X(a1) - X(a0));
        g += '<rect class="' + sClass(j) + ' bar" x="' + r2(x0) + '" y="' + r2(y) + '" width="' + r2(w) + '" height="' + r2(bh) + '" rx="' + r2(Math.min(8, bh / 4)) + '"/>';
        if (showValues && !stacked) g += '<text class="vl" x="' + r2(v >= 0 ? X(a1) + 10 : X(a1) - 10) + '" y="' + r2(y + bh / 2) + '" text-anchor="' + (v >= 0 ? "start" : "end") + '" dominant-baseline="central">' + esc(fmt(v)) + "</text>";
      });
      if (showValues && stacked) g += '<text class="vl" x="' + r2(X(pos) + 10) + '" y="' + r2(y0 + bh / 2) + '" dominant-baseline="central">' + esc(fmt(pos + neg)) + "</text>";
    }
    g += '<line class="axis" x1="' + r2(X(0)) + '" y1="' + r2(top) + '" x2="' + r2(X(0)) + '" y2="' + r2(top + ph) + '"/>';
    return wrap(a, W, H, g, type, labels, series, fmt);
  }

  /* bar / line / area: sumbu nilai vertikal */
  const left = Math.max(...tickLabels.map((t) => textW(t, FS.tick))) + 18;
  const right = 10;
  const pwTry = W - left - right;
  const bandTry = pwTry / n;
  const labLines = labels.map((l) => wrapText(l, FS.leg, Math.max(60, bandTry - 10)).slice(0, 2));
  const bottom = 16 + 28 * Math.max(...labLines.map((l) => l.length));
  if (showValues) top += 26;
  const pw = pwTry, ph = H - top - bottom, band = bandTry;
  const Y = (v) => top + ph - ((v - sc.min) / (sc.max - sc.min)) * ph;
  sc.ticks.forEach((t, k) => {
    g += '<line class="grid" x1="' + r2(left) + '" y1="' + r2(Y(t)) + '" x2="' + r2(left + pw) + '" y2="' + r2(Y(t)) + '"/>' +
      '<text class="tk" x="' + r2(left - 12) + '" y="' + r2(Y(t)) + '" text-anchor="end" dominant-baseline="central">' + esc(tickLabels[k]) + "</text>";
  });
  labLines.forEach((lines, i) => {
    lines.forEach((ln, k) => {
      g += '<text class="lg" x="' + r2(left + band * i + band / 2) + '" y="' + r2(top + ph + 34 + k * 28) + '" text-anchor="middle">' + esc(ln) + "</text>";
    });
  });

  if (type === "bar") {
    const gw = band * 0.72;
    const m = stacked ? 1 : series.length;
    const bw = Math.min(150, (gw - (m - 1) * 6) / m);
    const used = bw * m + (m - 1) * 6;
    for (let i = 0; i < n; i++) {
      const x0 = left + band * i + (band - used) / 2;
      let pos = 0, neg = 0;
      series.forEach((s, j) => {
        const v = s.data[i];
        if (!Number.isFinite(v)) return;
        let a0, a1, x;
        if (stacked) { if (v >= 0) { a0 = pos; pos += v; a1 = pos; } else { a0 = neg; neg += v; a1 = neg; } x = x0; }
        else { a0 = 0; a1 = v; x = x0 + j * (bw + 6); }
        const y0 = Math.min(Y(a0), Y(a1)), h = Math.abs(Y(a1) - Y(a0));
        g += '<rect class="' + sClass(j) + ' bar" x="' + r2(x) + '" y="' + r2(y0) + '" width="' + r2(bw) + '" height="' + r2(h) + '" rx="' + r2(Math.min(8, bw / 4, h / 2)) + '"/>';
        if (showValues && !stacked) g += '<text class="vl" x="' + r2(x + bw / 2) + '" y="' + r2(v >= 0 ? Y(a1) - 10 : Y(a1) + 26) + '" text-anchor="middle">' + esc(fmt(v)) + "</text>";
      });
      if (showValues && stacked) g += '<text class="vl" x="' + r2(x0 + bw / 2) + '" y="' + r2(Y(pos) - 10) + '" text-anchor="middle">' + esc(fmt(pos + neg)) + "</text>";
    }
  } else {
    const X = (i) => left + band * i + band / 2;
    series.forEach((s, j) => {
      const pts = s.data.map((v, i) => (Number.isFinite(v) ? [X(i), Y(v)] : null));
      /* potong garis di titik kosong */
      let d = "", runs = [], cur = [];
      pts.forEach((p) => { if (p) cur.push(p); else if (cur.length) { runs.push(cur); cur = []; } });
      if (cur.length) runs.push(cur);
      runs.forEach((run) => {
        d += run.map((p, k) => (k ? "L" : "M") + r2(p[0]) + " " + r2(p[1])).join("");
        if (type === "area") {
          g += '<path class="' + sClass(j) + ' area" d="' + run.map((p, k) => (k ? "L" : "M") + r2(p[0]) + " " + r2(p[1])).join("") +
            "L" + r2(run[run.length - 1][0]) + " " + r2(Y(0)) + "L" + r2(run[0][0]) + " " + r2(Y(0)) + 'Z"/>';
        }
      });
      g += '<path class="l' + ((j % 6) + 1) + ' line" d="' + d + '"/>';
      pts.forEach((p, i) => {
        if (!p) return;
        g += '<circle class="' + sClass(j) + ' dot" cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" r="8"/>';
        if (showValues && series.length <= 2) {
          /* label di sisi yang menjauhi seri lain (di atas bila nilainya lebih tinggi) */
          const other = series.length === 2 ? series[1 - j].data[i] : NaN;
          const above = Number.isFinite(other) ? s.data[i] > other || (s.data[i] === other && j === 0) : true;
          g += '<text class="vl" x="' + r2(p[0]) + '" y="' + r2(p[1] + (above ? -18 : 34)) + '" text-anchor="middle">' + esc(fmt(s.data[i])) + "</text>";
        }
      });
    });
  }
  g += '<line class="axis" x1="' + r2(left) + '" y1="' + r2(Y(0)) + '" x2="' + r2(left + pw) + '" y2="' + r2(Y(0)) + '"/>';
  return wrap(a, W, H, g, type, labels, series, fmt);
}

function wrap(a, W, H, g, type, labels, series, fmt) {
  /* ringkasan teks untuk pembaca layar */
  const desc = series.map((s) => s.name + ": " + labels.map((l, i) => l + " " + (Number.isFinite(s.data[i]) ? fmt(s.data[i]) : "–")).join(", ")).join("; ");
  const cls = "chart chart-" + type + (a.class ? " " + a.class : "");
  const fill = "fit" in a;
  const style = (fill ? "width:100%;height:100%" : "width:" + W + "px;height:" + H + "px") + (a.style ? ";" + a.style : "");
  return '<svg class="' + escAttr(cls) + '" data-chart="' + type + '" viewBox="0 0 ' + W + " " + H + '" style="' + escAttr(style) + '" role="img" aria-label="' +
    escAttr((a.title ? a.title + ". " : "Grafik " + type + ". ") + desc) + '" xmlns="http://www.w3.org/2000/svg">' + g + "</svg>";
}

module.exports = { renderChart, TYPES };
