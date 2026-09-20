import sharp from "sharp";
import fs from "fs";
import path from "path";

const src = path.join("public", "oia-logo.png");
const out = "public";
const meta = path.join("src", "app");

async function makePng(size, file, padRatio = 0.12) {
  const pad = Math.round(size * padRatio);
  const inner = Math.max(1, size - pad * 2);
  const buf = await sharp(src)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 10, g: 14, b: 22, alpha: 1 },
    },
  })
    .composite([{ input: buf, left: pad, top: pad }])
    .png()
    .toFile(file);
  console.log("wrote", file);
}

async function makeTransparent(size, file) {
  await sharp(src)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(file);
  console.log("wrote", file);
}

await makePng(16, path.join(out, "favicon-16x16.png"), 0.08);
await makePng(32, path.join(out, "favicon-32x32.png"), 0.08);
await makePng(180, path.join(out, "apple-touch-icon.png"), 0.1);
await makePng(192, path.join(out, "android-chrome-192x192.png"), 0.1);
await makePng(512, path.join(out, "android-chrome-512x512.png"), 0.1);
await makePng(512, path.join(out, "maskable-icon-512x512.png"), 0.18);
await makeTransparent(64, path.join(out, "logo.png"));
await makeTransparent(256, path.join(out, "logo-256.png"));
await makePng(32, path.join(meta, "icon.png"), 0.08);
await makePng(180, path.join(meta, "apple-icon.png"), 0.1);
await sharp(path.join(out, "favicon-32x32.png")).toFile(path.join(out, "favicon.ico"));
await makePng(32, path.join(out, "favicon.png"), 0.08);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#0a0e16"/>
  <image href="/logo.png" x="4" y="4" width="24" height="24"/>
</svg>
`;
fs.writeFileSync(path.join(out, "favicon.svg"), svg);

const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path fill="#007BFF" d="M2.5 1.5h3.2v5.1h4.6V1.5h3.2v13H10.3V9.1H5.7v5.4H2.5v-13z"/>
</svg>
`;
fs.writeFileSync(path.join(out, "safari-pinned-tab.svg"), maskSvg);

console.log("HireOps icon set generated");
