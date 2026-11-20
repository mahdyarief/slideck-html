"use strict";
/* lib/font.js — font tanpa dependensi: WOFF 1.0 → TTF (sfnt), info tabel name/OS2/head, TTF → EOT.
   Dipakai build.js (inline @font-face) dan pptx.js (embed font ke .pptx sebagai /ppt/fonts/*.fntdata).

   EOT yang ditulis: versi 0x00020001, Flags 0 (tanpa MTX, tanpa XOR) — format yang ditulis PowerPoint
   untuk .fntdata dan dibaca kembali tanpa perlu dekompresi. Semua field little-endian. */
const zlib = require("zlib");

const tag = (b, o) => b.toString("latin1", o, o + 4);

/* WOFF 1.0 → sfnt. Buffer sfnt (TTF/OTF) dikembalikan apa adanya. */
function toSfnt(buf) {
  const sig = buf.readUInt32BE(0);
  if (sig === 0x00010000 || sig === 0x4f54544f || sig === 0x74727565) return buf;
  if (sig === 0x774f4632) throw new Error("WOFF2 tidak didukung — pakai .woff (1.0) atau .ttf");
  if (sig !== 0x774f4646) throw new Error("bukan font (signature 0x" + sig.toString(16) + ")");
  const flavor = buf.readUInt32BE(4);
  const n = buf.readUInt16BE(12);
  const tables = [];
  for (let i = 0; i < n; i++) {
    const o = 44 + i * 20;
    const t = { tag: tag(buf, o), offset: buf.readUInt32BE(o + 4), comp: buf.readUInt32BE(o + 8), orig: buf.readUInt32BE(o + 12), sum: buf.readUInt32BE(o + 16) };
    const raw = buf.subarray(t.offset, t.offset + t.comp);
    t.data = t.comp < t.orig ? zlib.inflateSync(raw) : Buffer.from(raw);
    if (t.data.length !== t.orig) throw new Error("tabel " + t.tag + " rusak");
    tables.push(t);
  }
  tables.sort((a, b) => (a.tag < b.tag ? -1 : 1));
  let es = 0;
  while (1 << (es + 1) <= n) es++;
  const sr = (1 << es) * 16;
  const head = Buffer.alloc(12 + 16 * n);
  head.writeUInt32BE(flavor, 0);
  head.writeUInt16BE(n, 4);
  head.writeUInt16BE(sr, 6);
  head.writeUInt16BE(es, 8);
  head.writeUInt16BE(n * 16 - sr, 10);
  let off = head.length;
  const parts = [head];
  tables.forEach((t, i) => {
    const d = 12 + i * 16;
    head.write(t.tag, d, "latin1");
    head.writeUInt32BE(t.sum, d + 4);
    head.writeUInt32BE(off, d + 8);
    head.writeUInt32BE(t.data.length, d + 12);
    const pad = (4 - (t.data.length % 4)) % 4;
    parts.push(t.data, Buffer.alloc(pad));
    off += t.data.length + pad;
  });
  return Buffer.concat(parts);
}

function tableMap(sfnt) {
  const n = sfnt.readUInt16BE(4);
  const m = {};
  for (let i = 0; i < n; i++) {
    const d = 12 + i * 16;
    m[tag(sfnt, d)] = sfnt.subarray(sfnt.readUInt32BE(d + 8), sfnt.readUInt32BE(d + 8) + sfnt.readUInt32BE(d + 12));
  }
  return m;
}

/* nama dari tabel name: utamakan Windows Unicode en-US, lalu Windows apa saja, lalu Mac Roman */
function names(nameTbl) {
  const out = {};
  if (!nameTbl) return out;
  const count = nameTbl.readUInt16BE(2);
  const strOff = nameTbl.readUInt16BE(4);
  const rank = {};
  for (let i = 0; i < count; i++) {
    const r = 6 + i * 12;
    const plat = nameTbl.readUInt16BE(r), enc = nameTbl.readUInt16BE(r + 2), lang = nameTbl.readUInt16BE(r + 4);
    const id = nameTbl.readUInt16BE(r + 6), len = nameTbl.readUInt16BE(r + 8), o = strOff + nameTbl.readUInt16BE(r + 10);
    let s, k;
    if (plat === 3 && (enc === 1 || enc === 0)) {
      const b = Buffer.from(nameTbl.subarray(o, o + len));
      b.swap16();
      s = b.toString("utf16le");
      k = lang === 0x409 ? 3 : 2;
    } else if (plat === 1 && enc === 0) { s = nameTbl.toString("latin1", o, o + len); k = 1; }
    else continue;
    if (!(rank[id] >= k)) { rank[id] = k; out[id] = s; }
  }
  return out;
}

/* ringkasan font untuk EOT, @font-face dan p:embeddedFont */
function fontInfo(sfnt) {
  const t = tableMap(sfnt);
  const os2 = t["OS/2"], head = t.head;
  const nm = names(t.name);
  if (!os2 || !head) throw new Error("font tanpa tabel OS/2 atau head");
  const ver = os2.readUInt16BE(0);
  const fsSel = os2.readUInt16BE(62);
  return {
    family: nm[1] || "", subfamily: nm[2] || "", full: nm[4] || "", version: nm[5] || "",
    typoFamily: nm[16] || nm[1] || "", typoSub: nm[17] || nm[2] || "",
    weight: os2.readUInt16BE(4),
    fsType: os2.readUInt16BE(8),
    panose: Buffer.from(os2.subarray(32, 42)),
    unicodeRange: [42, 46, 50, 54].map((o) => os2.readUInt32BE(o)),
    codePageRange: ver >= 1 ? [os2.readUInt32BE(78), os2.readUInt32BE(82)] : [1, 0],
    italic: !!(fsSel & 1),
    bold: !!(fsSel & 32),
    checkSumAdjustment: head.readUInt32BE(8),
    variable: !!t.fvar,
    glyphs: t.maxp ? t.maxp.readUInt16BE(4) : 0
  };
}

