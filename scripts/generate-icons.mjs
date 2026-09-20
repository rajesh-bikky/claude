// One-off script: rasterizes the app icon (ink pill + mic glyph, per DESIGN.md)
// into the PNG sizes needed for the PWA manifest and iOS Home Screen icon.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const svg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#0c0a09"/>
  <g transform="translate(256 246)" fill="#ffffff">
    <rect x="-42" y="-120" width="84" height="150" rx="42"/>
    <path d="M -100 -10 A 100 100 0 0 0 100 -10" stroke="#ffffff" stroke-width="22" fill="none" stroke-linecap="round"/>
    <rect x="-11" y="90" width="22" height="60" rx="11"/>
    <rect x="-60" y="140" width="120" height="22" rx="11"/>
  </g>
</svg>`;

const outDir = path.resolve("public", "icons");
await mkdir(outDir, { recursive: true });

const sizes = [192, 512];
for (const size of sizes) {
  const buffer = await sharp(Buffer.from(svg(size))).resize(size, size).png().toBuffer();
  await writeFile(path.join(outDir, `icon-${size}.png`), buffer);
}

// iOS wants a dedicated (non-transparent, no rounding applied by us) apple-touch-icon.
const appleBuffer = await sharp(Buffer.from(svg(180))).resize(180, 180).png().toBuffer();
await writeFile(path.join(outDir, "apple-touch-icon.png"), appleBuffer);

console.log("Icons written to public/icons/");
