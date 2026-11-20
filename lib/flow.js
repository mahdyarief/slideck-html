/* slideck-html lib/flow.js — FROZEN. Flowchart Mermaid → SVG inline saat build. Zero dependency.
   Bukan mermaid.js: parser + layout berlapis sendiri untuk SUBSET sintaks flowchart:

   <pre class="mermaid" [data-width="1720"] [data-height="620"]>
   flowchart LR
     A[Mulai] --> B{Valid?}
     B -->|ya| C(Proses)
     B -- tidak --> D[(Arsip)]
     C & D --> E([Selesai])
   </pre>

   Didukung: graph/flowchart TD|TB|BT|LR|RL · node [] () ([]) [[]] [()] (()) {} {{}} [/ /] [/ \] >] ·
   edge --> --- -.-> ==> ~~~ <--> --o --x, teks |..| atau "-- teks -->", panjang (--->), rantai, "&" ·
   subgraph ... end · komentar %% · classDef/class/style/linkStyle/click diabaikan.
   Diagram lain (sequence, gantt, …) tidak didukung → build memberi peringatan dan membiarkan <pre>.
   Warna lewat class token di core.css — tidak ada hex di sini. */
const { esc, escAttr, unesc, num, r2, textW, wrapText } = require("./util");

const FS = 24, LH = 30, PADX = 26, PADY = 18;

/* ---------- parser ---------- */
const BRACKETS = [
  ["([", ["])"], "stadium"], ["[[", ["]]"], "subroutine"], ["[(", [")]"], "cylinder"],
  ["(((", [")))"], "circle"], ["((", ["))"], "circle"], ["{{", ["}}"], "hexagon"],
  ["[/", ["/]", "\\]"], "slant"], ["[\\", ["\\]", "/]"], "slant"],
  [">", ["]"], "flag"], ["[", ["]"], "rect"], ["(", [")"], "round"], ["{", ["}"], "diamond"]
];

