/* slideck-html check.js — cek visual hasil build lewat Chrome/Edge headless. Zero dependency (node stdlib only).

   1. LAPORAN LUBERAN: tiap slide diukur di browser — skala autofit yang terpakai, konten yang
      masih meluber setelah autofit, connector yang targetnya hilang, komponen yang gagal dirender.
   2. REGRESI PIKSEL: semua slide difoto jadi satu lembar kontak (960x540 per slide) lalu dibandingkan
      dengan baseline di .slideck-check/baseline/. Slide yang berubah dilaporkan.

   Pakai:
     node check.js                      # deck di folder ini (dist/<output> dari deck.json)
     node check.js --root <dir>         # deck di folder lain
     node check.js --html <file.html>   # file hasil build tertentu
     node check.js --examples           # semua examples/html/*.html
     node check.js --update             # simpan foto sekarang sebagai baseline baru
     node check.js --no-shot            # laporan luberan saja (lebih cepat)
   Keluar dengan kode 1 bila ada luberan / komponen rusak / piksel berubah dari baseline. */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { findBrowser, fileUrl, runHeadless, probe, OUT_SNIPPET } = require("./lib/browser");

const DIR = __dirname;
const { argOf, deckRoot, deckHtml } = require("./lib/util");
const has = (name) => process.argv.includes("--" + name);
const SRC = deckRoot(DIR);
const OUT = path.resolve(argOf("out") || path.join(SRC, ".slideck-check"));
const TILE_W = 960, TILE_H = 540, PER_SHEET = 12;
const TOL = 28;          /* beda per kanal yang masih dianggap sama (anti-alias) */
const CHANGED = 0.002;   /* >0,2% piksel berubah = slide berubah */

const SHEET_CSS = "<style>" +
  "html,body{overflow:visible!important;height:auto!important;background:#fff!important}" +
  ".deck-viewport{position:static!important;overflow:visible!important;background:#fff!important}" +
  ".deck-stage{position:static!important;transform:none!important;width:1920px!important;height:auto!important}" +
  ".slide{position:relative!important;inset:auto!important;visibility:visible!important;opacity:1!important;transition:none!important}" +
  ".reveal{opacity:1!important;transform:none!important;transition:none!important}" +
  ".deck-controls,.progress,.deck-theme-switcher,.slide-notes{display:none!important}" +
  "</style>" +
  /* tampilkan semua slide lewat kelas aslinya (bukan override CSS !important — Chrome bisa meninggalkan visibility
     anak dalam keadaan hidden), lalu hitung ulang autofit + connector */
  "<script>document.querySelectorAll('section.slide').forEach(function(s){s.classList.add('active','visible')});" +
  "if(window.slideckFit)window.slideckFit();</script>";

const PROBE_JS = "<script>" + OUT_SNIPPET + `
(async function(){ try {
  /* headless virtual time: rAF tidak selalu jalan, timer selalu jalan → tunggu pakai setTimeout, font dibatasi 1,5 dtk */
  const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
  try{ if(document.fonts&&document.fonts.ready) await Promise.race([document.fonts.ready,wait(1500)]) }catch(e){}
  await wait(60);
  if(window.slideckFit) window.slideckFit();
  const out=[];
  document.querySelectorAll('section.slide').forEach((sl,i)=>{
    const r={n:i+1,layout:sl.dataset.layout||'',fit:sl.dataset.fitScale?+sl.dataset.fitScale:1,fail:sl.hasAttribute('data-fit-fail'),ph:[],issues:[]};
    sl.querySelectorAll('.ph').forEach(ph=>{
      if(ph.dataset.fitScale||ph.hasAttribute('data-fit-fail')) r.ph.push({name:ph.dataset.ph||'',fit:ph.dataset.fitScale?+ph.dataset.fitScale:1,fail:ph.hasAttribute('data-fit-fail')});
      else if(sl.dataset.fit==='off'&&typeof phOver==='function'&&phOver(ph)) r.ph.push({name:ph.dataset.ph||'',fit:1,fail:true});
    });
    if(typeof slideOverflows==='function'&&slideOverflows(sl)&&!r.fail) r.issues.push('konten meluber dari slide');
    sl.querySelectorAll('svg.connector[data-missing]').forEach(c=>r.issues.push('connector: target tidak ketemu ('+(c.dataset.from||'')+' → '+(c.dataset.to||'')+')'));
    if(sl.querySelector('pre.mermaid')) r.issues.push('mermaid tidak dirender');
    if(sl.querySelector('chart,shape,connector,ph,slide')) r.issues.push('tag komponen tidak dirender');
    sl.querySelectorAll('img').forEach(im=>{ if(im.complete&&!im.naturalWidth) r.issues.push('gambar gagal dimuat: '+(im.getAttribute('src')||'').slice(0,60)) });
    out.push(r);
  });
  __slideckOut({slides:out,hasFit:!!window.slideckFit});
  } catch (err) { __slideckOut({error:String(err&&err.stack||err)}); }
})();
</script>`;

