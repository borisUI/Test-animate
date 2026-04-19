const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "car-frames");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const FRAMES = 80;
const SIZE = 400;
const CX = SIZE / 2;
const CY = SIZE / 2 + 10;
const FOV = 520;
const CAM_DIST = 520;
const TILT_X = 0.3;

// Car dimensions (world units)
const BHX = 100, BHY = 25, BHZ = 45;         // body half-sizes
const CAB_BOT = BHY;                         // cabin bottom y
const CAB_TOP = CAB_BOT + 34;                // cabin top y
const CAB_BHX = 58;                          // cabin bottom half-length
const CAB_THX = 36;                          // cabin top half-length
const CAB_HZ = 42;                           // cabin half-width
const CAB_DX = -8;                           // cabin offset (slightly back)

const WHEEL_R = 18;
const WHEEL_CY = -30;
const WHEEL_AX = 68;                         // wheel x offset from center
const WHEEL_OUT = 50;                        // outer face z
const WHEEL_IN = 40;                         // inner face z
const WHEEL_SEG = 18;

// --- vector helpers ---
function rotY(a, [x, y, z]) {
  const c = Math.cos(a), s = Math.sin(a);
  return [c * x + s * z, y, -s * x + c * z];
}
function rotX(a, [x, y, z]) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x, c * y - s * z, s * y + c * z];
}
function transform(p, angle) {
  return rotX(TILT_X, rotY(angle, p));
}
function project(p) {
  const depth = p[2] + CAM_DIST;
  const scale = FOV / depth;
  return [CX + p[0] * scale, CY - p[1] * scale, depth];
}
function avgDepth(tpts) {
  let s = 0;
  for (const p of tpts) s += p[2];
  return s / tpts.length;
}
function normal(a, b, c) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
  const m = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / m, n[1] / m, n[2] / m];
}
function shade([r, g, b], tpts) {
  const n = normal(tpts[0], tpts[1], tpts[2]);
  // Light from upper-front-left of viewer
  const L = [-0.35, 0.8, -0.5];
  const lm = Math.hypot(L[0], L[1], L[2]);
  const ln = [L[0] / lm, L[1] / lm, L[2] / lm];
  const d = Math.abs(n[0] * ln[0] + n[1] * ln[1] + n[2] * ln[2]);
  const f = 0.42 + 0.58 * d;
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
}

