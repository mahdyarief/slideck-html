/* slideck-html lib/ooxml.js — perakit paket PresentationML (.pptx) untuk pptx.js.
   Masukan: model deck dalam px stage (1920x1080). Keluaran: daftar part { name, data } siap di-zip.
   Zero dependency (node stdlib only). 1 px stage = 6350 EMU; 1 px ukuran font = 0,5 pt. */
const crypto = require("crypto");

const EMU_PER_PX = 6350;
const SLIDE_W = 12192000;
const SLIDE_H = 6858000;

const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const NS_ALL = ' xmlns:a="' + NS_A + '" xmlns:r="' + NS_R + '" xmlns:p="' + NS_P + '"';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
const CT = "application/vnd.openxmlformats-officedocument.presentationml.";
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/* Nama preset geometri yang sah (ST_ShapeType). Nama di luar daftar ini membuat file minta repair. */
const PRESETS = new Set(("line lineInv triangle rtTriangle rect diamond parallelogram trapezoid nonIsoscelesTrapezoid pentagon hexagon heptagon octagon " +
  "decagon dodecagon star4 star5 star6 star7 star8 star10 star12 star16 star24 star32 roundRect round1Rect round2SameRect round2DiagRect " +
  "snipRoundRect snip1Rect snip2SameRect snip2DiagRect plaque ellipse teardrop homePlate chevron pieWedge pie blockArc donut noSmoking " +
  "rightArrow leftArrow upArrow downArrow stripedRightArrow notchedRightArrow bentUpArrow leftRightArrow upDownArrow leftUpArrow " +
  "leftRightUpArrow quadArrow leftArrowCallout rightArrowCallout upArrowCallout downArrowCallout leftRightArrowCallout upDownArrowCallout " +
  "quadArrowCallout bentArrow uturnArrow circularArrow leftCircularArrow leftRightCircularArrow curvedRightArrow curvedLeftArrow " +
  "curvedUpArrow curvedDownArrow swooshArrow cube can lightningBolt heart sun moon smileyFace irregularSeal1 irregularSeal2 foldedCorner " +
  "bevel frame halfFrame corner diagStripe chord arc leftBracket rightBracket leftBrace rightBrace bracketPair bracePair " +
  "straightConnector1 bentConnector2 bentConnector3 bentConnector4 bentConnector5 curvedConnector2 curvedConnector3 curvedConnector4 " +
  "curvedConnector5 callout1 callout2 callout3 accentCallout1 accentCallout2 accentCallout3 borderCallout1 borderCallout2 borderCallout3 " +
  "accentBorderCallout1 accentBorderCallout2 accentBorderCallout3 wedgeRectCallout wedgeRoundRectCallout wedgeEllipseCallout cloudCallout " +
  "cloud ribbon ribbon2 ellipseRibbon ellipseRibbon2 leftRightRibbon verticalScroll horizontalScroll wave doubleWave plus " +
  "flowChartProcess flowChartDecision flowChartInputOutput flowChartPredefinedProcess flowChartInternalStorage flowChartDocument " +
  "flowChartMultidocument flowChartTerminator flowChartPreparation flowChartManualInput flowChartManualOperation flowChartConnector " +
  "flowChartPunchedCard flowChartPunchedTape flowChartSummingJunction flowChartOr flowChartCollate flowChartSort flowChartExtract " +
  "flowChartMerge flowChartOfflineStorage flowChartOnlineStorage flowChartMagneticTape flowChartMagneticDisk flowChartMagneticDrum " +
  "flowChartDisplay flowChartDelay flowChartAlternateProcess flowChartOffpageConnector actionButtonBlank actionButtonHome " +
  "actionButtonHelp actionButtonInformation actionButtonForwardNext actionButtonBackPrevious actionButtonEnd actionButtonBeginning " +
  "actionButtonReturn actionButtonDocument actionButtonSound actionButtonMovie gear6 gear9 funnel mathPlus mathMinus mathMultiply " +
  "mathDivide mathEqual mathNotEqual cornerTabs squareTabs plaqueTabs chartX chartStar chartPlus").split(" "));