/* ---------- PNG (8-bit RGB/RGBA, non-interlace) ---------- */
function readPng(file) {
  const b = fs.readFileSync(file);
  let p = 8, w = 0, h = 0, ct = 0;
  const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString("latin1", p + 4, p + 8);
    if (type === "IHDR") { w = b.readUInt32BE(p + 8); h = b.readUInt32BE(p + 12); ct = b[p + 17]; if (b[p + 16] !== 8 || b[p + 20] !== 0 || (ct !== 2 && ct !== 6)) throw new Error("format PNG tidak didukung: " + file); }
    else if (type === "IDAT") idat.push(b.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[dst + x - bpp] : 0, up = y ? px[dst - stride + x] : 0, c = x >= bpp && y ? px[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const q = a + up - c, pa = Math.abs(q - a), pb = Math.abs(q - up), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      px[dst + x] = v & 255;
    }
  }
  return { w, h, bpp, px };
}

/* rasio piksel berubah per petak slide */
function diffTiles(A, B, tiles) {
  const res = [];
  for (let t = 0; t < tiles; t++) {
    let changed = 0, total = 0;
    const y0 = t * TILE_H;
    for (let y = y0; y < y0 + TILE_H && y < A.h && y < B.h; y++) {
      for (let x = 0; x < TILE_W && x < A.w && x < B.w; x++) {
        const i = (y * A.w + x) * A.bpp, j = (y * B.w + x) * B.bpp;
        total++;
        if (Math.abs(A.px[i] - B.px[j]) > TOL || Math.abs(A.px[i + 1] - B.px[j + 1]) > TOL || Math.abs(A.px[i + 2] - B.px[j + 2]) > TOL) changed++;
      }
    }
    res.push(total ? changed / total : 1);
  }
  return res;
}

/* ---------- target ---------- */
let targets = [];
if (has("examples")) {
  const d = path.join(DIR, "examples", "html");
  targets = fs.readdirSync(d).filter((f) => f.endsWith(".html") && !f.startsWith(".")).sort().map((f) => path.join(d, f));
} else if (argOf("html")) {
  targets = [path.resolve(argOf("html"))];
} else {
  try { targets = [deckHtml(SRC, "atau pakai --html / --examples")]; } catch (e) { console.error("  x " + e.message); process.exit(1); }
}
const browser = findBrowser();
if (!browser) { console.error("  x Chrome / Edge / Chromium tidak ditemukan. Set CHROME_PATH."); process.exit(1); }

const update = has("update"), noShot = has("no-shot");
const baseDir = path.join(OUT, "baseline"), curDir = path.join(OUT, "current");
if (!noShot) { fs.mkdirSync(baseDir, { recursive: true }); fs.mkdirSync(curDir, { recursive: true }); }