// Build car polygons in world space.
function buildCar() {
  const faces = [];

  const RED = [215, 55, 70];
  const RED_DK = [150, 25, 40];
  const RED_HI = [245, 110, 120];
  const GLASS = [30, 45, 80];
  const GLASS_HI = [80, 110, 160];
  const ROOF = [120, 25, 40];
  const BLACK = [20, 20, 26];

  // --- Body box (8 verts) ---
  const b = {
    xpp: [BHX, BHY, BHZ], xpn: [BHX, BHY, -BHZ],
    xnp: [BHX, -BHY, BHZ], xnn: [BHX, -BHY, -BHZ],
    mpp: [-BHX, BHY, BHZ], mpn: [-BHX, BHY, -BHZ],
    mnp: [-BHX, -BHY, BHZ], mnn: [-BHX, -BHY, -BHZ],
  };

  faces.push({ pts: [b.xpp, b.xpn, b.xnn, b.xnp], color: RED });      // +X front nose
  faces.push({ pts: [b.mpn, b.mpp, b.mnp, b.mnn], color: RED_DK });   // -X rear
  faces.push({ pts: [b.xpp, b.xnp, b.mnp, b.mpp], color: RED });      // +Z side (right)
  faces.push({ pts: [b.xpn, b.mpn, b.mnn, b.xnn], color: RED });      // -Z side (left)
  faces.push({ pts: [b.xpp, b.mpp, b.mpn, b.xpn], color: RED_HI });   // top (under cabin area)
  faces.push({ pts: [b.xnp, b.xnn, b.mnn, b.mnp], color: [30, 8, 12] }); // underside

  // --- Headlights on the nose face ---
  const HL_Y = 0;    // around mid height
  const HL_DZ = 22;  // offset from center along Z
  const HL_DY = 10;
  const HL_H = 12;
  const HL_W = 4;    // small thickness in X
  const nose = BHX + 0.3;
  const hlY0 = HL_Y - HL_H / 2;
  const hlY1 = HL_Y + HL_H / 2;
  for (const zc of [HL_DZ, -HL_DZ]) {
    faces.push({
      pts: [
        [nose, hlY1, zc - HL_W],
        [nose, hlY1, zc + HL_W],
        [nose, hlY0, zc + HL_W],
        [nose, hlY0, zc - HL_W],
      ],
      color: [255, 235, 160],
      flat: true,
    });
  }

  // Grille
  faces.push({
    pts: [
      [nose, -10, -16],
      [nose, -10, 16],
      [nose, -20, 16],
      [nose, -20, -16],
    ],
    color: [18, 18, 22],
    flat: true,
  });

  // --- Taillights on rear face ---
  const rear = -BHX - 0.3;
  for (const zc of [HL_DZ, -HL_DZ]) {
    faces.push({
      pts: [
        [rear, hlY1, zc - HL_W],
        [rear, hlY0, zc - HL_W],
        [rear, hlY0, zc + HL_W],
        [rear, hlY1, zc + HL_W],
      ],
      color: [255, 100, 110],
      flat: true,
    });
  }

  // --- Cabin (trapezoidal prism) ---
  // Bottom rectangle at y=CAB_BOT, top rectangle at y=CAB_TOP, narrower in X.
  const c = {
    bfr: [CAB_DX + CAB_BHX, CAB_BOT, CAB_HZ],
    bfl: [CAB_DX + CAB_BHX, CAB_BOT, -CAB_HZ],
    bbr: [CAB_DX - CAB_BHX, CAB_BOT, CAB_HZ],
    bbl: [CAB_DX - CAB_BHX, CAB_BOT, -CAB_HZ],
    tfr: [CAB_DX + CAB_THX, CAB_TOP, CAB_HZ - 2],
    tfl: [CAB_DX + CAB_THX, CAB_TOP, -(CAB_HZ - 2)],
    tbr: [CAB_DX - CAB_THX, CAB_TOP, CAB_HZ - 2],
    tbl: [CAB_DX - CAB_THX, CAB_TOP, -(CAB_HZ - 2)],
  };

  faces.push({ pts: [c.bfr, c.bfl, c.tfl, c.tfr], color: GLASS });    // windshield
  faces.push({ pts: [c.bbr, c.tbr, c.tbl, c.bbl], color: GLASS });    // rear window
  faces.push({ pts: [c.bfr, c.tfr, c.tbr, c.bbr], color: GLASS_HI }); // right side windows
  faces.push({ pts: [c.bfl, c.bbl, c.tbl, c.tfl], color: GLASS_HI }); // left side windows
  faces.push({ pts: [c.tfr, c.tfl, c.tbl, c.tbr], color: ROOF });     // roof

  // Window pillars (thin dark slats between windshield and side windows for definition)
  const pillarW = 2;
  for (const zc of [CAB_HZ + 0.2, -CAB_HZ - 0.2]) {
    const zSign = Math.sign(zc);
    // front pillar
    faces.push({
      pts: [
        [CAB_DX + CAB_BHX - pillarW, CAB_BOT, zc],
        [CAB_DX + CAB_BHX, CAB_BOT, zc],
        [CAB_DX + CAB_THX, CAB_TOP, zc - zSign * 0.1],
        [CAB_DX + CAB_THX - pillarW, CAB_TOP, zc - zSign * 0.1],
      ],
      color: [35, 10, 18],
      flat: true,
    });
    // rear pillar
    faces.push({
      pts: [
        [CAB_DX - CAB_BHX, CAB_BOT, zc],
        [CAB_DX - CAB_BHX + pillarW, CAB_BOT, zc],
        [CAB_DX - CAB_THX + pillarW, CAB_TOP, zc - zSign * 0.1],
        [CAB_DX - CAB_THX, CAB_TOP, zc - zSign * 0.1],
      ],
      color: [35, 10, 18],
      flat: true,
    });
  }

  // --- Wheels ---
  const wheelCenters = [
    [WHEEL_AX, WHEEL_CY, WHEEL_OUT],
    [WHEEL_AX, WHEEL_CY, -WHEEL_OUT],
    [-WHEEL_AX, WHEEL_CY, WHEEL_OUT],
    [-WHEEL_AX, WHEEL_CY, -WHEEL_OUT],
  ];

  for (const [wx, wy, wzOuter] of wheelCenters) {
    const zSign = Math.sign(wzOuter);
    const zOut = wzOuter;
    const zIn = zSign * WHEEL_IN;
    const outerRing = [];
    const innerRing = [];
    for (let i = 0; i < WHEEL_SEG; i++) {
      const a = (i / WHEEL_SEG) * Math.PI * 2;
      const dy = Math.sin(a) * WHEEL_R;
      const dx = Math.cos(a) * WHEEL_R;
      outerRing.push([wx + dx, wy + dy, zOut]);
      innerRing.push([wx + dx, wy + dy, zIn]);
    }
    // Outer disk
    faces.push({ pts: outerRing, color: [30, 30, 36], flat: true });
    // Inner disk (rarely seen because obscured by body, but include)
    faces.push({ pts: innerRing.slice().reverse(), color: [18, 18, 22], flat: true });
    // Sidewall quads
    for (let i = 0; i < WHEEL_SEG; i++) {
      const j = (i + 1) % WHEEL_SEG;
      faces.push({
        pts: [outerRing[i], outerRing[j], innerRing[j], innerRing[i]],
        color: [18, 18, 22],
      });
    }
    // Hub cap (smaller disk centered on outer face)
    const hub = [];
    const hubR = 7;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      hub.push([wx + Math.cos(a) * hubR, wy + Math.sin(a) * hubR, zOut + 0.3 * zSign]);
    }
    faces.push({ pts: hub, color: [180, 180, 190], flat: true });
  }

  return faces;
}

