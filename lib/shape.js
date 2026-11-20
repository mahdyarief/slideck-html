/* slideck-html lib/shape.js — FROZEN. <shape> dan <connector> → SVG inline saat build. Zero dependency.
   Geometri mengikuti preset OOXML (data-prst = nama preset PowerPoint) supaya `node pptx.js`
   bisa mengekspornya sebagai shape asli. Warna lewat class token di core.css — tidak ada hex di sini.

   <shape type="chevron" w="360" h="120" [fill="teal|navy|grey|mint|surface|ink|none"] [line="none|teal|ink|navy|line"]
          [x="100" y="400"] [rot="15"] [size="26"] [id="a"] [class="reveal"]>Teks</shape>
   <connector from="#a" to="#b" [type="straight|elbow|curve"] [arrow="end|start|both|none"] [label="..."] [dash]>
   <connector x1="100" y1="500" x2="900" y2="500">   (koordinat stage, relatif ke slide) */
const { escAttr, num, r2 } = require("./util");

const P = (pts) => "M" + pts.map((p) => r2(p[0]) + " " + r2(p[1])).join("L") + "Z";
const roundRect = (w, h, r) => {
  r = Math.min(r, w / 2, h / 2);
  return "M" + r2(r) + " 0H" + r2(w - r) + "A" + r2(r) + " " + r2(r) + " 0 0 1 " + r2(w) + " " + r2(r) + "V" + r2(h - r) +
    "A" + r2(r) + " " + r2(r) + " 0 0 1 " + r2(w - r) + " " + r2(h) + "H" + r2(r) + "A" + r2(r) + " " + r2(r) + " 0 0 1 0 " + r2(h - r) +
    "V" + r2(r) + "A" + r2(r) + " " + r2(r) + " 0 0 1 " + r2(r) + " 0Z";
};