let failures = 0, warns = 0;
for (const htmlPath of targets) {
  const name = path.basename(htmlPath).replace(/\.html?$/i, "");
  if (!fs.existsSync(htmlPath)) { console.error("x   " + name + ": tidak ketemu — jalankan `node build.js` dulu"); failures++; continue; }
  const html = fs.readFileSync(htmlPath, "utf8");
  const inject = (extra) => html.replace(/<\/body>/i, () => extra + "</body>");

  /* 1. laporan luberan */
  let rep;
  try { rep = probe(browser, inject(SHEET_CSS + PROBE_JS), htmlPath, { size: [1920, 1080] }); }
  catch (e) { console.error("x   " + name + ": " + e.message); failures++; continue; }
  if (rep.error) { console.error("x   " + name + ": script probe error — " + rep.error.split("\n").slice(0, 3).join(" | ")); failures++; continue; }
  const lines = [];
  let bad = 0;
  for (const s of rep.slides) {
    const tag = "slide " + String(s.n).padStart(2) + (s.layout ? " [" + s.layout + "]" : "");
    if (s.fail) { bad++; lines.push("    x " + tag + ": masih meluber walau autofit sudah di skala minimum " + s.fit); }
    else if (s.fit < 1) { lines.push("    " + (s.fit < 0.75 ? "!" : "·") + " " + tag + ": autofit slide " + s.fit + (s.fit < 0.75 ? " — teks jadi kecil, kurangi isi" : "")); if (s.fit < 0.75) warns++; }
    for (const p of s.ph) {
      if (p.fail) { bad++; lines.push("    x " + tag + ": placeholder \"" + p.name + "\" masih meluber (skala " + p.fit + ")"); }
      else { lines.push("    " + (p.fit < 0.75 ? "!" : "·") + " " + tag + ": autofit \"" + p.name + "\" " + p.fit + (p.fit < 0.75 ? " — teks jadi kecil, kurangi isi" : "")); if (p.fit < 0.75) warns++; }
    }
    for (const m of s.issues) { bad++; lines.push("    x " + tag + ": " + m); }
  }
  if (!rep.hasFit) lines.push("    · deck ini dibangun dengan shell lama (tanpa autofit) — rebuild dengan build.js 2.x");

  /* 2. lembar kontak + banding baseline */
  let shotMsg = "";
  if (!noShot) {
    const n = rep.slides.length;
    const sheets = Math.ceil(n / PER_SHEET);
    for (let k = 0; k < sheets; k++) {
      const from = k * PER_SHEET + 1, to = Math.min(n, from + PER_SHEET - 1), count = to - from + 1;
      const file = name + (sheets > 1 ? "-" + (k + 1) : "") + ".png";
      const cur = path.join(curDir, file), base = path.join(baseDir, file);
      const hide = sheets > 1 ? "<style>section.slide:not(:nth-of-type(n+" + from + "):nth-of-type(-n+" + to + ")){display:none!important}</style>" : "";
      const tmp = path.join(path.dirname(htmlPath), ".slideck-sheet-" + process.pid + "-" + k + ".html");
      fs.writeFileSync(tmp, inject(SHEET_CSS + hide));
      fs.rmSync(cur, { force: true });
      try {
        /* sesekali Chrome headless keluar tanpa menulis PNG (mis. beberapa instance sekaligus) → ulangi */
        for (let attempt = 0; attempt < 3 && !fs.existsSync(cur); attempt++) {
          runHeadless(browser, ["--window-size=1920," + 1080 * count, "--force-device-scale-factor=0.5", "--screenshot=" + cur.replace(/\\/g, "/")], fileUrl(tmp), { budget: 6000 + attempt * 6000 });
        }
      } finally { fs.rmSync(tmp, { force: true, maxRetries: 5, retryDelay: 200 }); }
      if (!fs.existsSync(cur)) { bad++; lines.push("    x foto gagal: " + file); continue; }
      if (update || !fs.existsSync(base)) { fs.copyFileSync(cur, base); shotMsg = update ? "baseline diperbarui" : "baseline dibuat"; continue; }
      const A = readPng(base), B = readPng(cur);
      if (A.w !== B.w || A.h !== B.h) { bad++; lines.push("    x ukuran lembar berubah (" + A.w + "x" + A.h + " → " + B.w + "x" + B.h + ") — jumlah slide berubah? pakai --update"); continue; }
      const d = diffTiles(A, B, count);
      d.forEach((r, i) => { if (r > CHANGED) { bad++; lines.push("    x slide " + String(from + i).padStart(2) + ": " + (r * 100).toFixed(2) + "% piksel berubah dari baseline"); } });
      if (!shotMsg) shotMsg = "piksel dibanding baseline";
    }
  }
  failures += bad;
  console.log((bad ? "x   " : "ok  ") + name.padEnd(26) + rep.slides.length + " slide" + (shotMsg ? " · " + shotMsg : ""));
  lines.forEach((l) => console.log(l));
}
if (!noShot) console.log("\n  foto: " + path.relative(process.cwd(), curDir).replace(/\\/g, "/") + "/  baseline: " + path.relative(process.cwd(), baseDir).replace(/\\/g, "/") + "/");
console.log(failures ? "\n" + failures + " masalah." + (noShot ? "" : " Perubahan disengaja? jalankan lagi dengan --update.") : "\nSemua lolos." + (warns ? " (" + warns + " peringatan skala kecil)" : ""));
process.exit(failures ? 1 : 0);
