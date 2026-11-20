#!/usr/bin/env node
/* slideck-html bin/slideck.js — FROZEN. Satu perintah untuk semua tool. Zero dependency.
   Deck = folder kerja (atau --root <dir>); tool, design, theme bawaan diambil dari paket ini. */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { argOf, deckRoot } = require("../lib/util");

const PKG = path.resolve(__dirname, "..");
const VERSION = require("../package.json").version;
const [cmd, ...rest] = process.argv.slice(2);
const TOOLS = { build: "build.js", pdf: "pdf.js", pptx: "pptx.js", check: "check.js", import: "import.js" };

const HELP = `slideck ${VERSION} — single-file HTML slide decks (zero dependency)

Pakai:  slideck <perintah> [opsi]        deck = folder kerja, atau --root <dir>

Deck
  init [dir]                 deck baru: deck.json + slides/ contoh
  build                      slides/*.html → dist/<output>.html
  pdf                        dist/<output>.html → .pdf (satu slide per halaman)
  pptx                       dist/<output>.html → .pptx (objek yang bisa diedit)
  import <file.pptx>         .pptx → slides/*.html (layout slideck)
  check                      laporan luberan + regresi piksel (--update, --no-shot)

Design sendiri (panduan: docs/custom-design.md di paket ini)
  new-design <nama> [--from default]   salin design ke <deck>/designs/<nama>/
  new-theme <nama> [--from navy]       salin theme ke <deck>/themes/<nama>.css
  lint [--all]                         cek aturan design + theme milik deck (--all: juga bawaan)
  list                                 design, theme, motion yang tersedia (bawaan + milik deck)

  path                       cetak folder paket (template, designs, docs)
  --version, --help`;

const die = (m) => { console.error("  x " + m); process.exit(1); };
const names = (dir, ext) => fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => ext ? n.endsWith(ext) : fs.statSync(path.join(dir, n)).isDirectory()).map((n) => ext ? n.slice(0, -ext.length) : n).sort() : [];
const validName = (n) => /^[a-z0-9][a-z0-9-]*$/.test(n || "");

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const n of fs.readdirSync(from)) {
    const a = path.join(from, n), b = path.join(to, n);
    if (fs.statSync(a).isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}

if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") { console.log(HELP); process.exit(0); }
if (cmd === "--version" || cmd === "-v") { console.log(VERSION); process.exit(0); }
if (cmd === "path") { console.log(PKG); process.exit(0); }

if (TOOLS[cmd]) {
  /* deck di folder kerja → teruskan sebagai --root supaya tool tidak jatuh ke deck contoh di dalam paket */
  const args = [...rest];
  if (cmd !== "import" && !argOf("root", rest) && !argOf("html", rest)) args.push("--root", process.cwd());
  const r = spawnSync(process.execPath, [path.join(PKG, TOOLS[cmd]), ...args], { stdio: "inherit" });
  process.exit(r.status === null ? 1 : r.status);
}

const SRC = argOf("root", rest) ? path.resolve(argOf("root", rest)) : process.cwd();

if (cmd === "init") {
  const dir = rest[0] && !rest[0].startsWith("--") ? path.resolve(rest[0]) : SRC;
  if (fs.existsSync(path.join(dir, "deck.json"))) die("sudah ada deck.json di " + dir);
  fs.mkdirSync(path.join(dir, "slides"), { recursive: true });
  const deck = { title: "Deck Baru", footer: "Deck Baru", output: "deck.html", design: "default", theme: "navy", motion: "corporate" };
  fs.writeFileSync(path.join(dir, "deck.json"), JSON.stringify(deck, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "slides", "01-cover.html"),
    '<slide layout="title">\n<ph name="kicker">KICKER</ph>\n<ph name="title">Judul deck</ph>\n<ph name="subtitle">Subjudul · tanggal</ph>\n</slide>\n');
  fs.writeFileSync(path.join(dir, "slides", "02-isi.html"),
    '<slide layout="title-content">\n<ph name="kicker">BAGIAN 1</ph>\n<ph name="title">Judul slide</ph>\n<ph name="body">\n<ul class="bul">\n<li>Poin pertama</li>\n<li>Poin kedua</li>\n</ul>\n</ph>\n<ph name="takeaway"><b>Kesimpulan:</b> satu kalimat.</ph>\n</slide>\n');
  if (!fs.existsSync(path.join(dir, ".gitignore"))) fs.writeFileSync(path.join(dir, ".gitignore"), "dist/\n.slideck-check/\n");
  console.log("deck baru di " + dir + "\n  ubah deck.json, tulis slides/NN-nama.html, lalu: slideck build && slideck pdf");
  process.exit(0);
}

if (cmd === "new-design" || cmd === "new-theme") {
  const isDesign = cmd === "new-design";
  const name = rest[0];
  if (!validName(name)) die("nama hanya huruf kecil, angka, '-' (mis. " + (isDesign ? "acme-report" : "acme") + ")");
  const from = argOf("from", rest) || (isDesign ? "default" : "navy");
  const kind = isDesign ? "designs" : "themes";
  const src = [path.join(SRC, kind, isDesign ? from : from + ".css"), path.join(PKG, kind, isDesign ? from : from + ".css")].find((p) => fs.existsSync(p));
  if (!src) die((isDesign ? "design" : "theme") + " sumber tidak ada: " + from + ". Ada: " + names(path.join(PKG, kind), isDesign ? null : ".css").join(", "));
  const dest = path.join(SRC, kind, isDesign ? name : name + ".css");
  if (fs.existsSync(dest)) die("sudah ada: " + dest);
  if (isDesign) {
    copyDir(src, dest);
    const metaPath = path.join(dest, "design.json");
    const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, "utf8")) : {};
    Object.assign(meta, { name, label: name, description: "Design milik deck, diturunkan dari " + from + ". Ganti deskripsi ini." });
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
    const cssPath = path.join(dest, "components.css");
    fs.writeFileSync(cssPath, fs.readFileSync(cssPath, "utf8").replace(/^\/\*[^\n]*FROZEN[^\n]*\*\/\n?/, "/* design " + name + " — turunan " + from + ". Aturan: docs/custom-design.md, cek: slideck lint */\n"));
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, "/* theme " + name + " — turunan " + from + ". Hanya :root{token}. Cek: slideck lint */\n" +
      fs.readFileSync(src, "utf8").replace(/^\/\*[\s\S]*?\*\/\s*/g, ""));
  }
  console.log("dibuat: " + path.relative(process.cwd(), dest) + "\n  pakai di deck.json: \"" + (isDesign ? "design" : "theme") + "\": \"" + name + "\" lalu slideck lint && slideck build");
  process.exit(0);
}