/* nama → { prst, adj?, d(w,h), pad(w,h) → [atas, kanan, bawah, kiri] px untuk kotak teks } */
const SHAPES = {
  rect: { prst: "rect", d: (w, h) => P([[0, 0], [w, 0], [w, h], [0, h]]), pad: () => [10, 18, 10, 18] },
  round: { prst: "roundRect", d: (w, h) => roundRect(w, h, Math.min(w, h) * 0.16667), pad: () => [10, 20, 10, 20] },
  pill: { prst: "roundRect", adj: "50000", d: (w, h) => roundRect(w, h, Math.min(w, h) / 2), pad: (w, h) => [8, Math.min(w, h) * 0.3, 8, Math.min(w, h) * 0.3] },
  ellipse: {
    prst: "ellipse",
    d: (w, h) => "M0 " + r2(h / 2) + "A" + r2(w / 2) + " " + r2(h / 2) + " 0 1 1 " + r2(w) + " " + r2(h / 2) + "A" + r2(w / 2) + " " + r2(h / 2) + " 0 1 1 0 " + r2(h / 2) + "Z",
    pad: (w, h) => [h * 0.15, w * 0.15, h * 0.15, w * 0.15]
  },
  diamond: { prst: "diamond", d: (w, h) => P([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]), pad: (w, h) => [h * 0.25, w * 0.25, h * 0.25, w * 0.25] },
  hexagon: {
    prst: "hexagon",
    d: (w, h) => { const x = Math.min(w, h) * 0.25; return P([[0, h / 2], [x, 0], [w - x, 0], [w, h / 2], [w - x, h], [x, h]]); },
    pad: (w, h) => [10, Math.min(w, h) * 0.22, 10, Math.min(w, h) * 0.22]
  },
  chevron: {
    prst: "chevron",
    d: (w, h) => { const x = Math.min(w, h) * 0.5; return P([[0, 0], [w - x, 0], [w, h / 2], [w - x, h], [0, h], [x, h / 2]]); },
    pad: (w, h) => [8, Math.min(w, h) * 0.5, 8, Math.min(w, h) * 0.55]
  },
  pentagon: {
    prst: "homePlate",
    d: (w, h) => { const x = w - Math.min(w, h) * 0.5; return P([[0, 0], [x, 0], [w, h / 2], [x, h], [0, h]]); },
    pad: (w, h) => [8, Math.min(w, h) * 0.45, 8, 22]
  },
  arrow: {
    prst: "rightArrow",
    d: (w, h) => { const x = w - Math.min(w, h) * 0.5; return P([[0, h * 0.25], [x, h * 0.25], [x, 0], [w, h / 2], [x, h], [x, h * 0.75], [0, h * 0.75]]); },
    pad: (w, h) => [h * 0.27, Math.min(w, h) * 0.3, h * 0.27, 16]
  },
  "arrow-left": {
    prst: "leftArrow",
    d: (w, h) => { const x = Math.min(w, h) * 0.5; return P([[w, h * 0.25], [x, h * 0.25], [x, 0], [0, h / 2], [x, h], [x, h * 0.75], [w, h * 0.75]]); },
    pad: (w, h) => [h * 0.27, 16, h * 0.27, Math.min(w, h) * 0.3]
  },
  "arrow-up": {
    prst: "upArrow",
    d: (w, h) => { const y = Math.min(w, h) * 0.5; return P([[w * 0.25, h], [w * 0.25, y], [0, y], [w / 2, 0], [w, y], [w * 0.75, y], [w * 0.75, h]]); },
    pad: (w, h) => [Math.min(w, h) * 0.3, w * 0.27, 12, w * 0.27]
  },
  "arrow-down": {
    prst: "downArrow",
    d: (w, h) => { const y = h - Math.min(w, h) * 0.5; return P([[w * 0.25, 0], [w * 0.75, 0], [w * 0.75, y], [w, y], [w / 2, h], [0, y], [w * 0.25, y]]); },
    pad: (w, h) => [12, w * 0.27, Math.min(w, h) * 0.3, w * 0.27]
  },
  "arrow-both": {
    prst: "leftRightArrow",
    d: (w, h) => { const x = Math.min(w, h) * 0.5; return P([[0, h / 2], [x, 0], [x, h * 0.25], [w - x, h * 0.25], [w - x, 0], [w, h / 2], [w - x, h], [w - x, h * 0.75], [x, h * 0.75], [x, h]]); },
    pad: (w, h) => [h * 0.27, Math.min(w, h) * 0.3, h * 0.27, Math.min(w, h) * 0.3]
  },
  triangle: { prst: "triangle", d: (w, h) => P([[w / 2, 0], [w, h], [0, h]]), pad: (w, h) => [h * 0.5, w * 0.25, 10, w * 0.25] },
  parallelogram: {
    prst: "parallelogram",
    d: (w, h) => { const x = Math.min(w, h) * 0.25; return P([[x, 0], [w, 0], [w - x, h], [0, h]]); },
    pad: (w, h) => [10, Math.min(w, h) * 0.3, 10, Math.min(w, h) * 0.3]
  },
  trapezoid: {
    prst: "trapezoid",
    d: (w, h) => { const x = Math.min(w, h) * 0.25; return P([[x, 0], [w - x, 0], [w, h], [0, h]]); },
    pad: (w, h) => [10, Math.min(w, h) * 0.28, 10, Math.min(w, h) * 0.28]
  },
  callout: {
    prst: "wedgeRoundRectCallout",
    d: (w, h) => {
      const r = Math.min(w, h) * 0.16667, tx = w * 0.29167, ty = h * 1.125, a = w * 0.16667, b = w * 0.41667;
      return "M" + r2(r) + " 0H" + r2(w - r) + "A" + r2(r) + " " + r2(r) + " 0 0 1 " + r2(w) + " " + r2(r) + "V" + r2(h - r) +
        "A" + r2(r) + " " + r2(r) + " 0 0 1 " + r2(w - r) + " " + r2(h) + "H" + r2(b) + "L" + r2(tx) + " " + r2(ty) + "L" + r2(a) + " " + r2(h) +
        "H" + r2(r) + "A" + r2(r) + " " + r2(r) + " 0 0 1 0 " + r2(h - r) + "V" + r2(r) + "A" + r2(r) + " " + r2(r) + " 0 0 1 " + r2(r) + " 0Z";
    },
    pad: () => [10, 22, 10, 22]
  },
  cylinder: {
    prst: "can",
    d: (w, h) => {
      const ry = Math.min(w, h) * 0.125, rx = w / 2;
      return "M0 " + r2(ry) + "A" + r2(rx) + " " + r2(ry) + " 0 0 1 " + r2(w) + " " + r2(ry) + "V" + r2(h - ry) + "A" + r2(rx) + " " + r2(ry) + " 0 0 1 0 " + r2(h - ry) + "Z" +
        "M0 " + r2(ry) + "A" + r2(rx) + " " + r2(ry) + " 0 0 0 " + r2(w) + " " + r2(ry);
    },
    pad: (w, h) => [Math.min(w, h) * 0.28, 16, 10, 16]
  },
  star: {
    prst: "star5",
    d: (w, h) => {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const t = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.4 : 1;
        pts.push([w / 2 + (w / 2) * 1.05146 * rr * Math.cos(t), h * 0.5528 + (h / 2) * 1.10557 * rr * Math.sin(t)]);
      }
      return P(pts);
    },
    pad: (w, h) => [h * 0.36, w * 0.28, h * 0.26, w * 0.28]
  },
  plus: {
    prst: "plus",
    d: (w, h) => { const x = Math.min(w, h) * 0.25; return P([[x, 0], [w - x, 0], [w - x, x], [w, x], [w, h - x], [w - x, h - x], [w - x, h], [x, h], [x, h - x], [0, h - x], [0, x], [x, x]]); },
    pad: (w, h) => [Math.min(w, h) * 0.26, 10, Math.min(w, h) * 0.26, 10]
  }
};
SHAPES.circle = SHAPES.ellipse;
SHAPES.rounded = SHAPES.round;
SHAPES.process = SHAPES.rect;
SHAPES.decision = SHAPES.diamond;

