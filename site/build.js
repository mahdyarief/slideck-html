/* Landing page slideck-html → _site/ (dideploy GitHub Pages oleh .github/workflows/pages.yml).
   Landing page-nya sendiri adalah deck slideck-html: site/en (/) dan site/id (/id/).
   node site/build.js [--fast]   (--fast: lewati PDF/PPTX dan thumbnail yang sudah ada) */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { findBrowser, fileUrl, runHeadless } = require("../lib/browser");

const ROOT = path.resolve(__dirname, "..");
const SITE = __dirname;
const OUT = path.join(ROOT, "_site");
const THUMBS = path.join(SITE, "thumbs");
const TMP = path.join(SITE, ".tmp");
const FAST = process.argv.includes("--fast");
const DOMAIN = "slideck.nimb.us.ci";

/* design → contoh yang memperlihatkannya; theme → dibangun di design default agar warnanya bisa dibandingkan */
const DESIGNS = {
  default: "default-navy", editorial: "editorial-navy", brutalist: "brutalist-navy", geometric: "geometric-navy",
  architectural: "architectural-navy", ribbon: "ribbon-navy", plate: "plate-navy", campus: "campus-paper",
  keynote: "keynote-navy", colloquium: "colloquium-paper", lesson: "lesson-paper", spotlight: "spotlight-navy",
  "dark-academia": "dark-academia-navy", consulting: "consulting-slate-rust", scholar: "scholar-petrol-gold",
  organic: "organic-petrol-gold", minimal: "minimal-terracotta", "campus-slide": "campus-slide", lineart: "lineart-parchment-gold"
};
const THEMES = ["navy", "paper", "botanical", "swiss", "neon", "slate-rust", "petrol-gold", "terracotta", "parchment-gold", "campus-slide"];

const run = (args) => execFileSync(process.execPath, args, { cwd: ROOT, stdio: ["ignore", "inherit", "inherit"] });
const step = (s) => console.log("\n== " + s);
const browser = findBrowser();
if (!browser) { console.error("x Chrome/Edge/Chromium tidak ditemukan (set CHROME_PATH)"); process.exit(1); }
function shot(html, out, slide, w, h) {
  if (FAST && fs.existsSync(out)) return;
  // salinan tanpa animasi: tangkapan layar headless diambil sebelum reveal selesai, angka/teks tampak pudar
  const still = path.join(path.dirname(html), ".thumb-" + path.basename(html));
  fs.writeFileSync(still, fs.readFileSync(html, "utf8").replace("</body>", "<style>*,*::before,*::after{transition:none!important;animation:none!important}</style></body>"));
  try {
    runHeadless(browser, ["--screenshot=" + out, "--window-size=" + w + "," + h, "--force-device-scale-factor=1"], fileUrl(still) + "?clean#" + slide, { budget: 4000 });
  } finally { fs.rmSync(still, { force: true }); }
  if (!fs.existsSync(out)) throw new Error("tangkapan layar gagal: " + out);
}

step("contoh");
run([path.join("examples", "build-all.js")]);

step("thumbnail");
fs.mkdirSync(THUMBS, { recursive: true });
for (const [d, ex] of Object.entries(DESIGNS)) shot(path.join(ROOT, "examples", "html", ex + ".html"), path.join(THUMBS, "design-" + d + ".png"), 1, 640, 360);
for (const t of THEMES) {
  const out = path.join(THUMBS, "theme-" + t + ".png");
  if (FAST && fs.existsSync(out)) continue;
  const dir = path.join(TMP, "theme-" + t);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "deck.json"), JSON.stringify({ title: t, footer: "slideck-html | theme " + t, output: "t.html",
    slides: path.relative(dir, path.join(ROOT, "examples", "slides")).replace(/\\/g, "/"), design: t === "campus-slide" ? "campus-slide" : "default", theme: t }));
  run(["build.js", "--root", dir]);
  shot(path.join(dir, "dist", "t.html"), out, 2, 640, 360);
}
console.log("  " + fs.readdirSync(THUMBS).length + " thumbnail");

step("deck landing page");
fs.rmSync(OUT, { recursive: true, force: true });
const css = fs.readFileSync(path.join(SITE, "site.css"), "utf8");
for (const lang of ["en", "id"]) {
  const dir = path.join(SITE, lang);
  fs.writeFileSync(path.join(dir, "slides", "site.css"), css);
  run(["build.js", "--root", dir]);
  const deck = JSON.parse(fs.readFileSync(path.join(dir, "deck.json"), "utf8"));
  const built = path.join(dir, "dist", deck.output);
  const target = lang === "en" ? OUT : path.join(OUT, lang);
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(built, path.join(target, "index.html"));
  fs.mkdirSync(path.join(OUT, "downloads"), { recursive: true });
  fs.copyFileSync(built, path.join(OUT, "downloads", "slideck-html-" + lang + ".html"));
  if (!FAST) {
    run(["pdf.js", "--root", dir]);
    run(["pptx.js", "--root", dir]);
    for (const ext of [".pdf", ".pptx"]) fs.copyFileSync(built.replace(/\.html$/, ext), path.join(OUT, "downloads", "slideck-html-" + lang + ext));
  }
}

step("contoh + aset");
fs.mkdirSync(path.join(OUT, "examples"), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, "examples", "html"))) fs.copyFileSync(path.join(ROOT, "examples", "html", f), path.join(OUT, "examples", f));
shot(path.join(OUT, "index.html"), path.join(OUT, "og.png"), 1, 1280, 720);
fs.copyFileSync(path.join(SITE, "favicon.svg"), path.join(OUT, "favicon.svg"));
fs.writeFileSync(path.join(OUT, "CNAME"), DOMAIN + "\n");
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
fs.writeFileSync(path.join(OUT, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: https://" + DOMAIN + "/sitemap.xml\n");
fs.writeFileSync(path.join(OUT, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  ["/", "/id/"].map((u) => "  <url><loc>https://" + DOMAIN + u + "</loc></url>").join("\n") + "\n</urlset>\n");
fs.rmSync(TMP, { recursive: true, force: true });

let n = 0, kb = 0;
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else { n++; kb += fs.statSync(p).size / 1024; } } })(OUT);
console.log("\nok _site/: " + n + " file, " + Math.round(kb) + " KB → https://" + DOMAIN + "/");