/* ---------- util ---------- */
const emu = (px) => Math.round((Number(px) || 0) * EMU_PER_PX);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/* escape teks/atribut XML + buang karakter yang tidak sah di XML 1.0 (kontrol, surrogate lepas) */
const esc = (s) => String(s == null ? "" : s)
  .replace(/[^\x09\x0A\x0D\x20-퟿-�\u{10000}-\u{10FFFF}]/gu, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hexOk = (h) => (/^[0-9A-Fa-f]{6}$/.test(h || "") ? h.toUpperCase() : "000000");

function clr(c) {
  const a = c && c.a != null ? clamp(c.a, 0, 1) : 1;
  return '<a:srgbClr val="' + hexOk(c && c.hex) + '">' + (a < 0.999 ? '<a:alpha val="' + Math.round(a * 100000) + '"/>' : "") + "</a:srgbClr>";
}
const solid = (c) => "<a:solidFill>" + clr(c) + "</a:solidFill>";

function xfrm(tag, it) {
  const w = Math.max(0, emu(it.w)), h = Math.max(0, emu(it.h));
  let rot = "";
  if (it.rot) {
    const r = ((Math.round(it.rot * 60000) % 21600000) + 21600000) % 21600000;
    if (r) rot = ' rot="' + r + '"';
  }
  return "<" + tag + rot + '><a:off x="' + emu(it.x) + '" y="' + emu(it.y) + '"/><a:ext cx="' + w + '" cy="' + h + '"/></' + tag + ">";
}

/* geometri: rect | ellipse | round(adj) | prst(nama) | cust(4 sudut [rx,ry] px) */
function geomXml(g, w, h) {
  g = g || { t: "rect" };
  if (g.t === "ellipse") return '<a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom>';
  if (g.t === "round") {
    return '<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ' + clamp(Math.round(g.adj), 0, 50000) + '"/></a:avLst></a:prstGeom>';
  }
  if (g.t === "prst") return '<a:prstGeom prst="' + (PRESETS.has(g.prst) ? g.prst : "rect") + '"><a:avLst/></a:prstGeom>';
  if (g.t === "cust" && g.c && g.c.length === 4) {
    const W = Math.max(1, emu(w)), H = Math.max(1, emu(h));
    const c = g.c.map((p) => [clamp(emu(p[0]), 0, W), clamp(emu(p[1]), 0, H)]);
    const pt = (x, y) => '<a:pt x="' + x + '" y="' + y + '"/>';
    const arc = (r, st) => (r[0] > 0 && r[1] > 0 ? '<a:arcTo wR="' + r[0] + '" hR="' + r[1] + '" stAng="' + st + '" swAng="5400000"/>' : "");
    const [tl, tr, br, bl] = c;
    return '<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="' + W + '" h="' + H + '">' +
      "<a:moveTo>" + pt(tl[0], 0) + "</a:moveTo>" +
      "<a:lnTo>" + pt(W - tr[0], 0) + "</a:lnTo>" + arc(tr, 16200000) +
      "<a:lnTo>" + pt(W, H - br[1]) + "</a:lnTo>" + arc(br, 0) +
      "<a:lnTo>" + pt(bl[0], H) + "</a:lnTo>" + arc(bl, 5400000) +
      "<a:lnTo>" + pt(0, tl[1]) + "</a:lnTo>" + arc(tl, 10800000) +
      "<a:close/></a:path></a:pathLst></a:custGeom>";
  }
  return '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
}

const DASH = { solid: "solid", dashed: "dash", dotted: "sysDot" };
function lnXml(ln, tag) {
  tag = tag || "a:ln";
  if (!ln || !(ln.w > 0)) return "<" + tag + "><a:noFill/></" + tag + ">";
  return "<" + tag + ' w="' + clamp(emu(ln.w), 0, 20116800) + '" cap="flat" cmpd="sng" algn="ctr">' + solid(ln) +
    '<a:prstDash val="' + (DASH[ln.dash] || "solid") + '"/></' + tag + ">";
}

function fillXml(it) {
  if (it.grad && it.grad.stops && it.grad.stops.length >= 2) {
    const gs = it.grad.stops.map((s) => '<a:gs pos="' + clamp(Math.round(s.pos * 1000), 0, 100000) + '">' + clr(s) + "</a:gs>").join("");
    const ang = (((Math.round((it.grad.ang - 90) * 60000)) % 21600000) + 21600000) % 21600000;
    return '<a:gradFill rotWithShape="1"><a:gsLst>' + gs + '</a:gsLst><a:lin ang="' + ang + '" scaled="0"/></a:gradFill>';
  }
  return it.fill ? solid(it.fill) : "<a:noFill/>";
}

function effectXml(sh) {
  if (!sh) return "";
  const dist = Math.hypot(sh.dx, sh.dy);
  const dir = ((Math.round(Math.atan2(sh.dy, sh.dx) * 180 / Math.PI * 60000) % 21600000) + 21600000) % 21600000;
  const sc = (v) => (v && Math.abs(v - 1) > 0.005 ? Math.round(clamp(v, 0.1, 3) * 100000) : 0);
  /* spread CSS (sering negatif) → skala bayangan sx/sy terhadap pusat bentuk */
  return '<a:effectLst><a:outerShdw blurRad="' + emu(sh.blur) + '" dist="' + emu(dist) + '" dir="' + dir + '"' +
    (sc(sh.sx) ? ' sx="' + sc(sh.sx) + '"' : "") + (sc(sh.sy) ? ' sy="' + sc(sh.sy) + '"' : "") + ' algn="ctr" rotWithShape="0">' + clr(sh) + "</a:outerShdw></a:effectLst>";
}

/* ---------- teks ---------- */
function fontXml(name) {
  const f = esc(name || "Arial");
  return '<a:latin typeface="' + f + '"/><a:ea typeface="' + f + '"/><a:cs typeface="' + f + '"/>';
}

function rPrXml(tag, r, ctx, isEnd) {
  const sz = clamp(Math.round((r.sz || 18) * 50), 100, 400000);
  let a = ' lang="' + ctx.lang + '" sz="' + sz + '" b="' + (r.b ? 1 : 0) + '" i="' + (r.i ? 1 : 0) + '"';
  if (r.u) a += ' u="sng"';
  if (r.st) a += ' strike="sngStrike"';
  if (r.base) a += ' baseline="' + Math.round(r.base) + '"';
  if (r.spc) a += ' spc="' + clamp(Math.round(r.spc * 50), -400000, 400000) + '"';
  a += ' dirty="0"';
  let c = solid(r);
  if (r.hl && !isEnd) c += "<a:highlight>" + clr({ hex: r.hl.hex, a: 1 }) + "</a:highlight>";
  c += fontXml(r.font);
  if (r.href && !isEnd) c += '<a:hlinkClick r:id="' + ctx.link(r.href) + '"/>';
  return "<" + tag + a + ">" + c + "</" + tag + ">";
}

const BULLET_NUM = { decimal: "arabicPeriod", "lower-alpha": "alphaLcPeriod", "lower-latin": "alphaLcPeriod", "upper-alpha": "alphaUcPeriod",
  "upper-latin": "alphaUcPeriod", "lower-roman": "romanLcPeriod", "upper-roman": "romanUcPeriod" };

function paraXml(p, ctx) {
  const algn = { l: "l", ctr: "ctr", r: "r", just: "just" }[p.algn] || "l";
  let attrs = "";
  let bu = "<a:buNone/>";
  if (p.bullet) {
    const ind = Math.max(0, emu(p.bullet.indent));
    attrs += ' marL="' + ind + '" indent="' + -ind + '"';
    if (p.bullet.num && BULLET_NUM[p.bullet.num]) {
      bu = '<a:buFont typeface="+mj-lt"/><a:buAutoNum type="' + BULLET_NUM[p.bullet.num] + '" startAt="' + clamp(p.bullet.start || 1, 1, 32767) + '"/>';
    } else {
      bu = '<a:buFont typeface="Arial"/><a:buChar char="' + esc(p.bullet.char || "•") + '"/>';
    }
  } else {
    attrs += ' marL="0" indent="0"';
  }
  if (p.lvl) attrs += ' lvl="' + clamp(p.lvl, 0, 8) + '"';
  attrs += ' algn="' + algn + '"';
  const pct = clamp(Math.round((p.pct || 1) * 100000), 10000, 1000000);
  let out = "<a:p><a:pPr" + attrs + '><a:lnSpc><a:spcPct val="' + pct + '"/></a:lnSpc><a:spcBef><a:spcPts val="0"/></a:spcBef>' +
    '<a:spcAft><a:spcPts val="0"/></a:spcAft>' + bu + "</a:pPr>";
  let last = null;
  for (const r of p.runs || []) {
    last = r;
    if (r.br) out += "<a:br>" + rPrXml("a:rPr", r, ctx, true) + "</a:br>";
    else out += "<a:r>" + rPrXml("a:rPr", r, ctx) + "<a:t>" + esc(r.t) + "</a:t></a:r>";
  }
  out += (last ? rPrXml("a:endParaRPr", last, ctx, true) : '<a:endParaRPr lang="' + ctx.lang + '" dirty="0"/>') + "</a:p>";
  return out;
}

function txBodyXml(tag, body, ctx, plain) {
  const paras = (body && body.paras && body.paras.length) ? body.paras.map((p) => paraXml(p, ctx)).join("") :
    '<a:p><a:endParaRPr lang="' + ctx.lang + '" dirty="0"/></a:p>';
  let bp = "<a:bodyPr/>";
  if (!plain) {
    const ins = (body && body.ins) || [0, 0, 0, 0];
    const anchor = { t: "t", ctr: "ctr", b: "b" }[body && body.anchor] || "t";
    bp = '<a:bodyPr wrap="' + (body && body.wrap === "none" ? "none" : "square") + '" lIns="' + emu(ins[0]) + '" tIns="' + emu(ins[1]) +
      '" rIns="' + emu(ins[2]) + '" bIns="' + emu(ins[3]) + '" rtlCol="0" anchor="' + anchor + '"><a:noAutofit/></a:bodyPr>';
  }
  return "<" + tag + ">" + bp + "<a:lstStyle/>" + paras + "</" + tag + ">";
}

/* ---------- objek slide ---------- */
const nv = (id, name, descr) => '<p:cNvPr id="' + id + '" name="' + esc((name || "Objek") + " " + id) + '"' + (descr ? ' descr="' + esc(descr) + '"' : "") + "/>";

function spXml(it, id, ctx) {
  const isText = it.k === "tx";
  const spPr = "<p:spPr>" + xfrm("a:xfrm", it) + geomXml(it.geom, it.w, it.h) +
    (isText ? "<a:noFill/>" : fillXml(it) + lnXml(it.ln) + effectXml(it.shadow)) + "</p:spPr>";
  const body = isText ? it : it.text;
  return "<p:sp><p:nvSpPr>" + nv(id, it.name) + "<p:cNvSpPr" + (isText ? ' txBox="1"' : "") + "/><p:nvPr/></p:nvSpPr>" + spPr +
    (body ? txBodyXml("p:txBody", body, ctx) : "") + "</p:sp>";
}

function lineXml(it, id) {
  const x = Math.min(it.x1, it.x2), y = Math.min(it.y1, it.y2);
  const box = { x, y, w: Math.abs(it.x2 - it.x1), h: Math.abs(it.y2 - it.y1) };
  return "<p:cxnSp><p:nvCxnSpPr>" + nv(id, it.name || "Garis") + "<p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr>" + xfrm("a:xfrm", box) +
    '<a:prstGeom prst="line"><a:avLst/></a:prstGeom>' + lnXml(it) + "</p:spPr></p:cxnSp>";
}

function picXml(it, id, ctx) {
  const rid = ctx.media(it.media.buf, it.media.ext);
  let blipKids = "";
  if (it.alpha != null && it.alpha < 0.995) blipKids += '<a:alphaModFix amt="' + clamp(Math.round(it.alpha * 100000), 0, 100000) + '"/>';
  if (it.svgBuf) {
    blipKids += '<a:extLst><a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="' +
      ctx.media(it.svgBuf, "svg") + '"/></a:ext></a:extLst>';
  }
  let src = "";
  if (it.crop) {
    const f = (v) => clamp(Math.round((v || 0) * 100000), 0, 99000);
    src = '<a:srcRect l="' + f(it.crop.l) + '" t="' + f(it.crop.t) + '" r="' + f(it.crop.r) + '" b="' + f(it.crop.b) + '"/>';
  }
  return "<p:pic><p:nvPicPr>" + nv(id, it.name || "Gambar", it.alt) + '<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>' +
    '<p:blipFill><a:blip r:embed="' + rid + '">' + blipKids + "</a:blip>" + src + "<a:stretch><a:fillRect/></a:stretch></p:blipFill>" +
    "<p:spPr>" + xfrm("a:xfrm", it) + geomXml(it.geom, it.w, it.h) + "</p:spPr></p:pic>";
}

function tableXml(it, id, ctx) {
  const cols = it.cols.map((w) => Math.max(1, emu(w)));
  const rows = it.rows.map((h) => Math.max(1, emu(h)));
  const W = cols.reduce((a, b) => a + b, 0), H = rows.reduce((a, b) => a + b, 0);
  let x = '<p:graphicFrame><p:nvGraphicFramePr>' + nv(id, it.name || "Tabel") +
    '<p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>' +
    '<p:xfrm><a:off x="' + emu(it.x) + '" y="' + emu(it.y) + '"/><a:ext cx="' + W + '" cy="' + H + '"/></p:xfrm>' +
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr/><a:tblGrid>' +
    cols.map((w) => '<a:gridCol w="' + w + '"/>').join("") + "</a:tblGrid>";
  const side = (tag, b) => lnXml(b && b.w > 0 ? b : null, tag);
  for (let r = 0; r < rows.length; r++) {
    x += '<a:tr h="' + rows[r] + '">';
    for (let c = 0; c < cols.length; c++) {
      const cell = (it.cells[r] && it.cells[r][c]) || {};
      let a = "";
      if (cell.rs > 1) a += ' rowSpan="' + cell.rs + '"';
      if (cell.gs > 1) a += ' gridSpan="' + cell.gs + '"';
      if (cell.hm) a += ' hMerge="1"';
      if (cell.vm) a += ' vMerge="1"';
      const pad = cell.pad || [0, 0, 0, 0];
      const b = cell.b || {};
      const anchor = { t: "t", ctr: "ctr", b: "b" }[cell.anchor] || "t";
      x += "<a:tc" + a + ">" + txBodyXml("a:txBody", { paras: cell.paras || [] }, ctx, true) +
        '<a:tcPr marL="' + Math.max(0, emu(pad[0])) + '" marR="' + Math.max(0, emu(pad[2])) + '" marT="' + Math.max(0, emu(pad[1])) +
        '" marB="' + Math.max(0, emu(pad[3])) + '" anchor="' + anchor + '">' +
        side("a:lnL", b.l) + side("a:lnR", b.r) + side("a:lnT", b.t) + side("a:lnB", b.b) +
        (cell.fill ? solid(cell.fill) : "<a:noFill/>") + "</a:tcPr></a:tc>";
    }
    x += "</a:tr>";
  }
  return x + "</a:tbl></a:graphicData></a:graphic></p:graphicFrame>";
}

const GROUP_HEAD = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/>' +
  '<a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

/* transisi slide dari motion deck (motion v2 → transisi bawaan PowerPoint yang paling dekat) */
const TRANSITIONS = {
  corporate: '<p:transition spd="med"><p:fade/></p:transition>',
  cinematic: '<p:transition spd="slow"><p:fade/></p:transition>',
  editorial: '<p:transition spd="slow"><p:wipe dir="l"/></p:transition>',
  keynote: '<p:transition spd="med"><p:push dir="l"/></p:transition>',
};
/* data-step → animasi masuk "Fade" on click. groups: [[{id,k}], …] urut langkah; satu klik per langkah. */
function timingXml(groups) {
  if (!groups.length) return "";
  let n = 2;
  const nid = () => ++n;
  const tgt = (id) => '<p:tgtEl><p:spTgt spid="' + id + '"/></p:tgtEl>';
  const clicks = groups.map((g) => {
    const outer = nid(), inner = nid();
    const effs = g.map((s, j) => {
      const a = nid(), b = nid(), c = nid();
      return '<p:par><p:cTn id="' + a + '" presetID="10" presetClass="entr" presetSubtype="0" fill="hold" grpId="0" nodeType="' + (j ? "withEffect" : "clickEffect") + '">' +
        '<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>' +
        '<p:set><p:cBhvr><p:cTn id="' + b + '" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>' + tgt(s.id) +
        '<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>' +
        '<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="' + c + '" dur="400"/>' + tgt(s.id) + "</p:cBhvr></p:animEffect>" +
        "</p:childTnLst></p:cTn></p:par>";
    }).join("");
    return '<p:par><p:cTn id="' + outer + '" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>' +
      '<p:par><p:cTn id="' + inner + '" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>' + effs +
      "</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>";
  }).join("");
  const bld = groups.flat().map((s) => (s.k === "tbl" ? '<p:bldGraphic spid="' + s.id + '" grpId="0"><p:bldAsOne/></p:bldGraphic>'
    : s.k === "sp" || s.k === "tx" ? '<p:bldP spid="' + s.id + '" grpId="0" animBg="1"/>' : "")).join("");
  return '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>' +
    '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>' + clicks + "</p:childTnLst></p:cTn>" +
    '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>' +
    '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>' +
    "</p:childTnLst></p:cTn></p:par></p:tnLst>" + (bld ? "<p:bldLst>" + bld + "</p:bldLst>" : "") + "</p:timing>";
}

function slideXml(slide, ctx) {
  let id = 1;
  let shapes = "";
  const steps = new Map();
  for (const it of slide.items) {
    id++;
    if (it.k === "sp" || it.k === "tx") shapes += spXml(it, id, ctx);
    else if (it.k === "ln") shapes += lineXml(it, id);
    else if (it.k === "pic") shapes += picXml(it, id, ctx);
    else if (it.k === "tbl") shapes += tableXml(it, id, ctx);
    else { id--; continue; }
    if (it.step) { if (!steps.has(it.step)) steps.set(it.step, []); steps.get(it.step).push({ id, k: it.k }); }
  }
  const groups = [...steps.keys()].sort((a, b) => a - b).map((k) => steps.get(k));
  return XML_HEAD + "<p:sld" + NS_ALL + "><p:cSld><p:bg><p:bgPr>" + solid({ hex: slide.bg, a: 1 }) + "<a:effectLst/></p:bgPr></p:bg><p:spTree>" +
    GROUP_HEAD + shapes + "</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>" +
    (TRANSITIONS[ctx.motion] || "") + timingXml(groups) + "</p:sld>";
}

/* ---------- part statis ---------- */
const CLR_MAP = 'bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" ' +
  'accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"';

function themeXml(theme, name) {
  const c = theme.colors;
  const one = (k) => "<a:" + k + '><a:srgbClr val="' + hexOk(c[k]) + '"/></a:' + k + ">";
  const font = (f) => '<a:latin typeface="' + esc(f) + '"/><a:ea typeface=""/><a:cs typeface=""/>';
  const ph = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
  const ln = (w) => '<a:ln w="' + w + '" cap="flat" cmpd="sng" algn="ctr">' + ph + '<a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>';
  const fx = "<a:effectStyle><a:effectLst/></a:effectStyle>";
  return XML_HEAD + '<a:theme xmlns:a="' + NS_A + '" name="' + esc(name) + '"><a:themeElements><a:clrScheme name="' + esc(name) + '">' +
    ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"].map(one).join("") +
    '</a:clrScheme><a:fontScheme name="' + esc(name) + '"><a:majorFont>' + font(theme.major) + "</a:majorFont><a:minorFont>" + font(theme.minor) +
    '</a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst>' + ph + ph + ph + "</a:fillStyleLst><a:lnStyleLst>" +
    ln(6350) + ln(12700) + ln(19050) + "</a:lnStyleLst><a:effectStyleLst>" + fx + fx + fx + "</a:effectStyleLst><a:bgFillStyleLst>" + ph + ph + ph +
    "</a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>";
}

const defRPr = (sz, f) => '<a:defRPr sz="' + sz + '" kern="100"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+' + f +
  '-lt"/><a:ea typeface="+' + f + '-ea"/><a:cs typeface="+' + f + '-cs"/></a:defRPr>';
const lvl1 = (sz, f) => '<a:lvl1pPr marL="0" indent="0" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:buNone/>' +
  defRPr(sz, f) + "</a:lvl1pPr>";

function masterXml(bgHex) {
  return XML_HEAD + "<p:sldMaster" + NS_ALL + "><p:cSld><p:bg><p:bgPr>" + solid({ hex: bgHex, a: 1 }) + "<a:effectLst/></p:bgPr></p:bg><p:spTree>" +
    GROUP_HEAD + "</p:spTree></p:cSld><p:clrMap " + CLR_MAP + '/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
    "<p:txStyles><p:titleStyle>" + lvl1(4400, "mj") + "</p:titleStyle><p:bodyStyle>" + lvl1(1800, "mn") + "</p:bodyStyle><p:otherStyle>" +
    lvl1(1800, "mn") + "</p:otherStyle></p:txStyles></p:sldMaster>";
}

const layoutXml = () => XML_HEAD + "<p:sldLayout" + NS_ALL + ' type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>' + GROUP_HEAD +
  "</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>";

/* notes: placeholder gambar slide + badan catatan, ukuran halaman potret 6858000 x 9144000 */
const NOTES_IMG = '<a:xfrm><a:off x="685800" y="1143000"/><a:ext cx="5486400" cy="3086100"/></a:xfrm>';
const NOTES_BODY = '<a:xfrm><a:off x="685800" y="4400550"/><a:ext cx="5486400" cy="3600450"/></a:xfrm>';

function notesMasterXml(lang) {
  return XML_HEAD + "<p:notesMaster" + NS_ALL + '><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>' + GROUP_HEAD +
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image Placeholder 1"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr>' +
    '<p:nvPr><p:ph type="sldImg" idx="2"/></p:nvPr></p:nvSpPr><p:spPr>' + NOTES_IMG + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/>' +
    '<a:ln w="12700"><a:solidFill><a:prstClr val="black"/></a:solidFill></a:ln></p:spPr></p:sp>' +
    '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes Placeholder 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>' +
    '<p:nvPr><p:ph type="body" sz="quarter" idx="3"/></p:nvPr></p:nvSpPr><p:spPr>' + NOTES_BODY + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>' +
    '<p:txBody><a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"/><a:lstStyle/><a:p><a:pPr lvl="0"/><a:r><a:rPr lang="' +
    lang + '" dirty="0"/><a:t>Catatan</a:t></a:r></a:p></p:txBody></p:sp>' +
    "</p:spTree></p:cSld><p:clrMap " + CLR_MAP + "/><p:notesStyle>" +
    '<a:lvl1pPr marL="0" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">' + defRPr(1200, "mn") +
    "</a:lvl1pPr></p:notesStyle></p:notesMaster>";
}

function notesSlideXml(text, lang) {
  const paras = String(text).split(/\r?\n/).map((line) =>
    "<a:p>" + (line ? '<a:r><a:rPr lang="' + lang + '" dirty="0"/><a:t>' + esc(line) + "</a:t></a:r>" : '<a:endParaRPr lang="' + lang + '" dirty="0"/>') + "</a:p>").join("");
  return XML_HEAD + "<p:notes" + NS_ALL + "><p:cSld><p:spTree>" + GROUP_HEAD +
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image Placeholder 1"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr>' +
    '<p:nvPr><p:ph type="sldImg" idx="2"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp>' +
    '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes Placeholder 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>' +
    '<p:nvPr><p:ph type="body" sz="quarter" idx="3"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>' + paras + "</p:txBody></p:sp>" +
    "</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>";
}

function relsXml(rels) {
  return XML_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    rels.map((r) => '<Relationship Id="' + r.id + '" Type="' + esc(r.type) + '" Target="' + esc(r.target) + '"' +
      (r.external ? ' TargetMode="External"' : "") + "/>").join("") + "</Relationships>";
}

/* ---------- rakit paket ----------
   model = { title, lang, creator, theme:{colors:{dk1..folHlink}, major, minor}, slides:[{ bg:"RRGGBB", notes, items:[...] }] }
   → [{ name, data, store? }] */
function buildPackage(model) {
  const lang = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(model.lang || "") ? model.lang : "en-US";
  const parts = [];
  const overrides = [];
  const add = (name, data, type, store) => {
    parts.push({ name, data, store: !!store });
    if (type) overrides.push({ name, type });
  };

  /* media: dedup lewat hash isi */
  const mediaByHash = new Map();
  const exts = new Set();
  const mediaName = (buf, ext) => {
    const key = crypto.createHash("sha1").update(buf).digest("hex") + "." + ext;
    let name = mediaByHash.get(key);
    if (!name) {
      name = "image" + (mediaByHash.size + 1) + "." + ext;
      mediaByHash.set(key, name);
      exts.add(ext);
      parts.push({ name: "ppt/media/" + name, data: buf, store: ext !== "svg" });
    }
    return name;
  };

  const hasNotes = model.slides.some((s) => s.notes);
  const slideParts = [];
  let notesN = 0;
  model.slides.forEach((slide, i) => {
    const n = i + 1;
    const rels = [{ id: "rId1", type: REL + "slideLayout", target: "../slideLayouts/slideLayout1.xml" }];
    const byTarget = new Map();
    const rel = (type, target, external) => {
      const key = type + "|" + target;
      if (!byTarget.has(key)) {
        const id = "rId" + (rels.length + 1);
        rels.push({ id, type, target, external });
        byTarget.set(key, id);
      }
      return byTarget.get(key);
    };
    const ctx = {
      lang,
      motion: model.motion || "",
      media: (buf, ext) => rel(REL + "image", "../media/" + mediaName(buf, ext)),
      link: (href) => rel(REL + "hyperlink", href, true)
    };
    const xml = slideXml(slide, ctx);
    if (slide.notes) {
      notesN++;
      rel(REL + "notesSlide", "../notesSlides/notesSlide" + notesN + ".xml");
      add("ppt/notesSlides/notesSlide" + notesN + ".xml", notesSlideXml(slide.notes, lang), CT + "notesSlide+xml");
      add("ppt/notesSlides/_rels/notesSlide" + notesN + ".xml.rels", relsXml([
        { id: "rId1", type: REL + "notesMaster", target: "../notesMasters/notesMaster1.xml" },
        { id: "rId2", type: REL + "slide", target: "../slides/slide" + n + ".xml" }
      ]));
    }
    slideParts.push({ n, xml, rels });
  });
  for (const s of slideParts) {
    add("ppt/slides/slide" + s.n + ".xml", s.xml, CT + "slide+xml");
    add("ppt/slides/_rels/slide" + s.n + ".xml.rels", relsXml(s.rels));
  }

  /* presentation.xml + rels */
  const presRels = [{ id: "rId1", type: REL + "slideMaster", target: "slideMasters/slideMaster1.xml" }];
  slideParts.forEach((s) => presRels.push({ id: "rId" + (presRels.length + 1), type: REL + "slide", target: "slides/slide" + s.n + ".xml" }));
  const slideIds = slideParts.map((s, i) => '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 2) + '"/>').join("");
  let notesMasterLst = "";
  if (hasNotes) {
    const id = "rId" + (presRels.length + 1);
    presRels.push({ id, type: REL + "notesMaster", target: "notesMasters/notesMaster1.xml" });
    notesMasterLst = '<p:notesMasterIdLst><p:notesMasterId r:id="' + id + '"/></p:notesMasterIdLst>';
  }
  for (const [type, target] of [["presProps", "presProps.xml"], ["viewProps", "viewProps.xml"], ["theme", "theme/theme1.xml"], ["tableStyles", "tableStyles.xml"]]) {
    presRels.push({ id: "rId" + (presRels.length + 1), type: REL + type, target });
  }
  /* font ter-embed: model.fonts = [{ typeface, panose, regular?, bold?, italic?, boldItalic? : Buffer EOT }]
     → ppt/fonts/fontN.fntdata + <p:embeddedFontLst> (urutan skema: setelah p:notesSz, sebelum p:defaultTextStyle) */
  let fontLst = "";
  let fontN = 0;
  for (const g of model.fonts || []) {
    let slots = "";
    for (const k of ["regular", "bold", "italic", "boldItalic"]) {
      if (!g[k]) continue;
      fontN++;
      const id = "rId" + (presRels.length + 1);
      presRels.push({ id, type: REL + "font", target: "fonts/font" + fontN + ".fntdata" });
      parts.push({ name: "ppt/fonts/font" + fontN + ".fntdata", data: g[k], store: false });
      slots += "<p:" + k + ' r:id="' + id + '"/>';
    }
    if (slots) fontLst += '<p:embeddedFont><p:font typeface="' + esc(g.typeface) + '"' + (/^[0-9A-F]{20}$/.test(g.panose || "") && !/^0+$/.test(g.panose) ? ' panose="' + g.panose + '"' : "") +
      ' pitchFamily="2" charset="0"/>' + slots + "</p:embeddedFont>";
  }
  if (fontLst) fontLst = "<p:embeddedFontLst>" + fontLst + "</p:embeddedFontLst>";
  add("ppt/presentation.xml", XML_HEAD + "<p:presentation" + NS_ALL + ' saveSubsetFonts="1"' + (fontLst ? ' embedTrueTypeFonts="1"' : "") +
    '><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    notesMasterLst + "<p:sldIdLst>" + slideIds + '</p:sldIdLst><p:sldSz cx="' + SLIDE_W + '" cy="' + SLIDE_H + '"/><p:notesSz cx="6858000" cy="9144000"/>' + fontLst +
    '<p:defaultTextStyle><a:defPPr><a:defRPr lang="' + lang + '"/></a:defPPr>' + lvl1(1800, "mn") + "</p:defaultTextStyle></p:presentation>",
    CT + "presentation.main+xml");
  add("ppt/_rels/presentation.xml.rels", relsXml(presRels));

  add("ppt/slideMasters/slideMaster1.xml", masterXml(model.theme.colors.lt1), CT + "slideMaster+xml");
  add("ppt/slideMasters/_rels/slideMaster1.xml.rels", relsXml([
    { id: "rId1", type: REL + "slideLayout", target: "../slideLayouts/slideLayout1.xml" },
    { id: "rId2", type: REL + "theme", target: "../theme/theme1.xml" }
  ]));
  add("ppt/slideLayouts/slideLayout1.xml", layoutXml(), CT + "slideLayout+xml");
  add("ppt/slideLayouts/_rels/slideLayout1.xml.rels", relsXml([{ id: "rId1", type: REL + "slideMaster", target: "../slideMasters/slideMaster1.xml" }]));
  add("ppt/theme/theme1.xml", themeXml(model.theme, "slideck"), "application/vnd.openxmlformats-officedocument.theme+xml");
  if (hasNotes) {
    add("ppt/notesMasters/notesMaster1.xml", notesMasterXml(lang), CT + "notesMaster+xml");
    add("ppt/notesMasters/_rels/notesMaster1.xml.rels", relsXml([{ id: "rId1", type: REL + "theme", target: "../theme/theme2.xml" }]));
    add("ppt/theme/theme2.xml", themeXml(model.theme, "slideck notes"), "application/vnd.openxmlformats-officedocument.theme+xml");
  }
  add("ppt/presProps.xml", XML_HEAD + "<p:presentationPr" + NS_ALL + "/>", CT + "presProps+xml");
  add("ppt/viewProps.xml", XML_HEAD + "<p:viewPr" + NS_ALL + '><p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr>' +
    '<p:slideViewPr><p:cSldViewPr><p:cViewPr varScale="1"><p:scale><a:sx n="100" d="100"/><a:sy n="100" d="100"/></p:scale><p:origin x="0" y="0"/></p:cViewPr>' +
    '<p:guideLst/></p:cSldViewPr></p:slideViewPr><p:gridSpacing cx="72008" cy="72008"/></p:viewPr>', CT + "viewProps+xml");
  add("ppt/tableStyles.xml", XML_HEAD + '<a:tblStyleLst xmlns:a="' + NS_A + '" def="{5C22544A-7EE6-4342-B048-85BB5CBF8C40}"/>', CT + "tableStyles+xml");

  /* docProps */
  const now = (model.date || new Date()).toISOString().replace(/\.\d+Z$/, "Z");
  add("docProps/core.xml", XML_HEAD + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + esc(model.title) + "</dc:title><dc:creator>" + esc(model.creator || "slideck-html") +
    "</dc:creator><cp:lastModifiedBy>" + esc(model.creator || "slideck-html") + '</cp:lastModifiedBy><cp:revision>1</cp:revision><dcterms:created xsi:type="dcterms:W3CDTF">' + now +
    '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + now + "</dcterms:modified></cp:coreProperties>",
    "application/vnd.openxmlformats-package.core-properties+xml");
  add("docProps/app.xml", XML_HEAD + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
    'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><TotalTime>0</TotalTime><Application>slideck-html</Application>' +
    "<PresentationFormat>Widescreen</PresentationFormat><Slides>" + model.slides.length + "</Slides><Notes>" + notesN + "</Notes><HiddenSlides>0</HiddenSlides>" +
    "<AppVersion>16.0000</AppVersion></Properties>", "application/vnd.openxmlformats-officedocument.extended-properties+xml");
  add("_rels/.rels", relsXml([
    { id: "rId1", type: REL + "officeDocument", target: "ppt/presentation.xml" },
    { id: "rId2", type: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties", target: "docProps/core.xml" },
    { id: "rId3", type: REL + "extended-properties", target: "docProps/app.xml" }
  ]));

  const MIME = { png: "image/png", jpeg: "image/jpeg", jpg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml" };
  const types = XML_HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
    [...exts].sort().map((e) => '<Default Extension="' + e + '" ContentType="' + (MIME[e] || "application/octet-stream") + '"/>').join("") +
    (fontN ? '<Default Extension="fntdata" ContentType="application/x-fontdata"/>' : "") +
    overrides.map((o) => '<Override PartName="/' + o.name + '" ContentType="' + o.type + '"/>').join("") + "</Types>";
  parts.unshift({ name: "[Content_Types].xml", data: types });
  return parts;
}

/* ---------- pemeriksa well-formed XML (cukup untuk memverifikasi output sendiri) ----------
   Mengembalikan null kalau baik, atau pesan galat. Memeriksa: satu root, tag seimbang, atribut berkutip dan unik,
   entitas sah, prefix namespace terdeklarasi. */
function checkXml(s) {
  const n = s.length;
  let i = s.charCodeAt(0) === 0xfeff ? 1 : 0;
  const stack = [];
  let roots = 0;
  const badEnt = (t) => /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(t);
  const TAG = /<([A-Za-z_][\w.\-]*(?::[A-Za-z_][\w.\-]*)?)((?:\s+[A-Za-z_][\w.\-:]*\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>/y;
  const ATTR = /([A-Za-z_][\w.\-:]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  while (i < n) {
    if (s[i] !== "<") {
      const j = s.indexOf("<", i);
      const end = j < 0 ? n : j;
      const txt = s.slice(i, end);
      if (!stack.length) { if (/\S/.test(txt)) return "teks di luar elemen root (offset " + i + ")"; }
      else if (badEnt(txt)) return "entitas/& tidak sah dalam teks (offset " + i + ")";
      i = end;
      continue;
    }
    if (s.startsWith("<?", i)) { const j = s.indexOf("?>", i); if (j < 0) return "deklarasi tidak ditutup"; i = j + 2; continue; }
    if (s.startsWith("<!--", i)) { const j = s.indexOf("-->", i); if (j < 0) return "komentar tidak ditutup"; i = j + 3; continue; }
    if (s.startsWith("<![CDATA[", i)) { const j = s.indexOf("]]>", i); if (j < 0) return "CDATA tidak ditutup"; i = j + 3; continue; }
    if (s.startsWith("</", i)) {
      const j = s.indexOf(">", i);
      if (j < 0) return "tag penutup rusak";
      const name = s.slice(i + 2, j).trim();
      const top = stack.pop();
      if (!top || top.name !== name) return "tag penutup </" + name + "> tidak cocok dengan <" + (top ? top.name : "?") + "> (offset " + i + ")";
      i = j + 1;
      continue;
    }
    TAG.lastIndex = i;
    const m = TAG.exec(s);
    if (!m) return "tag rusak di offset " + i + ": " + s.slice(i, i + 60);
    const seen = new Set();
    const parent = stack.length ? stack[stack.length - 1].ns : null;
    let ns = parent;
    const used = [];
    const ec = m[1].indexOf(":");
    used.push(ec > 0 ? m[1].slice(0, ec) : "");
    ATTR.lastIndex = 0;
    let am;
    while ((am = ATTR.exec(m[2]))) {
      if (seen.has(am[1])) return "atribut ganda " + am[1] + " pada <" + m[1] + ">";
      seen.add(am[1]);
      if (badEnt(am[2] != null ? am[2] : am[3])) return "entitas tidak sah pada atribut " + am[1] + " di <" + m[1] + ">";
      if (am[1] === "xmlns" || am[1].startsWith("xmlns:")) {
        if (ns === parent) ns = new Set(parent || []);
        ns.add(am[1] === "xmlns" ? "" : am[1].slice(6));
      } else {
        const ac = am[1].indexOf(":");
        if (ac > 0) used.push(am[1].slice(0, ac));
      }
    }
    for (const p of used) {
      if (p === "xml" || p === "") continue;
      if (!ns || !ns.has(p)) return "prefix namespace '" + p + "' belum dideklarasikan pada <" + m[1] + ">";
    }
    if (!stack.length) { roots++; if (roots > 1) return "lebih dari satu elemen root"; }
    if (!m[3]) stack.push({ name: m[1], ns });
    i = TAG.lastIndex;
  }
  if (stack.length) return "elemen <" + stack[stack.length - 1].name + "> belum ditutup";
  if (!roots) return "tidak ada elemen root";
  return null;
}

/* ---------- pemeriksa paket: semua part yang dirujuk ada, semua XML well-formed ----------
   files = [{ name, data: Buffer }] (hasil zipRead). Mengembalikan array pesan galat (kosong = lolos). */
function checkPackage(files) {
  const errs = [];
  const byName = new Map(files.map((f) => [f.name, f]));
  const text = (name) => byName.get(name).data.toString("utf8");
  for (const f of files) {
    if (/\.(xml|rels)$/i.test(f.name)) {
      const e = checkXml(f.data.toString("utf8"));
      if (e) errs.push(f.name + ": " + e);
    }
    if (!f.data.length) errs.push(f.name + ": part kosong");
  }
  if (!byName.has("[Content_Types].xml")) { errs.push("[Content_Types].xml tidak ada"); return errs; }
  const ct = text("[Content_Types].xml");
  const defaults = new Set([...ct.matchAll(/<Default\s+Extension="([^"]+)"/g)].map((m) => m[1].toLowerCase()));
  const over = new Set([...ct.matchAll(/<Override\s+PartName="([^"]+)"/g)].map((m) => m[1].replace(/^\//, "")));
  for (const o of over) if (!byName.has(o)) errs.push("[Content_Types]: Override menunjuk part yang tidak ada: " + o);
  for (const f of files) {
    if (f.name === "[Content_Types].xml") continue;
    const ext = (f.name.match(/\.([^./]+)$/) || [])[1];
    if (!over.has(f.name) && !(ext && defaults.has(ext.toLowerCase()))) errs.push("[Content_Types]: tidak ada tipe untuk " + f.name);
    if (/\.xml$/i.test(f.name) && !over.has(f.name) && !/^\[/.test(f.name)) errs.push("[Content_Types]: part XML tanpa Override: " + f.name);
  }
  const normalize = (base, target) => {
    const segs = (target.startsWith("/") ? target.slice(1) : base + "/" + target).split("/");
    const out = [];
    for (const s of segs) { if (s === "..") out.pop(); else if (s && s !== ".") out.push(s); }
    return out.join("/");
  };
  for (const f of files) {
    const m = f.name.match(/^(.*?)_rels\/([^/]*)\.rels$/);
    if (!m) continue;
    const base = m[1].replace(/\/$/, "");
    const owner = (base ? base + "/" : "") + m[2];
    if (m[2] && !byName.has(owner)) errs.push(f.name + ": pemilik rels tidak ada (" + owner + ")");
    const ids = new Set();
    for (const r of f.data.toString("utf8").matchAll(/<Relationship\s+([^>]*?)\/>/g)) {
      const id = (r[1].match(/Id="([^"]*)"/) || [])[1];
      const target = (r[1].match(/Target="([^"]*)"/) || [])[1];
      if (!id || target == null) { errs.push(f.name + ": Relationship tanpa Id/Target"); continue; }
      if (ids.has(id)) errs.push(f.name + ": Id ganda " + id);
      ids.add(id);
      if (/TargetMode="External"/.test(r[1])) continue;
      const part = normalize(base, target.replace(/&amp;/g, "&"));
      if (!byName.has(part)) errs.push(f.name + ": " + id + " menunjuk part yang tidak ada: " + part);
    }
    if (m[2] && byName.has(owner)) {
      const body = text(owner);
      for (const u of body.matchAll(/\br:(?:id|embed|link|pict)="([^"]*)"/g)) {
        if (!ids.has(u[1])) errs.push(owner + ": memakai " + u[1] + " yang tidak ada di rels");
      }
      /* id bentuk harus unik per slide */
      if (/^ppt\/slides\/slide\d+\.xml$/.test(owner)) {
        const seen = new Set();
        for (const c of body.matchAll(/<p:cNvPr id="(\d+)"/g)) {
          if (seen.has(c[1])) errs.push(owner + ": id bentuk ganda " + c[1]);
          seen.add(c[1]);
        }
      }
    }
  }
  return errs;
}

module.exports = { EMU_PER_PX, SLIDE_W, SLIDE_H, PRESETS, esc, checkXml, checkPackage, buildPackage };