const FILLS = ["teal", "navy", "grey", "mint", "surface", "ink", "none"];
const LINES = ["none", "teal", "ink", "navy", "line"];

function posStyle(a) {
  let s = "";
  if (a.x !== undefined || a.y !== undefined) s += "position:absolute;left:" + num(a.x, 0) + "px;top:" + num(a.y, 0) + "px;";
  if (a.rot) s += "transform:rotate(" + num(a.rot, 0) + "deg);";
  return s;
}

function renderShape(attrs, inner) {
  const a = attrs || {};
  const type = (a.type || "rect").toLowerCase();
  const def = SHAPES[type];
  if (!def) throw new Error('shape type tidak dikenal: "' + type + '" (pilih ' + Object.keys(SHAPES).join("|") + ")");
  const w = num(a.w !== undefined ? a.w : a.width, 320), h = num(a.h !== undefined ? a.h : a.height, 120);
  const fill = FILLS.includes(a.fill) ? a.fill : "teal";
  const line = LINES.includes(a.line) ? a.line : (fill === "none" ? "ink" : "none");
  const pad = def.pad(w, h).map((v) => r2(v) + "px").join(" ");
  const cls = "shape shape-" + type + " f-" + fill + " ln-" + line + (a.class ? " " + a.class : "");
  const style = "width:" + r2(w) + "px;height:" + r2(h) + "px;" + posStyle(a) + (a.style || "");
  const text = String(inner || "").trim();
  return '<div class="' + escAttr(cls) + '"' + (a.id ? ' id="' + escAttr(a.id) + '"' : "") + ' data-prst="' + def.prst + '"' +
    (def.adj ? ' data-adj="' + def.adj + '"' : "") + ' style="' + escAttr(style) + '">' +
    '<svg class="shape-g" viewBox="0 0 ' + r2(w) + " " + r2(h) + '" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="' + def.d(w, h) + '"/></svg>' +
    (text ? '<div class="shape-t" style="padding:' + pad + (a.size ? ";font-size:" + num(a.size, 26) + "px" : "") + '">' + text + "</div>" : "") +
    "</div>";
}

/* Connector digambar oleh runtime di template.html (butuh posisi nyata elemen). Build hanya menaruh wadah + data-*. */
function renderConnector(attrs) {
  const a = attrs || {};
  const type = ["straight", "elbow", "curve"].includes(a.type) ? a.type : "straight";
  const arrow = ["end", "start", "both", "none"].includes(a.arrow) ? a.arrow : "end";
  let data = ' data-type="' + type + '" data-arrow="' + arrow + '"';
  if (a.from !== undefined && a.to !== undefined) data += ' data-from="' + escAttr(a.from) + '" data-to="' + escAttr(a.to) + '"';
  else if (a.x1 !== undefined) data += ' data-xy="' + [a.x1, a.y1, a.x2, a.y2].map((v) => num(v, 0)).join(",") + '"';
  else throw new Error("connector butuh from+to atau x1 y1 x2 y2");
  if (a.label) data += ' data-label="' + escAttr(a.label) + '"';
  return '<svg class="connector' + ("dash" in a ? " dash" : "") + (a.class ? " " + escAttr(a.class) : "") + '"' + data +
    ' aria-hidden="true" xmlns="http://www.w3.org/2000/svg"></svg>';
}

module.exports = { renderShape, renderConnector, SHAPES };
