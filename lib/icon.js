/* slideck-html lib/icon.js — FROZEN. <icon> → SVG inline saat build. Zero dependency.
   Ikon garis 24×24 buatan sendiri (stroke currentColor) — warna ikut teks/token, tidak ada hex di sini.

   <icon name="target">                         ikon polos, 48px, warna --teal-d (di slide gelap --teal)
   <icon name="target" size="64">               ukuran px
   <icon name="alert" badge [tone="accent2|navy|soft"]>   ikon di lingkaran berisi (default --teal)
   Nama tidak dikenal → peringatan build + daftar nama yang tersedia. */
const { escAttr, num } = require("./util");

const C = (cx, cy, r) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
const P = (d) => '<path d="' + d + '"/>';

const ICONS = {
  check: P("M5 12.5l4.5 4.5L19 7.5"),
  "check-circle": C(12, 12, 9) + P("M8 12.5l3 3 5-6"),
  x: P("M6 6l12 12M18 6L6 18"),
  plus: P("M12 5v14M5 12h14"),
  minus: P("M5 12h14"),
  "arrow-right": P("M5 12h14M13 6l6 6-6 6"),
  alert: P("M12 3.5L22 20.5H2Z") + P("M12 10v4.5M12 17.5v.01"),
  info: C(12, 12, 9) + P("M12 11v6M12 7.5v.01"),
  help: C(12, 12, 9) + P("M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6v.6M12 17v.01"),
  star: P("M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"),
  heart: P("M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"),
  user: C(12, 8, 4) + P("M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"),
  users: C(9, 8, 3.5) + P("M2.5 20c0-3.8 2.9-6 6.5-6s6.5 2.2 6.5 6M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.2.6 3.5 2.6 3.5 5.7"),
  target: C(12, 12, 9) + C(12, 12, 5) + C(12, 12, 1),
  clock: C(12, 12, 9) + P("M12 7v5l3.5 2"),
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/>' + P("M3.5 10h17M8 3v4M16 3v4"),
  chart: P("M4 20h16M7 16v-5M12 16V6M17 16v-8"),
  "trend-up": P("M3 17l6-6 4 4 8-8M15 7h6v6"),
  "trend-down": P("M3 7l6 6 4-4 8 8M15 17h6v-6"),
  bulb: P("M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"),
  gear: C(12, 12, 3) + C(12, 12, 7) + P("M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"),
  shield: P("M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6Z") + P("M8.5 12l2.5 2.5 4.5-4.5"),
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/>' + P("M8 10.5V7.5a4 4 0 0 1 8 0v3"),
  book: P("M4 4.5h6a2 2 0 0 1 2 2V20a1.5 1.5 0 0 0-1.5-1.5H4ZM20 4.5h-6a2 2 0 0 0-2 2V20a1.5 1.5 0 0 1 1.5-1.5H20Z"),
  school: P("M2.5 9L12 4.5 21.5 9 12 13.5Z") + P("M6.5 11v5c1.5 1.5 3.5 2.3 5.5 2.3s4-.8 5.5-2.3v-5M21.5 9v5"),
  flag: P("M5 21V4M5 4h11l-2 4 2 4H5"),
  globe: C(12, 12, 9) + P("M3 12h18M12 3c2.5 2.7 3.7 5.7 3.7 9s-1.2 6.3-3.7 9c-2.5-2.7-3.7-5.7-3.7-9S9.5 5.7 12 3Z"),
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/>' + P("M3.5 7l8.5 6 8.5-6"),
  home: P("M3.5 11L12 4l8.5 7M6 9.5V20h12V9.5M10 20v-5h4v5"),
  search: C(10.5, 10.5, 6.5) + P("M15.5 15.5L21 21"),
  doc: P("M6 3h8l4 4v14H6Z") + P("M14 3v4h4M9 12h6M9 16h6"),
  money: '<rect x="2.5" y="6" width="19" height="12" rx="2"/>' + C(12, 12, 2.5) + P("M6 9.5v.01M18 14.5v.01"),
  cart: P("M3 4h2.5l2.2 10.5h10.6L20.5 7.5H6.5") + C(9, 19, 1.5) + C(17, 19, 1.5),
  leaf: P("M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19l7-7"),
  bolt: P("M13 2.5L4.5 13.5H12L11 21.5l8.5-11H12Z"),
  cloud: P("M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.6A3.8 3.8 0 0 1 17.5 18.5Z"),
  link: P("M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"),
  chat: P("M4 5.5h16v11H9l-5 4Z"),
  award: C(12, 9, 5.5) + P("M8.5 13.3L7 21l5-2.5 5 2.5-1.5-7.7"),
  layers: P("M12 2.5l9 4.5-9 4.5-9-4.5Z") + P("M3 12l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5"),
  pin: P("M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z") + C(12, 10, 2.5),
  eye: P("M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z") + C(12, 12, 3),
  cycle: P("M20 11a8 8 0 0 0-14.3-4.3M4 13a8 8 0 0 0 14.3 4.3M4 4v4h4M20 20v-4h-4"),
  database: '<ellipse cx="12" cy="6" rx="7.5" ry="3"/>' + P("M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"),
  code: P("M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"),
  tools: P("M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 1-2-2Z")
};

const TONES = { teal: "", accent2: " t-accent2", navy: " t-navy", soft: " t-soft" };

function renderIcon(a) {
  const name = String(a.name || "").trim();
  const body = ICONS[name];
  if (!body) throw new Error('ikon "' + name + '" tidak ada. Tersedia: ' + Object.keys(ICONS).join(", "));
  const badge = a.badge !== undefined;
  const size = num(a.size, badge ? 44 : 48);
  const svg = '<svg class="ico" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + "</svg>";
  const cls = a.class ? " " + escAttr(a.class) : "";
  if (!badge) return cls ? svg.replace('class="ico"', 'class="ico' + cls + '"') : svg;
  const tone = TONES[a.tone || "teal"];
  if (tone === undefined) throw new Error('tone ikon "' + a.tone + '" tidak dikenal (teal|accent2|navy|soft)');
  const box = Math.round(size * 2);
  return '<span class="ico-badge' + tone + cls + '" style="width:' + box + "px;height:" + box + 'px">' + svg + "</span>";
}

module.exports = { renderIcon, ICONS };
