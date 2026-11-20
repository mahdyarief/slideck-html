"use strict";
/* lib/xml.js — parser XML kecil tanpa dependensi untuk membaca part OOXML (.pptx).
   Hasil: elemen { n: "a:t", a: {atribut}, c: [anak: elemen | string] }. Nama tetap berprefiks
   (a:, p:, c:, dgm:, r:) seperti di file — prefiks OOXML praktis selalu sama di semua penulis.
   Tidak mendukung DTD; komentar, PI dan CDATA ditangani. */

const ENT = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };
const decode = (s) => s.indexOf("&") < 0 ? s : s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, e) => {
  if (e[0] === "#") {
    const cp = e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "";
  }
  return ENT[e] != null ? ENT[e] : m;
});

function parseXml(src) {
  if (Buffer.isBuffer(src)) src = src.toString("utf8");
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);
  const root = { n: "#document", a: {}, c: [] };
  const stack = [root];
  const reAttr = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let i = 0;
  const len = src.length;
  while (i < len) {
    const lt = src.indexOf("<", i);
    if (lt < 0) break;
    if (lt > i) {
      const t = src.slice(i, lt);
      if (stack.length > 1) stack[stack.length - 1].c.push(decode(t));
    }
    if (src.startsWith("<!--", lt)) { const e = src.indexOf("-->", lt + 4); i = e < 0 ? len : e + 3; continue; }
    if (src.startsWith("<![CDATA[", lt)) {
      const e = src.indexOf("]]>", lt + 9);
      stack[stack.length - 1].c.push(src.slice(lt + 9, e < 0 ? len : e));
      i = e < 0 ? len : e + 3;
      continue;
    }
    if (src[lt + 1] === "?" || src[lt + 1] === "!") { const e = src.indexOf(">", lt); i = e < 0 ? len : e + 1; continue; }
    const gt = src.indexOf(">", lt);
    if (gt < 0) break;
    if (src[lt + 1] === "/") {
      const name = src.slice(lt + 2, gt).trim();
      while (stack.length > 1) { const top = stack.pop(); if (top.n === name) break; }
      i = gt + 1;
      continue;
    }
    let body = src.slice(lt + 1, gt);
    const selfClose = body.endsWith("/");
    if (selfClose) body = body.slice(0, -1);
    const sp = body.search(/\s/);
    const name = sp < 0 ? body : body.slice(0, sp);
    const el = { n: name, a: {}, c: [] };
    if (sp >= 0) {
      reAttr.lastIndex = 0;
      const rest = body.slice(sp);
      let m;
      while ((m = reAttr.exec(rest))) el.a[m[1]] = decode(m[3] != null ? m[3] : m[4]);
    }
    stack[stack.length - 1].c.push(el);
    if (!selfClose) stack.push(el);
    i = gt + 1;
  }
  return root.c.find((x) => typeof x === "object") || null;
}

/* ---- penelusuran ---- */
const kids = (el, name) => (el ? el.c.filter((x) => typeof x === "object" && (!name || x.n === name)) : []);
const kid = (el, name) => (el ? el.c.find((x) => typeof x === "object" && x.n === name) || null : null);
/* jalur "p:cSld/p:spTree" */
const path = (el, p) => p.split("/").reduce((e, n) => kid(e, n), el);
/* cari keturunan pertama (depth-first) bernama name */
function find(el, name) {
  if (!el) return null;
  for (const x of el.c) {
    if (typeof x !== "object") continue;
    if (x.n === name) return x;
    const r = find(x, name);
    if (r) return r;
  }
  return null;
}
function findAll(el, name, out = []) {
  if (!el) return out;
  for (const x of el.c) {
    if (typeof x !== "object") continue;
    if (x.n === name) out.push(x);
    findAll(x, name, out);
  }
  return out;
}
const text = (el) => (!el ? "" : el.c.map((x) => (typeof x === "string" ? x : text(x))).join(""));
const attr = (el, k, d) => (el && el.a[k] != null ? el.a[k] : d);

module.exports = { parseXml, kids, kid, path, find, findAll, text, attr, decode };