/* fsType: 0x0002 = Restricted License (tidak boleh di-embed). Bit lain (4 preview/print, 8 editable) boleh. */
const embeddable = (info) => (info.fsType & 0x000f) !== 0x0002;

/* sfnt → EOT (versi 0x00020001, tanpa kompresi/obfuscation) */
function toEot(sfnt, info) {
  info = info || fontInfo(sfnt);
  const str = (s) => {
    const b = Buffer.from(s || "", "utf16le");
    const h = Buffer.alloc(4);
    h.writeUInt16LE(0, 0); // padding
    h.writeUInt16LE(b.length, 2);
    return Buffer.concat([h, b]);
  };
  /* 80 byte field tetap; Padding1 + FamilyNameSize (offset 80/82) ditulis oleh str() di bawah */
  const fixed = Buffer.alloc(80);
  let o = 0;
  const u32 = (v) => { fixed.writeUInt32LE(v >>> 0, o); o += 4; };
  const u16 = (v) => { fixed.writeUInt16LE(v, o); o += 2; };
  const u8 = (v) => { fixed.writeUInt8(v, o); o += 1; };
  u32(0); // EOTSize, diisi di akhir
  u32(sfnt.length); // FontDataSize
  u32(0x00020002); // Version 2.2 — sama dengan .fntdata yang ditulis PowerPoint
  u32(0); // Flags: tanpa subset/MTX/XOR
  info.panose.copy(fixed, o); o += 10;
  u8(0); // Charset ANSI_CHARSET (nilai yang ditulis PowerPoint)
  u8(info.italic ? 1 : 0);
  u32(info.weight);
  u16(info.fsType);
  u16(0x504c); // MagicNumber
  info.unicodeRange.forEach(u32);
  info.codePageRange.forEach(u32);
  u32(info.checkSumAdjustment);
  u32(0); u32(0); u32(0); u32(0); // Reserved1..4
  const tail = Buffer.concat([
    /* sama seperti .fntdata tulisan PowerPoint: FamilyName & StyleName diakhiri NUL, VersionName & FullName tidak */
    str(info.family + "\0"), str(info.subfamily + "\0"), str(info.version), str(info.full),
    str(""), // Padding5 + RootStringSize 0 (tanpa pembatasan situs)
    /* v2.2: RootStringCheckSum, EUDCCodePage, Padding6, SignatureSize(0), EUDCFlags, EUDCFontSize(0) */
    Buffer.alloc(4 + 4 + 2 + 2 + 4 + 4)
  ]);
  const eot = Buffer.concat([fixed, tail, sfnt]);
  eot.writeUInt32LE(eot.length, 0);
  return eot;
}

/* EOT → sfnt (untuk verifikasi bolak-balik; hanya EOT tanpa kompresi/XOR) */
function fromEot(eot) {
  const size = eot.readUInt32LE(4), flags = eot.readUInt32LE(12);
  if (eot.readUInt16LE(34) !== 0x504c) throw new Error("bukan EOT");
  if (flags & 0x14) throw new Error("EOT terkompresi/ter-XOR tidak didukung");
  return eot.subarray(eot.length - size);
}

/* WOFF 1.0 dari sfnt — untuk @font-face bila sumbernya .ttf */
function sfntToWoff(sfnt) {
  const n = sfnt.readUInt16BE(4);
  const ents = [];
  for (let i = 0; i < n; i++) {
    const d = 12 + i * 16;
    const data = sfnt.subarray(sfnt.readUInt32BE(d + 8), sfnt.readUInt32BE(d + 8) + sfnt.readUInt32BE(d + 12));
    const z = zlib.deflateSync(data, { level: 9 });
    ents.push({ tag: tag(sfnt, d), sum: sfnt.readUInt32BE(d + 4), orig: data, comp: z.length < data.length ? z : data });
  }
  const head = Buffer.alloc(44 + 20 * n);
  let off = head.length;
  const parts = [head];
  ents.forEach((e, i) => {
    const d = 44 + i * 20;
    head.write(e.tag, d, "latin1");
    head.writeUInt32BE(off, d + 4);
    head.writeUInt32BE(e.comp.length, d + 8);
    head.writeUInt32BE(e.orig.length, d + 12);
    head.writeUInt32BE(e.sum, d + 16);
    const pad = (4 - (e.comp.length % 4)) % 4;
    parts.push(e.comp, Buffer.alloc(pad));
    off += e.comp.length + pad;
  });
  head.writeUInt32BE(0x774f4646, 0);
  head.writeUInt32BE(sfnt.readUInt32BE(0), 4);
  head.writeUInt32BE(off, 8);
  head.writeUInt16BE(n, 12);
  head.writeUInt32BE(sfnt.length, 16);
  head.writeUInt16BE(1, 20);
  return Buffer.concat(parts);
}

/* format @font-face + mime dari isi file */
function webFormat(buf) {
  const sig = buf.readUInt32BE(0);
  if (sig === 0x774f4632) return { mime: "font/woff2", format: "woff2" };
  if (sig === 0x774f4646) return { mime: "font/woff", format: "woff" };
  if (sig === 0x4f54544f) return { mime: "font/otf", format: "opentype" };
  return { mime: "font/ttf", format: "truetype" };
}

module.exports = { toSfnt, fontInfo, toEot, fromEot, sfntToWoff, webFormat, embeddable, names, tableMap };