function cleanLabel(s) {
  s = String(s).trim();
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') s = s.slice(1, -1);
  if (s.length >= 2 && s[0] === "`" && s[s.length - 1] === "`") s = s.slice(1, -1);
  s = s.replace(/<br\s*\/?>/gi, "\n").replace(/\\n/g, "\n").replace(/<[^>]+>/g, "");
  s = s.replace(/#quot;/g, '"').replace(/#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  return unesc(s).replace(/\*\*/g, "").trim();
}

function splitStatements(src) {
  const out = [];
  let cur = "", depth = 0, q = false;
  for (const ch of src) {
    if (ch === '"') q = !q;
    if (!q) {
      if ("[({".includes(ch)) depth++;
      else if ("])}".includes(ch)) depth = Math.max(0, depth - 1);
    }
    if ((ch === "\n" || (ch === ";" && !q && depth === 0))) { out.push(cur); cur = ""; if (ch === "\n") { depth = 0; q = false; } }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

function parseFlow(source) {
  const src = unesc(String(source).replace(/\r/g, "")).split("\n").filter((l) => !l.trim().startsWith("%%")).join("\n");
  const stmts = splitStatements(src);
  if (!stmts.length) throw new Error("diagram kosong");
  const head = /^(graph|flowchart)(?:\s+(TD|TB|BT|LR|RL))?\s*$/i.exec(stmts[0]);
  if (!head) throw new Error('hanya flowchart yang didukung (baris pertama: "' + stmts[0].slice(0, 40) + '")');
  const dir = (head[2] || "TD").toUpperCase().replace("TB", "TD");
  const nodes = new Map();
  const edges = [];
  const subgraphs = [];
  const stack = [];

  const touch = (id, label, shape) => {
    let n = nodes.get(id);
    if (!n) { n = { id, label: id, shape: "rect", sg: null }; nodes.set(id, n); }
    if (label !== undefined) { n.label = label; n.shape = shape; }
    if (stack.length) n.sg = stack[stack.length - 1];
    return n;
  };

  function readNode(s, i) {
    while (s[i] === " " || s[i] === "\t") i++;
    const m = /^[\wÀ-￿]+/.exec(s.slice(i));
    if (!m) return null;
    const id = m[0];
    i += id.length;
    let label, shape;
    for (const [open, closers, kind] of BRACKETS) {
      if (!s.startsWith(open, i)) continue;
      const start = i + open.length;
      let best = -1, bestC = "";
      let from = start;
      /* label ber-kutip: lompat ke kutip penutup dulu */
      const lead = /^\s*"/.exec(s.slice(start));
      if (lead) { const qEnd = s.indexOf('"', start + lead[0].length); if (qEnd > 0) from = qEnd + 1; }
      for (const c of closers) {
        const k = s.indexOf(c, from);
        if (k >= 0 && (best < 0 || k < best)) { best = k; bestC = c; }
      }
      if (best < 0) continue;
      label = cleanLabel(s.slice(start, best));
      shape = kind === "slant" ? (open[1] === bestC[0] ? "parallelogram" : "trapezoid") : kind;
      i = best + bestC.length;
      break;
    }
    const cls = /^:::[\w-]+/.exec(s.slice(i));
    if (cls) i += cls[0].length;
    touch(id, label, shape);
    return { id, next: i };
  }

  function readGroup(s, i) {
    const ids = [];
    for (;;) {
      const n = readNode(s, i);
      if (!n) return null;
      ids.push(n.id); i = n.next;
      const amp = /^\s*&/.exec(s.slice(i));
      if (!amp) break;
      i += amp[0].length;
    }
    return { ids, next: i };
  }

  function readEdge(s, i) {
    const rest = s.slice(i);
    const m = /^\s*(<|x(?=-)|o(?=-))?(-{2,}|={2,}|-\.+-?|~{3,})(>|x(?![\w])|o(?![\w]))?/.exec(rest);
    if (!m) return null;
    let body = m[2], headEnd = m[3] || "", label = "";
    let j = i + m[0].length;
    const openText = !headEnd && (body === "--" || body === "==" || /^-\.+$/.test(body));
    if (openText) {
      const tail = /(-{2,}|={2,}|\.+-)(>|x(?![\w])|o(?![\w]))?/.exec(s.slice(j));
      if (!tail) return null;
      label = cleanLabel(s.slice(j, j + tail.index));
      headEnd = tail[2] || "";
      body = body + tail[1];
      j += tail.index + tail[0].length;
    }
    const pipe = /^\s*\|([^|]*)\|/.exec(s.slice(j));
    if (pipe) { label = cleanLabel(pipe[1]); j += pipe[0].length; }
    const style = body[0] === "=" ? "thick" : body[0] === "~" ? "invisible" : body.includes(".") ? "dotted" : "solid";
    let minlen = 1;
    if (!openText && (style === "solid" || style === "thick")) minlen = Math.max(1, body.length - (headEnd ? 1 : 2));
    return { label, style, minlen, start: m[1] === "<", end: headEnd === ">" || (!!headEnd), next: j };
  }

  for (let k = 1; k < stmts.length; k++) {
    const s = stmts[k];
    if (/^(classDef|class|style|linkStyle|click|direction|accTitle|accDescr)\b/.test(s)) continue;
    if (/^end\s*$/.test(s)) { stack.pop(); continue; }
    const sg = /^subgraph\s*(.*)$/.exec(s);
    if (sg) {
      const t = sg[1].trim();
      const m = /^([\wÀ-￿-]+)\s*\[(.*)\]\s*$/.exec(t);
      const g = { id: m ? m[1] : "sg" + subgraphs.length, title: cleanLabel(m ? m[2] : t), parent: stack.length ? stack[stack.length - 1] : null };
      subgraphs.push(g); stack.push(g);
      continue;
    }
    let grp = readGroup(s, 0);
    if (!grp) throw new Error('baris tidak dikenali: "' + s.slice(0, 60) + '"');
    for (;;) {
      const e = readEdge(s, grp.next);
      if (!e) break;
      const to = readGroup(s, e.next);
      if (!to) throw new Error('edge tanpa tujuan: "' + s.slice(0, 60) + '"');
      for (const a of grp.ids) for (const b of to.ids) edges.push({ from: a, to: b, label: e.label, style: e.style, minlen: e.minlen, start: e.start, end: e.end });
      grp = to;
    }
    if (s.slice(grp.next).trim()) throw new Error('sisa tidak dikenali: "' + s.slice(grp.next).trim().slice(0, 40) + '"');
  }
  if (!nodes.size) throw new Error("tidak ada node");
  return { dir, nodes, edges, subgraphs };
}

/* ---------- ukuran node ---------- */
function measure(n) {
  n.lines = wrapText(n.label, FS, 300, true);
  const tw = Math.max(...n.lines.map((l) => textW(l, FS, true)));
  let w = Math.max(110, tw + PADX * 2), h = Math.max(66, n.lines.length * LH + PADY * 2);
  switch (n.shape) {
    case "diamond": w = w * 1.35 + 20; h = h * 1.35 + 24; break;
    case "circle": w = h = Math.max(w, h) + 6; break;
    case "hexagon": case "parallelogram": case "trapezoid": case "flag": w += h * 0.5; break;
    case "stadium": w += h * 0.35; break;
    case "cylinder": h += 26; break;
    case "subroutine": w += 28; break;
  }
  n.w = Math.round(w); n.h = Math.round(h);
}

/* ---------- layout berlapis ---------- */
function layout(g) {
  const horiz = g.dir === "LR" || g.dir === "RL";
  const N = new Map();
  for (const n of g.nodes.values()) { measure(n); N.set(n.id, n); }
  const hasLabels = g.edges.some((e) => e.label);
  const maxLabW = Math.max(0, ...g.edges.map((e) => (e.label ? Math.max(...wrapText(e.label, 21, 220).map((l) => textW(l, 21))) : 0)));
  const rankSep = horiz ? 70 + (hasLabels ? Math.min(150, maxLabW * 0.75) : 0) : 64 + (hasLabels ? 36 : 0);
  const nodeSep = horiz ? 30 : 44;

  /* 1. buang siklus (DFS; back-edge dibalik) */
  const outE = new Map();
  for (const id of N.keys()) outE.set(id, []);
  const real = g.edges.filter((e) => e.from !== e.to);
  const loops = g.edges.filter((e) => e.from === e.to);
  real.forEach((e) => outE.get(e.from).push(e));
  const st = new Map();
  const dfs = (u) => {
    st.set(u, 1);
    for (const e of outE.get(u)) {
      if (st.get(e.to) === 1) e.rev = true;
      else if (!st.get(e.to)) dfs(e.to);
    }
    st.set(u, 2);
  };
  for (const id of N.keys()) if (!st.get(id)) dfs(id);
  real.forEach((e) => { e.a = e.rev ? e.to : e.from; e.b = e.rev ? e.from : e.to; });

  /* 2. rank: longest path (Kahn) */
  const indeg = new Map(), succ = new Map(), pred = new Map();
  for (const id of N.keys()) { indeg.set(id, 0); succ.set(id, []); pred.set(id, []); }
  real.forEach((e) => { indeg.set(e.b, indeg.get(e.b) + 1); succ.get(e.a).push(e); pred.get(e.b).push(e); });
  const rank = new Map();
  const queue = [...N.keys()].filter((id) => !indeg.get(id));
  queue.forEach((id) => rank.set(id, 0));
  const topo = [];
  while (queue.length) {
    const u = queue.shift(); topo.push(u);
    for (const e of succ.get(u)) {
      rank.set(e.b, Math.max(rank.get(e.b) || 0, rank.get(u) + e.minlen));
      indeg.set(e.b, indeg.get(e.b) - 1);
      if (!indeg.get(e.b)) queue.push(e.b);
    }
  }
  for (const id of N.keys()) if (!rank.has(id)) rank.set(id, 0);
  /* tarik sumber mendekati anaknya supaya edge pendek */
  for (let i = topo.length - 1; i >= 0; i--) {
    const u = topo[i];
    if (!pred.get(u).length && succ.get(u).length) rank.set(u, Math.min(...succ.get(u).map((e) => rank.get(e.b) - e.minlen)));
  }
  const minRank = Math.min(...rank.values());
  for (const [k, v] of rank) rank.set(k, v - minRank);

  /* 3. dummy node untuk edge panjang */
  const V = new Map(); /* id → {id, rank, w, h, dummy} */
  for (const n of N.values()) V.set(n.id, { id: n.id, rank: rank.get(n.id), w: n.w, h: n.h, dummy: false, sg: n.sg });
  const segs = [];
  let dc = 0;
  real.forEach((e) => {
    const chain = [e.a];
    for (let r = rank.get(e.a) + 1; r < rank.get(e.b); r++) {
      const id = "\u0000d" + dc++;
      V.set(id, { id, rank: r, w: 0, h: 0, dummy: true, sg: null });
      chain.push(id);
    }
    chain.push(e.b);
    e.chain = chain;
    for (let i = 0; i + 1 < chain.length; i++) segs.push([chain[i], chain[i + 1]]);
  });
  const maxR = Math.max(...[...V.values()].map((v) => v.rank));
  const up = new Map(), down = new Map();
  for (const id of V.keys()) { up.set(id, []); down.set(id, []); }
  segs.forEach(([a, b]) => { down.get(a).push(b); up.get(b).push(a); });

  /* 4. urutan dalam layer: DFS awal + sapuan barycenter, simpan yang paling sedikit silangan */
  let layers = Array.from({ length: maxR + 1 }, () => []);
  const seen = new Set();
  const visit = (id) => { if (seen.has(id)) return; seen.add(id); layers[V.get(id).rank].push(id); down.get(id).forEach(visit); };
  const sgIndex = (id) => { const s = V.get(id).sg; return s ? g.subgraphs.indexOf(s) : -1; };
  [...V.keys()].filter((id) => !V.get(id).dummy).sort((a, b) => sgIndex(a) - sgIndex(b)).forEach(visit);
  [...V.keys()].forEach(visit);
  const posOf = (ls) => { const p = new Map(); ls.forEach((l) => l.forEach((id, i) => p.set(id, i))); return p; };
  const crossings = (ls) => {
    const p = posOf(ls);
    let c = 0;
    for (let r = 0; r < ls.length - 1; r++) {
      const es = [];
      ls[r].forEach((u) => down.get(u).forEach((v) => es.push([p.get(u), p.get(v)])));
      for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
        if ((es[i][0] - es[j][0]) * (es[i][1] - es[j][1]) < 0) c++;
      }
    }
    return c;
  };
  let best = layers.map((l) => l.slice()), bestC = crossings(layers);
  for (let it = 0; it < 24 && bestC > 0; it++) {
    const p = posOf(layers);
    const sortBy = (r, nb) => {
      const key = new Map();
      layers[r].forEach((id, i) => {
        const ns = nb.get(id);
        key.set(id, ns.length ? ns.reduce((s, x) => s + p.get(x), 0) / ns.length : i);
      });
      layers[r] = layers[r].map((id, i) => [id, i]).sort((x, y) => key.get(x[0]) - key.get(y[0]) || x[1] - y[1]).map((x) => x[0]);
      layers[r].forEach((id, i) => p.set(id, i));
    };
    if (it % 2 === 0) for (let r = 1; r <= maxR; r++) sortBy(r, up);
    else for (let r = maxR - 1; r >= 0; r--) sortBy(r, down);
    const c = crossings(layers);
    if (c < bestC) { bestC = c; best = layers.map((l) => l.slice()); }
  }
  layers = best;

  /* 5. koordinat. sumbu "o" = sepanjang layer, sumbu "r" = arah rank */
  const so = (v) => (v.dummy ? 0 : horiz ? v.h : v.w);
  const sr = (v) => (v.dummy ? 0 : horiz ? v.w : v.h);
  const O = new Map();
  layers.forEach((l) => { let x = 0; l.forEach((id) => { const v = V.get(id); O.set(id, x + so(v) / 2); x += so(v) + nodeSep; }); });
  const place = (l, desired) => {
    const off = [];
    let acc = 0;
    l.forEach((id, i) => { if (i) acc += so(V.get(l[i - 1])) / 2 + nodeSep + so(V.get(id)) / 2; off.push(acc); });
    const blocks = [];
    l.forEach((id, i) => {
      let b = { sum: desired[i] - off[i], n: 1, first: i };
      while (blocks.length && blocks[blocks.length - 1].sum / blocks[blocks.length - 1].n > b.sum / b.n) {
        const q = blocks.pop(); b = { sum: q.sum + b.sum, n: q.n + b.n, first: q.first };
      }
      blocks.push(b);
    });
    blocks.forEach((b, bi) => {
      const end = bi + 1 < blocks.length ? blocks[bi + 1].first : l.length;
      for (let i = b.first; i < end; i++) O.set(l[i], b.sum / b.n + off[i]);
    });
  };
  const want = (id, nbs) => { const ns = nbs.flatMap((m) => m.get(id)); return ns.length ? ns.reduce((s, x) => s + O.get(x), 0) / ns.length : O.get(id); };
  for (let it = 0; it < 14; it++) {
    const both = it >= 10;
    if (it % 2 === 0) for (let r = both ? 0 : 1; r <= maxR; r++) place(layers[r], layers[r].map((id) => want(id, both ? [up, down] : [up])));
    else for (let r = both ? maxR : maxR - 1; r >= 0; r--) place(layers[r], layers[r].map((id) => want(id, both ? [up, down] : [down])));
  }
  /* ruang ekstra di tepi subgraph: kotak + judul subgraph tidak boleh ditabrak edge yang masuk/keluar */
  const sgRanks = g.subgraphs.map((s) => {
    const rs = [...N.values()].filter((n) => { for (let q = n.sg; q; q = q.parent) if (q === s) return true; return false; }).map((n) => V.get(n.id).rank);
    return rs.length ? [Math.min(...rs), Math.max(...rs), s.title] : null;
  }).filter(Boolean);
  const before = (r) => sgRanks.reduce((m, [a, , t]) => (a === r && r > 0 ? m + (horiz ? 26 : 26 + (t ? 30 : 0)) : m), 0);
  const after = (r) => sgRanks.reduce((m, [, b]) => (b === r && r < maxR ? m + 26 : m), 0);
  const rStart = [], rSize = [];
  let rAcc = 0;
  layers.forEach((l, r) => {
    const t = Math.max(0, ...l.map((id) => sr(V.get(id))));
    rAcc += before(r);
    rStart[r] = rAcc; rSize[r] = t; rAcc += t + rankSep + after(r);
  });
  const Rtotal = rAcc - rankSep;
  const Rc = (id) => { const r = V.get(id).rank; return rStart[r] + rSize[r] / 2; };
  const flip = g.dir === "BT" || g.dir === "RL";
  const XY = (o, r) => { const rr = flip ? Rtotal - r : r; return horiz ? [rr, o] : [o, rr]; };
  const sign = flip ? -1 : 1;

  const outNodes = [];
  for (const n of N.values()) { const [x, y] = XY(O.get(n.id), Rc(n.id)); n.x = x; n.y = y; outNodes.push(n); }

  /* 6. rute edge */
  const outEdges = real.map((e) => {
    const pts = [];
    e.chain.forEach((id, i) => {
      const v = V.get(id), o = O.get(id), rc = Rc(id);
      if (v.dummy) { pts.push([o, rStart[v.rank]], [o, rStart[v.rank] + rSize[v.rank]]); }
      else if (i === 0) pts.push([o, rc + sr(v) / 2]);
      else pts.push([o, rc - sr(v) / 2]);
    });
    /* arah panah mengikuti arah asli edge */
    const headAtEnd = e.rev ? e.start : e.end, headAtStart = e.rev ? e.end : e.start;
    const HL = 15;
    if (headAtEnd) pts[pts.length - 1][1] -= HL * 0.9;
    if (headAtStart) pts[0][1] += HL * 0.9;
    const P = pts.map((p) => XY(p[0], p[1]));
    let d = "M" + r2(P[0][0]) + " " + r2(P[0][1]);
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      if (Math.abs(a[0] - b[0]) < 0.5 || Math.abs(a[1] - b[1]) < 0.5) d += "L" + r2(b[0]) + " " + r2(b[1]);
      else if (horiz) { const m = (a[0] + b[0]) / 2; d += "C" + r2(m) + " " + r2(a[1]) + " " + r2(m) + " " + r2(b[1]) + " " + r2(b[0]) + " " + r2(b[1]); }
      else { const m = (a[1] + b[1]) / 2; d += "C" + r2(a[0]) + " " + r2(m) + " " + r2(b[0]) + " " + r2(m) + " " + r2(b[0]) + " " + r2(b[1]); }
    }
    const heads = [];
    const head = (p, dirSign) => {
      /* segitiga menunjuk ke +r (dirSign 1) atau -r (dirSign -1), ujung di p + HL*0.9 */
      const tip = [p[0], p[1] + dirSign * HL * 0.9], bl = [p[0] - 7.5, p[1] - dirSign * HL * 0.1], br = [p[0] + 7.5, p[1] - dirSign * HL * 0.1];
      heads.push("M" + [tip, bl, br].map((q) => XY(q[0], q[1])).map((q) => r2(q[0]) + " " + r2(q[1])).join("L") + "Z");
    };
    if (headAtEnd) head(pts[pts.length - 1], 1);
    if (headAtStart) head(pts[0], -1);
    const mid = pts.length % 2 ? pts[(pts.length - 1) / 2] : [(pts[pts.length / 2 - 1][0] + pts[pts.length / 2][0]) / 2, (pts[pts.length / 2 - 1][1] + pts[pts.length / 2][1]) / 2];
    return { d, heads, style: e.style, label: e.label, lp: XY(mid[0], mid[1]) };
  });
  loops.forEach((e) => {
    const n = N.get(e.from), x = n.x + n.w / 2, y = n.y;
    outEdges.push({
      d: "M" + r2(x) + " " + r2(y - 12) + "C" + r2(x + 56) + " " + r2(y - 44) + " " + r2(x + 56) + " " + r2(y + 44) + " " + r2(x + 12) + " " + r2(y + 13),
      heads: ["M" + r2(x) + " " + r2(y + 12) + "L" + r2(x + 16) + " " + r2(y + 6) + "L" + r2(x + 13) + " " + r2(y + 22) + "Z"],
      style: e.style, label: e.label, lp: [x + 50, y]
    });
  });

  /* 7. kotak subgraph */
  const boxes = [];
  const inSg = (n, sgr) => { for (let s = n.sg; s; s = s.parent) if (s === sgr) return true; return false; };
  g.subgraphs.slice().reverse().forEach((s) => {
    const ms = outNodes.filter((n) => inSg(n, s));
    if (!ms.length) return;
    let x0 = Math.min(...ms.map((n) => n.x - n.w / 2)), x1 = Math.max(...ms.map((n) => n.x + n.w / 2));
    let y0 = Math.min(...ms.map((n) => n.y - n.h / 2)), y1 = Math.max(...ms.map((n) => n.y + n.h / 2));
    boxes.filter((b) => b.sg.parent === s).forEach((b) => { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); });
    const pad = 22, tw = textW(s.title, 20, true) + 2 * pad;
    const w = Math.max(x1 - x0 + 2 * pad, tw);
    boxes.push({ sg: s, x: x0 - pad - (w - (x1 - x0 + 2 * pad)) / 2, y: y0 - pad - (s.title ? 30 : 0), w, h: y1 - y0 + 2 * pad + (s.title ? 30 : 0), title: s.title });
  });
  boxes.reverse();
  return { nodes: outNodes, edges: outEdges, boxes };
}

