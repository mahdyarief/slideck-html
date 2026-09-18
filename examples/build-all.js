/* Build setiap contoh di examples/<name>/ lalu salin hasilnya ke examples/html/<name>.html.
   Jalankan dari mana saja:  node examples/build-all.js   */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const EX = __dirname;
const OUT = path.join(EX, "html");

const dirs = fs.readdirSync(EX)
  .filter((n) => fs.existsSync(path.join(EX, n, "deck.json")))
  .sort();

if (!dirs.length) { console.error("x tidak ada contoh dengan deck.json di examples/"); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

let fail = 0;
for (const name of dirs) {
  const dir = path.join(EX, name);
  const deck = JSON.parse(fs.readFileSync(path.join(dir, "deck.json"), "utf8"));
  try {
    const log = execFileSync("node", [path.join(ROOT, "build.js"), "--root", dir], { cwd: ROOT, encoding: "utf8" });
    const produced = path.join(dir, "dist", deck.output);
    fs.copyFileSync(produced, path.join(OUT, name + ".html"));
    fs.rmSync(path.join(dir, "dist"), { recursive: true, force: true });
    const kb = Math.round(fs.statSync(path.join(OUT, name + ".html")).size / 1024);
    console.log("ok  " + name.padEnd(18) + " -> examples/html/" + name + ".html  (" + kb + " KB)");
  } catch (e) {
    fail++;
    console.error("x   " + name + ": " + (e.stdout || e.message));
  }
}
console.log(fail ? "\n" + fail + " contoh gagal." : "\n" + dirs.length + " contoh dibangun ke examples/html/.");
