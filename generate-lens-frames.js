const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "lens-frames");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const FRAMES = 80;
const SIZE = 400;
const C = SIZE / 2;
const BLADES = 7;
const FOCUS_LABELS = ["\u221e", "20", "10", "5", "3", "2", "1.5", "1"];

function deg(d) {
  return (d * Math.PI) / 180;
}

function polar(cx, cy, r, angleDeg) {
  const a = deg(angleDeg);
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

function frame(t) {
  const ringRot = t * 540;
  const innerRot = -t * 360;
  const bladeRot = t * 360;
  // Aperture opens then closes across the scroll (sin curve).
  const apertureT = Math.sin(t * Math.PI);
  const apertureR = 28 + apertureT * 78;
  const glintAngle = t * 360 + 40;

  // Outer tick ring
  const ticks = [];
  const NUM_TICKS = 48;
  for (let i = 0; i < NUM_TICKS; i++) {
    const a = (i / NUM_TICKS) * 360;
    const major = i % 4 === 0;
    const [x1, y1] = polar(C, C, major ? 158 : 165, a);
    const [x2, y2] = polar(C, C, 180, a);
    ticks.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(
        1
      )}" y2="${y2.toFixed(1)}" stroke="#9aa0bb" stroke-width="${
        major ? 1.6 : 0.8
      }" opacity="${major ? 0.9 : 0.5}"/>`
    );
  }

  // Focus distance labels on mid ring
  const labels = [];
  for (let i = 0; i < FOCUS_LABELS.length; i++) {
    const a = (i / FOCUS_LABELS.length) * 360 - 90;
    const [lx, ly] = polar(C, C, 138, a);
    labels.push(
      `<text x="${lx.toFixed(1)}" y="${ly.toFixed(
        1
      )}" fill="#c9cbe0" font-size="11" font-family="-apple-system,Arial,sans-serif" text-anchor="middle" dominant-baseline="middle" transform="rotate(${(
        a + 90
      ).toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})">${
        FOCUS_LABELS[i]
      }</text>`
    );
  }

  // Aperture polygon points (rotates)
  const pts = [];
  for (let i = 0; i < BLADES; i++) {
    const [x, y] = polar(C, C, apertureR, (i / BLADES) * 360 + bladeRot);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  // Faint blade radial lines (between polygon corners, radiating out)
  const bladeLines = [];
  for (let i = 0; i < BLADES; i++) {
    const aDeg = ((i + 0.5) / BLADES) * 360 + bladeRot;
    const [x1, y1] = polar(C, C, apertureR, aDeg);
    const [x2, y2] = polar(C, C, 118, aDeg);
    bladeLines.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(
        1
      )}" y2="${y2.toFixed(
        1
      )}" stroke="#1a1c28" stroke-width="1" opacity="0.7"/>`
    );
  }

  // Rotating glint on glass
  const [gx, gy] = polar(C, C, 60, glintAngle);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<defs>` +
    `<radialGradient id="body" cx="0.38" cy="0.32">` +
    `<stop offset="0" stop-color="#2f3244"/>` +
    `<stop offset="0.55" stop-color="#15161f"/>` +
    `<stop offset="1" stop-color="#05060a"/>` +
    `</radialGradient>` +
    `<radialGradient id="glass" cx="0.5" cy="0.5">` +
    `<stop offset="0" stop-color="#0a1428"/>` +
    `<stop offset="0.75" stop-color="#020308"/>` +
    `<stop offset="1" stop-color="#000"/>` +
    `</radialGradient>` +
    `<radialGradient id="glint" cx="0.5" cy="0.5">` +
    `<stop offset="0" stop-color="rgba(255,255,255,0.55)"/>` +
    `<stop offset="1" stop-color="rgba(255,255,255,0)"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width="${SIZE}" height="${SIZE}" fill="#0f1020"/>` +
    // Outer housing
    `<circle cx="${C}" cy="${C}" r="188" fill="#05060a"/>` +
    `<circle cx="${C}" cy="${C}" r="182" fill="url(#body)"/>` +
    // Outer tick ring (rotates)
    `<g transform="rotate(${ringRot.toFixed(1)} ${C} ${C})">${ticks.join(
      ""
    )}</g>` +
    // Inner dark ring
    `<circle cx="${C}" cy="${C}" r="152" fill="none" stroke="#23263a" stroke-width="1"/>` +
    // Focus distance labels (counter rotating)
    `<g transform="rotate(${innerRot.toFixed(1)} ${C} ${C})">${labels.join(
      ""
    )}</g>` +
    // Aperture chamber
    `<circle cx="${C}" cy="${C}" r="120" fill="#0a0b12" stroke="#1f2232" stroke-width="1"/>` +
    // Blade hints
    bladeLines.join("") +
    // Aperture opening
    `<polygon points="${pts.join(" ")}" fill="url(#glass)"/>` +
    // Subtle glint on glass
    `<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(
      1
    )}" rx="22" ry="7" fill="url(#glint)" opacity="0.35" transform="rotate(${glintAngle.toFixed(
      1
    )} ${gx.toFixed(1)} ${gy.toFixed(1)})"/>` +
    `</svg>`
  );
}

for (let f = 0; f < FRAMES; f++) {
  const t = f / (FRAMES - 1);
  const svg = frame(t);
  const name = `frame_${String(f).padStart(3, "0")}.svg`;
  fs.writeFileSync(path.join(OUT_DIR, name), svg);
}

console.log(`Generated ${FRAMES} lens frames in ${OUT_DIR}`);