const CAR_FACES = buildCar();

function renderFrame(t) {
  const angleY = t * Math.PI * 2;

  // Transform + project all faces
  const rendered = CAR_FACES.map((face) => {
    const tpts = face.pts.map((p) => transform(p, angleY));
    const ppts = tpts.map(project);
    const depth = avgDepth(tpts);
    const color = face.flat ? `rgb(${face.color.join(",")})` : shade(face.color, tpts);
    return { ppts, depth, color };
  });

  // Sort back to front
  rendered.sort((a, b) => b.depth - a.depth);

  // Ground shadow (ellipse beneath car)
  const shadowSvg =
    `<ellipse cx="${CX}" cy="${CY + 52}" rx="120" ry="16" fill="rgba(0,0,0,0.45)"/>`;

  const polys = rendered
    .map((r) => {
      const pts = r.ppts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
      return `<polygon points="${pts}" fill="${r.color}"/>`;
    })
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<rect width="${SIZE}" height="${SIZE}" fill="#0f1020"/>` +
    `<rect x="0" y="${CY + 40}" width="${SIZE}" height="${SIZE - CY - 40}" fill="#0a0b17"/>` +
    shadowSvg +
    polys +
    `</svg>`
  );
}

for (let f = 0; f < FRAMES; f++) {
  const t = f / FRAMES; // full loop, no duplicate last frame
  const svg = renderFrame(t);
  const name = `frame_${String(f).padStart(3, "0")}.svg`;
  fs.writeFileSync(path.join(OUT_DIR, name), svg);
}

console.log(`Generated ${FRAMES} car frames in ${OUT_DIR}`);
