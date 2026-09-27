// One-off script: rasterizes the Cerebrew app icon (a brain meshed with a
// gear, plus a thought-bubble dot trail) into the PNG sizes needed for the
// PWA manifest and iOS Home Screen icon.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const INK = "#0c0a09";

function gearTeeth(cx, cy, radius, count) {
  const toothW = 26;
  const toothH = 36;
  let out = "";
  for (let i = 0; i < count; i++) {
    const angle = (360 / count) * i;
    out += `<rect x="${cx - toothW / 2}" y="${cy - radius - toothH / 2}" width="${toothW}" height="${toothH}" rx="4" fill="#ffffff" transform="rotate(${angle} ${cx} ${cy})"/>\n`;
  }
  return out;
}

const svg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="${INK}"/>

  <!-- gear ring -->
  <circle cx="230" cy="220" r="138" stroke="#ffffff" stroke-width="20" fill="none"/>
  ${gearTeeth(230, 220, 150, 8)}

  <!-- brain: two lobes -->
  <circle cx="200" cy="220" r="62" fill="#ffffff"/>
  <circle cx="260" cy="220" r="62" fill="#ffffff"/>
  <!-- cleft between hemispheres -->
  <rect x="227" y="168" width="6" height="104" fill="${INK}"/>
  <!-- fold lines -->
  <path d="M 178 198 Q 194 210 178 226" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M 282 198 Q 266 210 282 226" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M 190 244 Q 200 252 212 246" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M 250 246 Q 262 252 272 244" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>

  <!-- thought-bubble dot trail -->
  <circle cx="348" cy="348" r="22" fill="#ffffff"/>
  <circle cx="390" cy="388" r="14" fill="#ffffff"/>
  <circle cx="416" cy="418" r="8" fill="#ffffff"/>
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
