/* slideck-html build.js — gabung slides/*.html → dist/<deck>.html. Zero dependency (node stdlib only). */
const fs = require("fs");
const path = require("path");
const DIR = __dirname;
const deck = JSON.parse(fs.readFileSync(path.join(DIR, "deck.json"), "utf8"));
const template = fs.readFileSync(path.join(DIR, "template.html"), "utf8");
const base = fs.readFileSync(path.join(DIR, "components.css"), "utf8");
const themeName = deck.theme || "navy";
const motionName = deck.motion || "corporate";
let extra = "";
try { extra += "\n" + fs.readFileSync(path.join(DIR, "themes", themeName + ".css"), "utf8"); } catch (e) { console.error("theme tidak ketemu: " + themeName + ", pakai default navy"); }
try { extra += "\n" + fs.readFileSync(path.join(DIR, "motions", motionName + ".css"), "utf8"); } catch (e) { console.error("motion tidak ketemu: " + motionName + ", pakai default corporate"); }
const components = base + extra;
const files = fs.readdirSync(path.join(DIR, "slides")).filter(f => f.endsWith(".html")).sort();
if (!files.length) { console.error("slides/ kosong — copy dari templates/ dulu."); process.exit(1); }
const total = files.length;
const slides = files.map((f, i) => {
  let s = fs.readFileSync(path.join(DIR, "slides", f), "utf8");
  s = s.split("{{N}}").join(String(i + 1)).split("{{TOTAL}}").join(String(total));
  s = s.split("[Footer kiri]").join(deck.footer);
  return "<!-- " + f + " -->\n" + s;
}).join("\n");
const out = template
  .split("{{TITLE}}").join(deck.title)
  .split("{{COMPONENTS}}").join(components)
  .split("{{SLIDES}}").join(slides);
fs.mkdirSync(path.join(DIR, "dist"), { recursive: true });
const outPath = path.join(DIR, "dist", deck.output);
fs.writeFileSync(outPath, out);
console.log("DONE " + outPath + " (" + total + " slides, " + Buffer.byteLength(out) + " bytes)");
