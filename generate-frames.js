const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "frames");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const FRAMES = 80;
const SIZE = 400;
const CENTER = SIZE / 2;
const TOTAL_DOTS = 160;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const SCALE = 12;

for (let f = 0; f < FRAMES; f++) {
  const t = f / (FRAMES - 1);
  const numVisible = Math.floor(t * TOTAL_DOTS);
  const rotation = t * 200;

  const dots = [];
  for (let i = 0; i < numVisible; i++) {
    const angle = i * GOLDEN;
    const r = Math.sqrt(i) * SCALE;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    const hue = (i / TOTAL_DOTS) * 180 + 180 + t * 60;
    const appearT = Math.min(1, (numVisible - i) / 6);
    const dotR = 2.5 + appearT * 2.5;
    dots.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${dotR.toFixed(
        1
      )}" fill="hsl(${hue.toFixed(0)},70%,65%)" opacity="${appearT.toFixed(2)}"/>`
    );
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<rect width="${SIZE}" height="${SIZE}" fill="#0f1020"/>` +
    `<g transform="translate(${CENTER},${CENTER}) rotate(${rotation.toFixed(
      1
    )})">${dots.join("")}</g></svg>`;

  const name = `frame_${String(f).padStart(3, "0")}.svg`;
  fs.writeFileSync(path.join(OUT_DIR, name), svg);
}

console.log(`Generated ${FRAMES} frames in ${OUT_DIR}`);
