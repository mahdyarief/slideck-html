/* slideck-html pdf.js — konversi hasil build (dist/<output>.html) ke PDF.
   Satu slide = satu halaman, memakai @media print yang sudah ada di template.html
   (@page{size:1920px 1080px} + .slide{page-break-after:always}).

   Zero dependency: hanya Node stdlib + browser Chromium/Edge/Chrome yang sudah terpasang.

   Pakai:
     node pdf.js                        # baca deck.json di folder ini, cetak dist/<output>.html
     node pdf.js --root <dir>           # deck.json ada di folder lain
     node pdf.js --html <file.html>     # cetak file HTML langsung (tanpa deck.json)
     node pdf.js --out <file.pdf>       # tentukan nama output
     CHROME_PATH=<exe> node pdf.js      # paksa path browser tertentu
*/
const fs = require("fs");
const path = require("path");
const { findBrowser, fileUrl, runHeadless } = require("./lib/browser");
const { argOf, deckRoot, deckHtml } = require("./lib/util");

const DIR = __dirname;
const htmlFlag = argOf("html");
const outFlag = argOf("out");
const SRC = deckRoot(DIR);

let htmlPath;
let outPath;
if (htmlFlag) {
  htmlPath = path.resolve(htmlFlag);
  outPath = outFlag ? path.resolve(outFlag) : htmlPath.replace(/\.html?$/i, "") + ".pdf";
} else {
  try { htmlPath = deckHtml(SRC, "atau pakai --html <file.html>"); } catch (e) { console.error("  x " + e.message); process.exit(1); }
  outPath = outFlag ? path.resolve(outFlag) : htmlPath.replace(/\.html?$/i, "") + ".pdf";
}

if (!fs.existsSync(htmlPath)) {
  console.error("  x HTML tidak ketemu: " + htmlPath + "\n    jalankan `node build.js` dulu.");
  process.exit(1);
}

const browser = findBrowser();
if (!browser) {
  console.error("  x Chrome / Edge / Chromium tidak ditemukan.\n    Set CHROME_PATH ke path browser, mis. CHROME_PATH=\"C:/Program Files/Google/Chrome/Application/chrome.exe\"");
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, "utf8");
const slideCount = (html.match(/<section\b[^>]*class="[^"]*\bslide\b/g) || []).length;
const noteCount = (html.match(/class="slide-notes"/g) || []).length;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.rmSync(outPath, { force: true });

const result = runHeadless(browser, ["--no-pdf-header-footer", "--print-to-pdf=" + outPath.replace(/\\/g, "/")], fileUrl(htmlPath), { budget: 5000 });

if (result.status !== 0 || !fs.existsSync(outPath)) {
  process.stderr.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  console.error("  x gagal mencetak PDF lewat " + browser);
  process.exit(result.status || 1);
}

const pdf = fs.readFileSync(outPath).toString("latin1");
const pageCount = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
const box = pdf.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/);
const sizePt = box ? Math.round(Number(box[1])) + "x" + Math.round(Number(box[2])) + " pt" : "?";

console.log("slideck-html pdf | " + path.basename(htmlPath) + " → " + path.basename(outPath));
console.log("  slides=" + slideCount + " | halaman PDF=" + pageCount + " | ukuran halaman=" + sizePt +
  " | " + Math.round(fs.statSync(outPath).size / 1024) + " KB");
console.log("  -> " + outPath.replace(/\\/g, "/"));

if (slideCount && pageCount !== slideCount + noteCount) {
  console.warn("  ! jumlah halaman (" + pageCount + ") != slide (" + slideCount + ") + catatan (" + noteCount + ")");
  process.exitCode = 1;
}