/* ---------- SVG ---------- */
function nodePath(n) {
  const w = n.w, h = n.h, x = n.x - w / 2, y = n.y - h / 2;
  const poly = (pts) => '<path class="fl-s" d="M' + pts.map((p) => r2(x + p[0]) + " " + r2(y + p[1])).join("L") + 'Z"/>';
  const rect = (rx) => '<rect class="fl-s" x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(w) + '" height="' + r2(h) + '" rx="' + r2(rx) + '"/>';
  switch (n.shape) {
    case "round": return rect(22);
    case "stadium": return rect(h / 2);
    case "subroutine": return rect(6) + '<path class="fl-i" d="M' + r2(x + 14) + " " + r2(y) + "V" + r2(y + h) + "M" + r2(x + w - 14) + " " + r2(y) + "V" + r2(y + h) + '"/>';
    case "circle": return '<ellipse class="fl-s" cx="' + r2(n.x) + '" cy="' + r2(n.y) + '" rx="' + r2(w / 2) + '" ry="' + r2(h / 2) + '"/>';
    case "diamond": return poly([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]);
    case "hexagon": return poly([[0, h / 2], [h * 0.25, 0], [w - h * 0.25, 0], [w, h / 2], [w - h * 0.25, h], [h * 0.25, h]]);
    case "parallelogram": return poly([[h * 0.25, 0], [w, 0], [w - h * 0.25, h], [0, h]]);
    case "trapezoid": return poly([[h * 0.25, 0], [w - h * 0.25, 0], [w, h], [0, h]]);
    case "flag": return poly([[0, 0], [w, 0], [w, h], [0, h], [h * 0.3, h / 2]]);
    case "cylinder": {
      const ry = 13;
      return '<path class="fl-s" d="M' + r2(x) + " " + r2(y + ry) + "A" + r2(w / 2) + " " + ry + " 0 0 1 " + r2(x + w) + " " + r2(y + ry) + "V" + r2(y + h - ry) +
        "A" + r2(w / 2) + " " + ry + " 0 0 1 " + r2(x) + " " + r2(y + h - ry) + 'Z"/><path class="fl-i" d="M' + r2(x) + " " + r2(y + ry) + "A" + r2(w / 2) + " " + ry + " 0 0 0 " + r2(x + w) + " " + r2(y + ry) + '"/>';
    }
    default: return rect(10);
  }
}

