// PPTX export wire-level check: images must be EMBEDDED into the package
// (ppt/media/*) when fetch succeeds, and stay external links when fetch
// fails. Also guards the pptXfrm regression (a:xfrm in EMUs) and XML escaping.
const fs = require("fs");
const path = require("path");

const appSrc = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const start = appSrc.indexOf("async function exportPptx()");
const crcIdx = appSrc.indexOf("const crcTable", start);
const end = appSrc.indexOf("})();", crcIdx) + "})();".length;
assertRange(start, crcIdx, end);

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);

global.fetch = async (url) => {
  if (String(url).includes("img-a")) return okResponse("image/jpeg", JPEG);
  if (String(url).includes("poster")) return okResponse("image/png", PNG);
  throw new Error("network unreachable for " + url);
};
function okResponse(ct, bytes) {
  return { ok: true, headers: { get: () => ct }, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
}

global.CANVAS = { w: 960, h: 540 };
global.state = {
  projectName: "Test & Deck",
  pages: [
    {
      background: "#0b0f1a",
      elements: [
        { id: "tx1", type: "text", x: 40, y: 40, w: 460, h: 60, text: "Hello & World", fontSize: 32, fontWeight: 700, color: "#FFFFFF", align: "center", opacity: 1, fontFamily: "Inter" },
        { id: "el-img-a", type: "image", x: 50, y: 120, w: 300, h: 200, src: "https://cdn.test/img-a.jpg", opacity: 1 },
        { id: "el-img-b", type: "image", x: 400, y: 120, w: 300, h: 200, src: "https://cdn.test/img-b.png", opacity: 1 },
        { id: "el-poster", type: "video", x: 600, y: 300, w: 300, h: 150, src: "https://cdn.test/clip.mp4", poster: "https://cdn.test/poster.png", opacity: 1 },
        { id: "sh1", type: "rect", x: 10, y: 10, w: 100, h: 50, fill: "#8B3DFF", opacity: 0.5 },
        { id: "ic1", type: "icon", x: 0, y: 0, w: 40, h: 40, code: 9733, color: "#FACC15", fontSize: 32, opacity: 1 },
      ],
    },
  ],
};
global.render = () => {};
global.downloadBlob = (name, blob) => {};
global.layerName = (el) => "Layer";
global.getShapeAsset = () => null;

eval(appSrc.slice(start, end));

function assertRange(start, crcIdx, end) {
  if (start < 0 || crcIdx < 0 || end <= crcIdx || end > appSrc.length) {
    console.error("PPTX-EXPORT: FAIL — could not locate exporter region in app.js");
    process.exit(1);
  }
}

function readZip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("EOCD not found");
  const count = dv.getUint16(eocd + 10, true);
  const cdOffset = dv.getUint32(eocd + 16, true);
  const files = {};
  let pos = cdOffset;
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(pos, true) !== 0x02014b50) throw new Error("bad central dir entry");
    const compSize = dv.getUint32(pos + 20, true);
    const nameLen = dv.getUint16(pos + 28, true);
    const extraLen = dv.getUint16(pos + 30, true);
    const commentLen = dv.getUint16(pos + 32, true);
    const localOff = dv.getUint32(pos + 42, true);
    const name = Buffer.from(bytes.subarray(pos + 46, pos + 46 + nameLen)).toString("latin1");
    if (dv.getUint32(localOff, true) !== 0x04034b50) throw new Error("bad local header");
    const nameLenL = dv.getUint16(localOff + 26, true);
    const extraLenL = dv.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + nameLenL + extraLenL;
    files[name] = bytes.subarray(dataStart, dataStart + compSize);
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

(async () => {
  const failures = [];
  const check = (label, ok) => { if (!ok) failures.push(label); };
  try {
    const blob = await buildPptxBlob();
    const files = readZip(Buffer.from(await blob.arrayBuffer()));

    const keys = Object.keys(files);
    check("expected slide xml", keys.includes("ppt/slides/slide1.xml"));
    check("expected media image1.jpg", keys.includes("ppt/media/image1.jpg"));
    check("expected media image2.png", keys.includes("ppt/media/image2.png"));

    const jpg = files["ppt/media/image1.jpg"];
    const png = files["ppt/media/image2.png"];
    check("image1.jpg is the stubbed jpeg bytes", jpg.length === JPEG.length && jpg[0] === 0xff && jpg[1] === 0xd8);
    check("image2.png is the stubbed png bytes", png.length === PNG.length && png[0] === 0x89 && png[1] === 0x50);

    const ct = files["[Content_Types].xml"].toString();
    check("content types default jpg", ct.includes('<Default Extension="jpg" ContentType="image/jpeg"/>'));
    check("content types default png", ct.includes('<Default Extension="png" ContentType="image/png"/>'));

    const rels = files["ppt/slides/_rels/slide1.xml.rels"].toString();
    check("internal rel for embedded image", rels.includes('Id="rIdImgel-img-a" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.jpg"'));
    check("internal rel for embedded poster", rels.includes('Target="../media/image2.png"'));
    check("external rel for unfetchable image", rels.includes('Id="rIdImgel-img-b"') && rels.includes('Target="https://cdn.test/img-b.png"') && rels.includes('TargetMode="External"'));

    const slide = files["ppt/slides/slide1.xml"].toString();
    check("embedded image uses r:embed", slide.includes('r:embed="rIdImgel-img-a"'));
    check("unfetchable image keeps r:link", slide.includes('r:link="rIdImgel-img-b"'));
    check("poster uses r:embed", slide.includes('r:embed="rIdImgel-poster"'));
    check("text xml-escaped", slide.includes("Hello &amp; World"));
    check("xfrm in EMUs", slide.includes('<a:off x="381000" y="381000"/>'));
    check("text bold run", slide.includes('b="1"'));
    check("half-opacity shape alpha", slide.includes('<a:srgbClr val="8B3DFF"><a:alpha val="50000"/>'));
  } catch (error) {
    failures.push("exception: " + error.message);
  }

  if (failures.length) {
    console.log("PPTX-EXPORT: FAIL");
    failures.forEach((f) => console.log("  - " + f));
    process.exitCode = 1;
  } else {
    console.log("PPTX-EXPORT: PASS — images embedded, rels internal, xfrm + escaping OK");
  }
  process.exit(0);
})();