if (cmd === "lint") {
  const { lintDesign, lintTheme } = require("../lib/design-lint");
  const all = rest.includes("--all");
  const themes = [...new Set([...names(path.join(PKG, "themes"), ".css"), ...names(path.join(SRC, "themes"), ".css")])];
  const motions = [...new Set([...names(path.join(PKG, "motions"), ".css"), ...names(path.join(SRC, "motions"), ".css")])];
  const targets = [];
  for (const root of all ? [PKG, SRC] : [SRC]) {
    if (root === PKG && SRC === PKG && !all) continue;
    for (const n of names(path.join(root, "designs"))) targets.push(["design", root, lintDesign(path.join(root, "designs", n), { themes, motions })]);
    for (const n of names(path.join(root, "themes"), ".css")) targets.push(["theme", root, lintTheme(path.join(root, "themes", n + ".css"))]);
  }
  if (!targets.length) { console.log("tidak ada design/theme milik deck di " + SRC + " (slideck new-design <nama>, atau --all untuk bawaan)"); process.exit(0); }
  let bad = 0;
  for (const [kind, root, r] of targets) {
    const tag = (root === PKG && SRC !== PKG ? "bawaan " : "") + kind + " " + r.name;
    console.log((r.errors.length ? "x  " : r.warnings.length ? "!  " : "ok ") + tag);
    for (const e of r.errors) console.log("     x [" + e.rule + "] " + e.msg);
    for (const w of r.warnings) console.log("     ! [" + w.rule + "] " + w.msg);
    if (r.errors.length) bad++;
  }
  console.log(bad ? "\n" + bad + " gagal — aturan D1..D9 / T1..T4: docs/custom-design.md" : "\nSemua lolos.");
  process.exit(bad ? 1 : 0);
}

if (cmd === "list") {
  const show = (label, kind, ext) => {
    const own = names(path.join(SRC, kind), ext);
    const builtIn = names(path.join(PKG, kind), ext);
    console.log(label + ": " + builtIn.join(", ") + (own.length && SRC !== PKG ? "\n  milik deck: " + own.join(", ") : ""));
  };
  show("design", "designs"); show("theme", "themes", ".css"); show("motion", "motions", ".css");
  process.exit(0);
}

die("perintah tidak dikenal: " + cmd + " (slideck --help)");
