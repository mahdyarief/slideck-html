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
const { spawnSync } = require("child_process");

const DIR = __dirname;

const argOf = (name) => {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
};

const rootFlag = argOf("root");
const htmlFlag = argOf("html");
const outFlag = argOf("out");
const SRC = rootFlag ? path.resolve(rootFlag) : DIR;

function browserCandidates() {
  const list = [];
  if (process.env.CHROME_PATH) list.push(process.env.CHROME_PATH);
  if (process.env.CHROME_BIN) list.push(process.env.CHROME_BIN);
  if (process.platform === "win32") {
    const pf = process.env["ProgramFiles"] || "C:/Program Files";
    const pf86 = process.env["ProgramFiles(x86)"] || "C:/Program Files (x86)";
    const local = process.env["LOCALAPPDATA"] || "";
    list.push(
      path.join(pf, "Google/Chrome/Application/chrome.exe"),
      path.join(pf86, "Google/Chrome/Application/chrome.exe"),
      local && path.join(local, "Google/Chrome/Application/chrome.exe"),
      path.join(pf, "Microsoft/Edge/Application/msedge.exe"),
      path.join(pf86, "Microsoft/Edge/Application/msedge.exe")
    );
  } else if (process.platform === "darwin") {
    list.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    );
  } else {
    list.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/microsoft-edge"
    );
  }
  return list.filter(Boolean);
}

function findBrowser() {
  for (const p of browserCandidates()) {
    if (fs.existsSync(p)) return p;
  }
  const finder = process.platform === "win32" ? "where" : "which";
  for (const bin of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "msedge"]) {
    const r = spawnSync(finder, [bin], { encoding: "utf8" });
    if (r.status === 0) {
      const first = (r.stdout || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0];
      if (first) return first;
    }
  }
  return null;
}

const fileUrl = (p) => "file:///" + p.replace(/\\/g, "/").replace(/ /g, "%20");

let htmlPath;
let outPath;
if (htmlFlag) {
  htmlPath = path.resolve(htmlFlag);
  outPath = outFlag ? path.resolve(outFlag) : htmlPath.replace(/\.html?$/i, "") + ".pdf";
} else {
  const deckPath = path.join(SRC, "deck.json");
  if (!fs.existsSync(deckPath)) {
    console.error("  x deck.json tidak ketemu di " + SRC + " (atau pakai --html <file.html>)");
    process.exit(1);
  }
  const deck = JSON.parse(fs.readFileSync(deckPath, "utf8"));
  htmlPath = path.join(SRC, "dist", deck.output);
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
const slideCount = (html.match(/class="slide"/g) || []).length;
const noteCount = (html.match(/class="slide-notes"/g) || []).length;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.rmSync(outPath, { force: true });

const result = spawnSync(browser, [
  "--headless=new",
  "--disable-gpu",
  "--no-pdf-header-footer",
  "--run-all-compositor-stages-before-draw",
  "--virtual-time-budget=5000",
  "--print-to-pdf=" + outPath.replace(/\\/g, "/"),
  fileUrl(htmlPath)
], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

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