function textLines(lines, cx, cy, cls, lh) {
  const y0 = cy - ((lines.length - 1) * lh) / 2;
  return '<text class="' + cls + '" text-anchor="middle">' + lines.map((l, i) =>
    '<tspan x="' + r2(cx) + '" y="' + r2(y0 + i * lh) + '" dominant-baseline="central">' + esc(l) + "</tspan>").join("") + "</text>";
}

function renderFlow(source, attrs) {
  const a = attrs || {};
  const g = parseFlow(source);
  const L = layout(g);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (ax, ay, bx, by) => { x0 = Math.min(x0, ax); y0 = Math.min(y0, ay); x1 = Math.max(x1, bx); y1 = Math.max(y1, by); };
  L.nodes.forEach((n) => grow(n.x - n.w / 2, n.y - n.h / 2, n.x + n.w / 2, n.y + n.h / 2));
  L.boxes.forEach((b) => grow(b.x, b.y, b.x + b.w, b.y + b.h));
  let body = "";
  L.boxes.forEach((b) => {
    body += '<g class="fl-sg"><rect x="' + r2(b.x) + '" y="' + r2(b.y) + '" width="' + r2(b.w) + '" height="' + r2(b.h) + '" rx="16"/>' +
      (b.title ? '<text x="' + r2(b.x + 20) + '" y="' + r2(b.y + 30) + '">' + esc(b.title) + "</text>" : "") + "</g>";
  });
  let labels = "";
  L.edges.forEach((e) => {
    if (e.style !== "invisible") {
      body += '<path class="fl-e fl-' + e.style + '" d="' + e.d + '"/>' + e.heads.map((h) => '<path class="fl-h" d="' + h + '"/>').join("");
    }
    if (e.label) {
      const lines = wrapText(e.label, 21, 220);
      const w = Math.max(...lines.map((l) => textW(l, 21))) + 18, h = lines.length * 26 + 8;
      grow(e.lp[0] - w / 2, e.lp[1] - h / 2, e.lp[0] + w / 2, e.lp[1] + h / 2);
      labels += '<rect class="fl-lb" x="' + r2(e.lp[0] - w / 2) + '" y="' + r2(e.lp[1] - h / 2) + '" width="' + r2(w) + '" height="' + r2(h) + '" rx="6"/>' +
        textLines(lines, e.lp[0], e.lp[1], "fl-lt", 26);
    }
  });
  L.nodes.forEach((n) => {
    body += '<g class="fl-n fl-' + n.shape + '">' + nodePath(n) + textLines(n.lines, n.x, n.shape === "cylinder" ? n.y + 8 : n.y, "fl-t", LH) + "</g>";
  });
  body += labels;
  const m = 6;
  x0 -= m; y0 -= m; x1 += m; y1 += m;
  const natW = x1 - x0, natH = y1 - y0;
  const boxW = num(a.width, 1720), boxH = num(a.height, 620);
  const k = Math.min(boxW / natW, boxH / natH, 1);
  const summary = "Diagram alur: " + L.nodes.map((n) => n.label.replace(/\n/g, " ")).join(", ");
  return '<svg class="flow' + (a.class ? " " + escAttr(a.class) : "") + '" data-flow="' + g.dir + '" viewBox="' + r2(x0) + " " + r2(y0) + " " + r2(natW) + " " + r2(natH) +
    '" style="width:' + r2(natW * k) + "px;height:" + r2(natH * k) + 'px" role="img" aria-label="' + escAttr(summary) + '" xmlns="http://www.w3.org/2000/svg">' + body + "</svg>";
}

module.exports = { renderFlow, parseFlow };
