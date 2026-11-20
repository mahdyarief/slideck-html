/* slideck-html lib/browser.js — FROZEN. Cari + jalankan Chrome/Edge/Chromium headless.
   Dipakai check.js dan pptx.js. Zero dependency (node stdlib only). */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

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

const fileUrl = (p) => "file:///" + path.resolve(p).replace(/\\/g, "/").replace(/ /g, "%20").replace(/#/g, "%23");

/* Jalankan browser headless dengan flag tambahan. Mengembalikan { status, stdout, stderr }.
   Profil sementara sendiri supaya tidak bentrok dengan browser yang sedang dibuka user. */
function runHeadless(browser, flags, url, opts) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "slideck-chrome-"));
  try {
    return spawnSync(browser, [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      "--allow-file-access-from-files",
      "--user-data-dir=" + profile,
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=" + ((opts && opts.budget) || 6000),
      ...flags,
      url
    ], { encoding: "utf8", maxBuffer: 512 * 1024 * 1024, timeout: (opts && opts.timeout) || 120000 });
  } finally {
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch (e) { /* profil masih dikunci — biarkan */ }
  }
}

/* Muat sebuah halaman, biarkan script di dalamnya menulis hasil ke <script id="__slideck_out" type="application/json">,
   lalu kembalikan JSON itu. `html` = isi halaman lengkap (ditulis ke file sementara di sebelah `nearPath`). */
function probe(browser, html, nearPath, opts) {
  const tmp = path.join(path.dirname(path.resolve(nearPath)), ".slideck-probe-" + process.pid + "-" + Date.now() + ".html");
  fs.writeFileSync(tmp, html);
  try {
    const size = (opts && opts.size) || [1920, 1080];
    /* --dump-dom bisa terjadi sebelum script async halaman selesai (virtual time headless tidak selalu
       menunggu font/rAF) → ulangi dengan budget lebih besar sebelum menyerah */
    let r, m;
    for (const budget of [(opts && opts.budget) || 6000, 15000, 30000]) {
      r = runHeadless(browser, ["--window-size=" + size[0] + "," + size[1], "--dump-dom", "--enable-logging=stderr", "--v=0"], fileUrl(tmp), Object.assign({}, opts, { budget }));
      m = (r.stdout || "").match(/<script id="__slideck_out" type="application\/json">([\s\S]*?)<\/script>/);
      if (m) break;
    }
    if (!m) {
      /* sertakan error console halaman supaya penyebabnya terlihat */
      const logs = (r.stderr || "").split(/\r?\n/).filter((l) => /CONSOLE|Uncaught/.test(l)).map((l) => l.replace(/^.*?\] /, "")).slice(0, 4);
      const why = r.error ? " (" + r.error.code + ")" : r.status ? " (exit " + r.status + ")" : "";
      const err = new Error("probe gagal" + why + ": halaman tidak menghasilkan __slideck_out" + (logs.length ? " — " + logs.join(" | ") : ""));
      err.stdout = r.stdout; err.stderr = r.stderr; err.status = r.status;
      throw err;
    }
    /* isi <script> diserialisasi mentah (tanpa escape entitas); penulis wajib meng-escape "<" jadi < */
    return JSON.parse(m[1]);
  } finally {
    /* SLIDECK_KEEP=1 → simpan halaman probe untuk debugging */
    if (process.env.SLIDECK_KEEP) console.error("  (probe disimpan: " + tmp + ")");
    else fs.rmSync(tmp, { force: true, maxRetries: 5, retryDelay: 200 }); /* Windows: Chrome bisa masih memegang file */
  }
}

/* Potongan JS untuk halaman probe: panggil __slideckOut(obj) saat hasil siap. */
const OUT_SNIPPET = "function __slideckOut(o){var s=document.createElement('script');s.id='__slideck_out';s.type='application/json';" +
  "s.textContent=JSON.stringify(o).replace(/</g,'\\\\u003c');document.body.appendChild(s)}";

module.exports = { OUT_SNIPPET, browserCandidates, findBrowser, fileUrl, runHeadless, probe };
