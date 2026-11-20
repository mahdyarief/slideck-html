/* slideck-html lib/interactive-lint.js — FROZEN. Peringatan build untuk langkah dan komponen interaktif (docs/motion.md).
   Membaca HTML slide yang sudah dirender (string), tanpa DOM: cukup untuk pola yang sering salah dipakai.
   Pemeriksaan yang butuh tata letak nyata (morph di dalam kartu, isi tab yang meluber) ada di check.js. */

const HOVER_ONLY = /class="[^"]*\b(peek|focus-group|hotspots)\b/;
const INTERACTIVE = /\bdata-steps?\b|\bdata-morph=|class="[^"]*\b(swap|tabs|peek|focus-group|hotspots)\b/;

/* anak langsung dari elemen pembuka di posisi `at` — penghitung kedalaman tag sederhana (cukup untuk HTML slide) */
function directChildren(html, at) {
  const open = /<([a-z][\w-]*)\b[^>]*>/i.exec(html.slice(at));
  if (!open) return [];
  const VOID = /^(br|img|hr|input|meta|link|source|wbr|col|area|embed|track|param)$/i;
  const re = /<(\/?)([a-z][\w-]*)\b([^>]*?)(\/?)>/gi;
  re.lastIndex = at + open[0].length;
  const kids = [];
  let depth = 0, m;
  while ((m = re.exec(html))) {
    const [, close, tag, attrs, self] = m;
    if (VOID.test(tag) || self) { if (depth === 0) kids.push({ tag, attrs }); continue; }
    if (close) { if (depth === 0) break; depth--; continue; }
    if (depth === 0) kids.push({ tag, attrs });
    depth++;
  }
  return kids;
}

/* slides: [{ f, html }] dalam urutan deck. mode: "live" | "shared" | "" (deck.json "interactive"). → daftar peringatan */
function lintInteractive(slides, mode) {
  const out = [];
  const morphs = slides.map((s) => new Set([...s.html.matchAll(/\bdata-morph="([^"]+)"/g)].map((m) => m[1])));
  let used = 0;
  slides.forEach((s, i) => {
    const h = s.html, f = s.f;
    if (INTERACTIVE.test(h)) used++;

    /* langkah: terlalu banyak membuat penonton menunggu; dihitung per wadah data-steps (anak langsung) + data-step lepas */
    let steps = 0;
    for (const m of h.matchAll(/<[a-z][\w-]*\b[^>]*\bdata-steps\b[^>]*>/gi)) steps += directChildren(h, m.index).length;
    const nums = new Set();
    for (const m of h.matchAll(/\bdata-step(?:="([^"]*)")?(?=[\s>])/g)) { if (m[1] && !isNaN(parseFloat(m[1]))) nums.add(m[1]); else steps++; }
    steps += nums.size;
    if (steps > 6) out.push(f + ": " + steps + " langkah di satu slide — maks ±4–6; pecah jadi dua slide atau gabungkan poin");

    /* swap / tabs: minimal dua keadaan, tiap keadaan berlabel */
    for (const m of h.matchAll(/<div\b[^>]*class="([^"]*\b(swap|tabs)\b[^"]*)"[^>]*>/g)) {
      const kind = m[2], kids = directChildren(h, m.index);
      if (kids.length < 2) out.push(f + ": ." + kind + " butuh minimal 2 anak (satu per keadaan), ketemu " + kids.length);
      const noLabel = kids.filter((k) => !/\bdata-label=/.test(k.attrs)).length;
      const stepDriven = /\bdata-step\b/.test(m[0]);
      if (noLabel && (kind === "tabs" || !stepDriven)) out.push(f + ": ." + kind + ": " + noLabel + " anak tanpa data-label — tombolnya jadi \"1\", \"2\", …");
      if (mode === "live" && !stepDriven) out.push(f + ': .' + kind + ' di deck "live" — presenter harus mengklik tombolnya; tambahkan data-step agar → yang menggantinya');
    }

    /* komponen hover di deck yang dipresentasikan langsung tidak terlihat penonton */
    if (mode === "live") {
      const hm = HOVER_ONLY.exec(h) || /\bdata-hover\b/.exec(h);
      if (hm) out.push(f + ': ' + (hm[1] ? "." + hm[1] : "data-hover") + ' di deck "live" — penonton tidak melihat hover; pakai data-step / data-steps');
    }

    /* data-count tanpa angka, atau terlalu banyak angka yang berhitung */
    const counts = [...h.matchAll(/<([a-z][\w-]*)\b[^>]*\bdata-count\b[^>]*>([\s\S]*?)<\/\1>/gi)];
    for (const c of counts) if (!/\d/.test(c[2].replace(/<[^>]+>/g, ""))) out.push(f + ": data-count tanpa angka di dalamnya");
    if (counts.length > 3) out.push(f + ": " + counts.length + " angka data-count — pakai hanya untuk 1–3 angka kunci");

    /* hotspot tanpa posisi */
    for (const m of h.matchAll(/<[a-z]+\b[^>]*class="[^"]*\bhotspot\b[^"]*"[^>]*>/g)) {
      if (!/--x\s*:/.test(m[0]) || !/--y\s*:/.test(m[0])) out.push(f + ': .hotspot tanpa style="--x:..%;--y:..%" — pin jatuh di tengah gambar');
    }

    /* morph: nama yang sama harus ada di slide sebelum atau sesudahnya */
    for (const name of morphs[i]) {
      if (!(morphs[i - 1] && morphs[i - 1].has(name)) && !(morphs[i + 1] && morphs[i + 1].has(name)))
        out.push(f + ': data-morph="' + name + '" tidak punya pasangan di slide sebelum/sesudahnya — tidak ada yang meluncur');
    }
  });

  /* takaran: interaksi di setiap slide menjadi gangguan (deck "shared" dijelajahi sendiri, boleh lebih banyak) */
  if (mode !== "shared" && slides.length >= 5 && used / slides.length > 0.4)
    out.push("deck: " + used + " dari " + slides.length + " slide interaktif (>40%) — simpan untuk slide yang memang membangun argumen atau perlu dijelajahi");
  return out;
}

module.exports = { lintInteractive, directChildren };
