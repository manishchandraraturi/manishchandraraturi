import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Edit this list to choose which repositories get bright featured stars & labels
const FEATURED = [
  'dawaisaathi',
  'github-activity',
  'regret-machine',
  'manishchandraraturi',
  'Tola',
  'sakshi',
  'ICPilot',
  'BestBeforeRot',
  'Argus',
  'VahakVigil',
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT_DIR, 'data', 'stats.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'assets', 'galaxy.svg');

const WIDTH = 900;
const HEIGHT = 480;
const GALAXY_CX = 595;
const GALAXY_CY = 248;
const TILT_DEG = -14;
const TILT_RAD = (TILT_DEG * Math.PI) / 180;
const TILT_SCALE_Y = 0.7;
const INV_SCALE_Y = Number((1 / TILT_SCALE_Y).toFixed(6));

const BAR_RADIUS = 46;
const MAX_RADIUS = 252;
const SPIRAL_WIND = 1.52;

// 6 concentric rings: inner faster (~60s), outer slower (~240s)
const RINGS = [
  { id: 'r0', minR: 0, maxR: 46, duration: 60 },
  { id: 'r1', minR: 46, maxR: 82, duration: 84 },
  { id: 'r2', minR: 82, maxR: 120, duration: 114 },
  { id: 'r3', minR: 120, maxR: 162, duration: 150 },
  { id: 'r4', minR: 162, maxR: 208, duration: 194 },
  { id: 'r5', minR: 208, maxR: 270, duration: 240 },
];

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-US');
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianRand(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function getRingIndex(r) {
  for (let i = 0; i < RINGS.length; i++) {
    if (r < RINGS[i].maxR || i === RINGS.length - 1) return i;
  }
  return RINGS.length - 1;
}

function armAngle(armIndex, r) {
  const baseAngles = [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5];
  const base = baseAngles[armIndex % 4];
  if (r <= BAR_RADIUS) {
    return armIndex < 2 ? base : base + 0.15;
  }
  const wind = armIndex < 2 ? SPIRAL_WIND : SPIRAL_WIND * 1.08;
  return base - wind * Math.log(r / BAR_RADIUS);
}

// Convert galactic disk coordinates (gx, gy) to screen coordinates (sx, sy) at t=0
function diskToScreen(gx, gy) {
  const sy0 = gy * TILT_SCALE_Y;
  const cosT = Math.cos(TILT_RAD);
  const sinT = Math.sin(TILT_RAD);
  return {
    x: GALAXY_CX + gx * cosT - sy0 * sinT,
    y: GALAXY_CY + gx * sinT + sy0 * cosT,
  };
}

function pickStarColor(r, rand) {
  const t = Math.min(1, r / MAX_RADIUS);
  const p = rand();
  if (t < 0.25) {
    return p < 0.5 ? '#fffbeb' : p < 0.85 ? '#fef3c7' : '#fde68a';
  }
  if (t < 0.58) {
    return p < 0.4 ? '#f8fafc' : p < 0.72 ? '#fef9c3' : '#e0f2fe';
  }
  return p < 0.45 ? '#bae6fd' : p < 0.78 ? '#7dd3fc' : p < 0.92 ? '#e0f2fe' : '#93c5fd';
}

// 3 parallax field star layers (far, mid, near) with different twinkle speeds
function buildParallaxFieldStars() {
  const rand = mulberry32(8421);
  const layers = [
    { cls: 'p-far', count: 280, minR: 0.3, maxR: 0.6, minOp: 0.14, maxOp: 0.38, buckets: [[], [], []] },
    { cls: 'p-mid', count: 160, minR: 0.55, maxR: 0.95, minOp: 0.34, maxOp: 0.68, buckets: [[], [], []] },
    { cls: 'p-near', count: 65, minR: 0.85, maxR: 1.4, minOp: 0.58, maxOp: 0.92, buckets: [[], [], []] },
  ];

  layers.forEach((layer, lIdx) => {
    for (let i = 0; i < layer.count; i++) {
      const x = (8 + rand() * (WIDTH - 16)).toFixed(1);
      const y = (8 + rand() * (HEIGHT - 16)).toFixed(1);
      const r = (layer.minR + Math.pow(rand(), 1.8) * (layer.maxR - layer.minR)).toFixed(2);
      const op = (layer.minOp + rand() * (layer.maxOp - layer.minOp)).toFixed(2);
      const color =
        lIdx === 2
          ? i % 3 === 0
            ? '#e0f2fe'
            : i % 5 === 0
              ? '#fef3c7'
              : '#ffffff'
          : i % 7 === 0
            ? '#bae6fd'
            : i % 11 === 0
              ? '#c7d2fe'
              : '#e2e8f0';
      const star = `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${op}"/>`;
      layer.buckets[i % 3].push(star);
    }
  });

  return layers
    .map((layer) =>
      layer.buckets
        .map((stars, bIdx) => `<g class="${layer.cls}-${bIdx + 1}">${stars.join('')}</g>`)
        .join('')
    )
    .join('\n    ');
}

function buildBackgroundNebula() {
  return `
  <g id="bg-nebula" filter="url(#blur-bg-nebula)">
    <ellipse cx="420" cy="145" rx="185" ry="110" transform="rotate(-18 420 145)" fill="url(#neb-purple)" opacity="0.55"/>
    <ellipse cx="670" cy="340" rx="205" ry="125" transform="rotate(14 670 340)" fill="url(#neb-teal)" opacity="0.5"/>
    <ellipse cx="755" cy="160" rx="165" ry="105" transform="rotate(-24 755 160)" fill="url(#neb-pink)" opacity="0.45"/>
    <ellipse cx="320" cy="365" rx="175" ry="95" transform="rotate(10 320 365)" fill="url(#neb-teal)" opacity="0.32"/>
  </g>`;
}

function generateGalacticLayers() {
  const rand = mulberry32(202611);
  const ringData = RINGS.map(() => ({
    clouds: [],
    dust: [],
    nebulae: [],
    stars: [],
    twinkleBuckets: [[], [], [], []],
  }));

  // Central bar & inner bulge clouds in Ring 0
  for (let i = 0; i < 18; i++) {
    const t = (rand() - 0.5) * 2;
    const bx = t * 42;
    const by = gaussianRand(rand) * 8;
    const rx = 14 + rand() * 16;
    const ry = 7 + rand() * 7;
    const op = (0.08 + (1 - Math.abs(t)) * 0.14).toFixed(2);
    const fill = Math.abs(t) < 0.45 ? '#fffbeb' : '#fde68a';
    ringData[0].clouds.push(
      `<ellipse cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${fill}" opacity="${op}"/>`
    );
  }

  // Spiral arm clouds, dust lanes, and pink/magenta nebulae
  for (let arm = 0; arm < 4; arm++) {
    const isMain = arm < 2;
    const stepCount = isMain ? 34 : 18;

    for (let s = 0; s < stepCount; s++) {
      const frac = s / (stepCount - 1);
      const r = BAR_RADIUS + frac * (MAX_RADIUS - BAR_RADIUS - 16);
      const ringIdx = getRingIndex(r);
      const theta = armAngle(arm, r);

      const cx = Math.cos(theta) * r;
      const cy = Math.sin(theta) * r;
      const cloudR = (isMain ? 16 : 11) + (1 - frac) * 9;
      const cloudColor = frac < 0.3 ? '#fef08a' : frac < 0.62 ? '#e0f2fe' : '#60a5fa';
      const cloudOp = (isMain ? 0.12 - frac * 0.05 : 0.055 - frac * 0.025).toFixed(3);
      ringData[ringIdx].clouds.push(
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${cloudR.toFixed(1)}" fill="${cloudColor}" opacity="${cloudOp}"/>`
      );

      // Dark dust lane along inner concave edge of main arms
      if (isMain && s > 1 && s < stepCount - 2) {
        const dustR = r - (8.5 + rand() * 4.5);
        const dustTheta = armAngle(arm, dustR) - 0.09;
        const dx = Math.cos(dustTheta) * dustR;
        const dy = Math.sin(dustTheta) * dustR;
        const deg = ((dustTheta * 180) / Math.PI + 68).toFixed(1);
        const rx = (11 + rand() * 9).toFixed(1);
        const ry = (3.4 + rand() * 2.2).toFixed(1);
        const dOp = (0.54 - frac * 0.22).toFixed(2);
        ringData[getRingIndex(dustR)].dust.push(
          `<ellipse cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" rx="${rx}" ry="${ry}" transform="rotate(${deg} ${dx.toFixed(1)} ${dy.toFixed(1)})" fill="#03050e" opacity="${dOp}"/>`
        );
      }

      // Pink/magenta H-II regions along arms
      if ((isMain && s % 3 === 1 && frac > 0.08 && frac < 0.88) || (!isMain && s % 4 === 2 && frac < 0.78)) {
        const nebTheta = theta + (rand() - 0.5) * 0.12;
        const nebR = r + (rand() - 0.5) * 8;
        const nx = Math.cos(nebTheta) * nebR;
        const ny = Math.sin(nebTheta) * nebR;
        const nr = (isMain ? 7.5 : 5.0) + rand() * 6.0;
        const nebFill = rand() > 0.45 ? '#ec4899' : '#f472b6';
        const nebOp = (isMain ? 0.34 + rand() * 0.16 : 0.22 + rand() * 0.12).toFixed(2);
        ringData[getRingIndex(nebR)].nebulae.push(
          `<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="${nr.toFixed(1)}" fill="${nebFill}" opacity="${nebOp}"/>`
        );
      }
    }
  }

  // Bar & bulge stars (~320)
  for (let i = 0; i < 320; i++) {
    const along = (rand() - 0.5) * 2;
    const x = along * 48 + gaussianRand(rand) * 6;
    const y = gaussianRand(rand) * (15 - Math.abs(along) * 6);
    const r = Math.hypot(x, y);
    const ringIdx = getRingIndex(r);
    const size = (0.35 + Math.pow(rand(), 2.2) * 1.15).toFixed(2);
    const op = (0.28 + rand() * 0.65).toFixed(2);
    const fill = pickStarColor(r, rand);
    ringData[ringIdx].stars.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size}" fill="${fill}" opacity="${op}"/>`
    );
  }

  // Spiral arm stars (~1,180)
  for (let i = 0; i < 1180; i++) {
    const arm = rand() < 0.72 ? (rand() < 0.5 ? 0 : 1) : rand() < 0.5 ? 2 : 3;
    const isMain = arm < 2;
    const frac = Math.pow(rand(), 0.78);
    const r = BAR_RADIUS * 0.85 + frac * (MAX_RADIUS - BAR_RADIUS * 0.85);
    const baseTheta = armAngle(arm, r);
    const spreadAngle = (isMain ? 0.19 : 0.15) * (0.65 + frac * 0.9);
    const theta = baseTheta + gaussianRand(rand) * spreadAngle;
    const rJitter = Math.max(8, r + gaussianRand(rand) * (isMain ? 10 : 7));
    const x = Math.cos(theta) * rJitter;
    const y = Math.sin(theta) * rJitter;
    const ringIdx = getRingIndex(rJitter);
    const size = (0.35 + Math.pow(rand(), 2.3) * 1.35).toFixed(2);
    const op = (0.22 + rand() * 0.72).toFixed(2);
    const fill = pickStarColor(rJitter, rand);
    const circle = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size}" fill="${fill}" opacity="${op}"/>`;

    if (i % 25 === 0) {
      ringData[ringIdx].twinkleBuckets[i % 4].push(circle);
    } else {
      ringData[ringIdx].stars.push(circle);
    }
  }

  // Outer halo & disk scatter (~260)
  for (let i = 0; i < 260; i++) {
    const r = 45 + Math.pow(rand(), 0.72) * 222;
    const theta = rand() * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    const ringIdx = getRingIndex(r);
    const size = (0.3 + rand() * 0.85).toFixed(2);
    const op = (0.12 + rand() * 0.36).toFixed(2);
    const fill = pickStarColor(r, rand);
    ringData[ringIdx].stars.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size}" fill="${fill}" opacity="${op}"/>`
    );
  }

  return ringData;
}

// Irregular low-poly rock polygon + sunlit highlight facet
function makeAsteroidSvg(cx, cy, baseR, rand, toneIdx) {
  const fills = ['#78716c', '#64748b', '#8b735b', '#57534e', '#71717a', '#9a8470'];
  const fill = fills[toneIdx % fills.length];
  const vertices = 5 + (toneIdx % 3);
  const pts = [];
  const rotOffset = rand() * Math.PI * 2;
  for (let v = 0; v < vertices; v++) {
    const a = rotOffset + (v * Math.PI * 2) / vertices + (rand() - 0.5) * 0.28;
    const rr = baseR * (0.68 + rand() * 0.52);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  const poly = pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  // Highlight edge along top-left 2 segments
  const hl = `${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} ${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)} ${pts[2][0].toFixed(1)},${pts[2][1].toFixed(1)}`;
  return `<polygon points="${poly}" fill="${fill}" stroke="#334155" stroke-width="0.35"/><polyline points="${hl}" fill="none" stroke="#e2e8f0" stroke-width="0.55" stroke-opacity="0.52" stroke-linecap="round"/>`;
}

function buildAsteroidBelt() {
  const rand = mulberry32(55109);
  const rocks = [];
  const count = 92;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.08;
    const radius = 212 + (rand() - 0.5) * 26;
    const cx = Math.cos(angle) * radius;
    const cy = Math.sin(angle) * radius;
    const size = 1.3 + rand() * 1.9;
    rocks.push(makeAsteroidSvg(cx, cy, size, rand, i));
  }

  return `<g class="asteroid-belt">${rocks.join('')}</g>`;
}

function buildDriftingRocks() {
  const rand = mulberry32(7731);
  const drifters = [
    { cls: 'drift-1', sx: -30, sy: 340, deg: -16, dur: 42, delay: -9, spin: 9, size: 3.4 },
    { cls: 'drift-2', sx: 930, sy: 120, deg: 158, dur: 48, delay: -24, spin: 12, size: 2.9 },
    { cls: 'drift-3', sx: 210, sy: -25, deg: 58, dur: 52, delay: -33, spin: 8, size: 2.7 },
    { cls: 'drift-4', sx: 680, sy: 505, deg: -115, dur: 46, delay: -14, spin: 10, size: 3.1 },
  ];

  return drifters
    .map((d, idx) => {
      const rock = makeAsteroidSvg(0, 0, d.size, rand, idx + 2);
      return `<g transform="translate(${d.sx}, ${d.sy}) rotate(${d.deg})"><g class="drifter ${d.cls}"><g class="tumble" style="animation-duration: ${d.spin}s">${rock}</g></g></g>`;
    })
    .join('\n    ');
}

// 5 diagonal comets: tail extends along -X while flight translates along +X
// Comets 1 & 2 have static base positions in mid-sky (for static/reduced-motion),
// while all 5 sweep smoothly from offscreen (-520px) to offscreen (+680px) in CSS animation.
function buildComets() {
  const comets = [
    { cls: 'comet-1', sx: 460, sy: 92, deg: 28, len: 145, headR: 3.1, color: '#67e8f9' },
    { cls: 'comet-2', sx: 760, sy: 392, deg: 158, len: 138, headR: 3.0, color: '#bae6fd' },
    { cls: 'comet-3', sx: -120, sy: 380, deg: -26, len: 130, headR: 2.9, color: '#a5f3fc' },
    { cls: 'comet-4', sx: 510, sy: -110, deg: 52, len: 140, headR: 3.0, color: '#c4b5fd' },
    { cls: 'comet-5', sx: -120, sy: 255, deg: -14, len: 145, headR: 3.2, color: '#7dd3fc' },
  ];

  return comets
    .map((c) => {
      const tailPoly = `0,-${(c.headR * 0.95).toFixed(2)} -${c.len},0 0,${(c.headR * 0.95).toFixed(2)}`;
      const outerPoly = `0,-${(c.headR * 2.1).toFixed(2)} -${Math.round(c.len * 0.85)},0 0,${(c.headR * 2.1).toFixed(2)}`;
      return `<g transform="translate(${c.sx}, ${c.sy}) rotate(${c.deg})">
        <g class="comet ${c.cls}">
          <polygon points="${outerPoly}" fill="url(#comet-tail-grad)" opacity="0.35" filter="url(#blur-star)"/>
          <polygon points="${tailPoly}" fill="url(#comet-tail-grad)" opacity="0.9"/>
          <circle cx="0" cy="0" r="${(c.headR * 2.6).toFixed(1)}" fill="${c.color}" opacity="0.34" filter="url(#blur-star)"/>
          <circle cx="0" cy="0" r="${c.headR}" fill="${c.color}"/>
          <circle cx="0" cy="0" r="${(c.headR * 0.52).toFixed(2)}" fill="#ffffff"/>
        </g>
      </g>`;
    })
    .join('\n    ');
}

// 4 quick shooting stars firing every ~8-15 seconds
function buildShootingStars() {
  const streaks = [
    { cls: 'shoot-1', sx: 810, sy: 56, deg: 152 },
    { cls: 'shoot-2', sx: 260, sy: -60, deg: 34 },
    { cls: 'shoot-3', sx: 960, sy: 270, deg: 196 },
    { cls: 'shoot-4', sx: 420, sy: 540, deg: -36 },
  ];

  return streaks
    .map(
      (s) => `<g transform="translate(${s.sx}, ${s.sy}) rotate(${s.deg})">
      <g class="shoot ${s.cls}">
        <polygon points="0,-1.1 -78,0 0,1.1" fill="url(#shoot-grad)"/>
        <circle cx="0" cy="0" r="1.4" fill="#ffffff"/>
      </g>
    </g>`
    )
    .join('\n    ');
}

function scoreRepositories(repos, featuredSet, referenceIso) {
  const refTime = referenceIso ? new Date(referenceIso).getTime() : Date.now();
  const raw = repos.map((repo) => {
    const bytes = (repo.languages || []).reduce((sum, l) => sum + (l.size || 0), 0);
    const sizeScore = Math.log10(bytes + 1000) / 7;
    const pushedMs = repo.pushedAt ? new Date(repo.pushedAt).getTime() : 0;
    const daysAgo = pushedMs > 0 ? Math.max(0, (refTime - pushedMs) / 86400000) : 365;
    const recencyScore = Math.exp(-daysAgo / 90);
    const isFeatured = featuredSet.has(repo.name);
    const featuredBoost = isFeatured ? 0.85 : 0;
    const composite = featuredBoost + sizeScore * 0.55 + recencyScore * 0.45;
    return { repo, bytes, isFeatured, composite };
  });

  const maxComposite = Math.max(...raw.map((item) => item.composite), 1);
  const minComposite = Math.min(...raw.map((item) => item.composite), 0);
  const span = Math.max(maxComposite - minComposite, 0.001);

  return raw
    .map((item) => {
      const norm = (item.composite - minComposite) / span;
      const radius = item.isFeatured
        ? Number((4.6 + Math.pow(norm, 0.85) * 3.1).toFixed(2))
        : Number((2.2 + norm * 1.4).toFixed(2));
      return { ...item, norm, radius };
    })
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.composite - a.composite);
}

function layoutRepoStars(scoredRepos, topLanguages) {
  const topLangNames = topLanguages.map((l) => l.name);
  const armBuckets = [[], [], [], []];

  // Separate featured vs non-featured so featured spread cleanly across outer/mid arm bands
  const featured = scoredRepos.filter((item) => item.isFeatured);
  const regular = scoredRepos.filter((item) => !item.isFeatured);

  featured.forEach((item, idx) => {
    const langName = item.repo.primaryLanguage?.name;
    const langArm = topLangNames.indexOf(langName);
    // Distribute evenly across arms so no arm exceeds 3 featured stars
    const assignedArm = langArm >= 0 && armBuckets[langArm].length < 3 ? langArm : idx % 4;
    armBuckets[assignedArm].push(item);
  });

  regular.forEach((item, idx) => {
    const langName = item.repo.primaryLanguage?.name;
    const langArm = topLangNames.indexOf(langName);
    const assignedArm = langArm >= 0 ? langArm : idx % 4;
    armBuckets[assignedArm].push(item);
  });

  const placed = [];
  armBuckets.forEach((bucket, arm) => {
    const featInArm = bucket.filter((b) => b.isFeatured);
    const regInArm = bucket.filter((b) => !b.isFeatured);

    featInArm.forEach((item, i) => {
      const count = featInArm.length;
      const t = count <= 1 ? 0.45 : 0.14 + (i / (count - 1)) * 0.72;
      const r = 74 + t * 134;
      // Offset onto outer bright ridge of arm (away from inner dust lane)
      const offsetTheta = 0.045 + (i % 2 === 0 ? 0.035 : -0.02);
      const theta = armAngle(arm, r) + offsetTheta;
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r;
      const screen = diskToScreen(x, y);
      placed.push({
        ...item,
        x,
        y,
        r,
        theta,
        screen,
        ringIdx: getRingIndex(r),
        color: item.repo.primaryLanguage?.color || '#cbd5e1',
      });
    });

    regInArm.forEach((item, i) => {
      const count = regInArm.length;
      const t = count <= 1 ? 0.55 : 0.05 + (i / (count - 1)) * 0.88;
      const r = 64 + t * 172;
      const offsetTheta = (i % 2 === 0 ? -1 : 1) * 0.11;
      const theta = armAngle(arm, r) + offsetTheta;
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r;
      const screen = diskToScreen(x, y);
      placed.push({
        ...item,
        x,
        y,
        r,
        theta,
        screen,
        ringIdx: getRingIndex(r),
        color: item.repo.primaryLanguage?.color || '#cbd5e1',
      });
    });
  });

  return placed;
}

function chooseLabelPlacements(placedRepos) {
  const placedBoxes = [];
  const placements = new Map();
  const featured = placedRepos.filter((r) => r.isFeatured);

  // Reserve star hit-boxes so labels never cover another featured star
  const starBoxes = featured.map((s) => ({
    name: s.repo.name,
    x: s.screen.x - s.radius * 1.9,
    y: s.screen.y - s.radius * 1.9,
    w: s.radius * 3.8,
    h: s.radius * 3.8,
  }));

  // Place longest names first so they claim clean spots without clipping
  const ordered = [...featured].sort((a, b) => b.repo.name.length - a.repo.name.length);

  for (const item of ordered) {
    const text = item.repo.name;
    const estW = text.length * 6.5 + 10;
    const estH = 15;
    const spikeClear = item.radius * 2.8 + 6;

    const preferLeft = item.screen.x > 660;
    const rightCands = [
      { dx: spikeClear, dy: 4, anchor: 'start' },
      { dx: -spikeClear, dy: 4, anchor: 'end' },
      { dx: 0, dy: -(item.radius * 2.5 + 7), anchor: 'middle' },
      { dx: 0, dy: item.radius * 2.5 + 15, anchor: 'middle' },
      { dx: spikeClear * 0.85, dy: -(item.radius * 1.8 + 8), anchor: 'start' },
      { dx: -spikeClear * 0.85, dy: item.radius * 1.8 + 14, anchor: 'end' },
      { dx: -spikeClear * 0.85, dy: -(item.radius * 1.8 + 8), anchor: 'end' },
      { dx: spikeClear * 0.85, dy: item.radius * 1.8 + 14, anchor: 'start' },
    ];
    const candidates = preferLeft ? [rightCands[1], rightCands[0], ...rightCands.slice(2)] : rightCands;

    let chosen = candidates[0];
    for (const cand of candidates) {
      const lx =
        cand.anchor === 'start'
          ? item.screen.x + cand.dx
          : cand.anchor === 'end'
            ? item.screen.x + cand.dx - estW
            : item.screen.x + cand.dx - estW / 2;
      const ly = item.screen.y + cand.dy - estH + 3;

      const inBounds =
        lx >= 268 && lx + estW <= WIDTH - 16 && ly >= 22 && ly + estH <= HEIGHT - 16;
      const hitsLabel = placedBoxes.some(
        (b) => !(lx + estW + 6 < b.x || lx > b.x + b.w + 6 || ly + estH + 5 < b.y || ly > b.y + b.h + 5)
      );
      const hitsStar = starBoxes.some(
        (sb) =>
          sb.name !== item.repo.name &&
          !(lx + estW + 4 < sb.x || lx > sb.x + sb.w + 4 || ly + estH + 4 < sb.y || ly > sb.y + sb.h + 4)
      );

      if (inBounds && !hitsLabel && !hitsStar) {
        chosen = cand;
        placedBoxes.push({ x: lx, y: ly, w: estW, h: estH });
        break;
      }
    }

    placements.set(item.repo.name, chosen);
  }

  return placements;
}

function buildRepoElement(item, labelPos, isBiggest) {
  const x = item.x.toFixed(1);
  const y = item.y.toFixed(1);
  const rad = item.radius;
  const ringClass = RINGS[item.ringIdx].id;

  if (!item.isFeatured) {
    // Small unlabeled star for non-featured repos
    return `<g transform="translate(${x}, ${y})"><g transform="scale(1, ${INV_SCALE_Y}) rotate(${-TILT_DEG})"><circle cx="0" cy="0" r="${(rad * 1.9).toFixed(1)}" fill="${item.color}" opacity="0.22"/><circle cx="0" cy="0" r="${rad}" fill="${item.color}" stroke="#f8fafc" stroke-opacity="0.35" stroke-width="0.5"/><circle cx="0" cy="0" r="${(rad * 0.38).toFixed(2)}" fill="#ffffff" opacity="0.8"/></g></g>`;
  }

  const spikeLen = (rad * (isBiggest ? 3.4 : 2.8)).toFixed(1);
  const glowFilter = isBiggest ? 'url(#blur-nebula)' : 'url(#blur-star)';
  const outerGlow = isBiggest
    ? `<circle cx="0" cy="0" r="${(rad * 3.8).toFixed(1)}" fill="${item.color}" opacity="0.34" filter="${glowFilter}"/><circle cx="0" cy="0" r="${(rad * 2.0).toFixed(1)}" fill="${item.color}" opacity="0.46" filter="url(#blur-star)"/>`
    : `<circle cx="0" cy="0" r="${(rad * 2.2).toFixed(1)}" fill="${item.color}" opacity="0.28" filter="${glowFilter}"/>`;

  const pos = labelPos || { dx: rad * 2.8 + 6, dy: 4, anchor: 'start' };
  const labelSvg = `<text x="${pos.dx.toFixed(1)}" y="${pos.dy.toFixed(1)}" text-anchor="${pos.anchor}" font-family="'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif" font-size="11" font-weight="600" fill="#030611" stroke="#030611" stroke-width="3.6" stroke-linejoin="round" opacity="0.92">${escapeXml(item.repo.name)}</text><text x="${pos.dx.toFixed(1)}" y="${pos.dy.toFixed(1)}" text-anchor="${pos.anchor}" font-family="'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif" font-size="11" font-weight="600" fill="#f1f5f9">${escapeXml(item.repo.name)}</text>`;

  return `<g transform="translate(${x}, ${y})"><g class="counter ${ringClass}-counter"><g transform="scale(1, ${INV_SCALE_Y}) rotate(${-TILT_DEG})">${outerGlow}<line x1="-${spikeLen}" y1="0" x2="${spikeLen}" y2="0" stroke="${item.color}" stroke-width="${isBiggest ? '1.3' : '0.9'}" stroke-opacity="0.82"/><line x1="0" y1="-${spikeLen}" x2="0" y2="${spikeLen}" stroke="${item.color}" stroke-width="${isBiggest ? '1.3' : '0.9'}" stroke-opacity="0.82"/><circle cx="0" cy="0" r="${rad}" fill="${item.color}" stroke="#ffffff" stroke-opacity="${isBiggest ? '0.9' : '0.55'}" stroke-width="${isBiggest ? '1.1' : '0.7'}"/><circle cx="0" cy="0" r="${(rad * 0.42).toFixed(2)}" fill="#ffffff" opacity="0.92"/>${labelSvg}</g></g></g>`;
}

export function renderGalaxySvg(stats) {
  const user = stats?.user || {};
  const login = user.login || 'manishchandraraturi';
  const repos = stats?.repositories || [];
  const publicRepos = user.publicRepos ?? repos.length ?? 0;
  const topLanguages = (stats?.languages || []).slice(0, 4);

  const featuredSet = new Set(FEATURED);
  const ringData = generateGalacticLayers();
  const scored = scoreRepositories(repos, featuredSet, stats?.fetchedAt);
  const placedRepos = layoutRepoStars(scored, topLanguages);
  const labelPlacements = chooseLabelPlacements(placedRepos);
  const biggestName = scored[0]?.repo.name;

  const repoGroupsByRing = RINGS.map(() => []);
  placedRepos.forEach((item) => {
    const isBiggest = item.repo.name === biggestName;
    repoGroupsByRing[item.ringIdx].push(
      buildRepoElement(item, labelPlacements.get(item.repo.name), isBiggest)
    );
  });

  const ringCss = RINGS.map(
    (ring) =>
      `.${ring.id} { transform-origin: 0px 0px; animation: spin-cw ${ring.duration}s linear infinite; }\n    .${ring.id}-counter { transform-origin: 0px 0px; animation: spin-ccw ${ring.duration}s linear infinite; }`
  ).join('\n    ');

  const ringsSvg = RINGS.map((ring, idx) => {
    const data = ringData[idx];
    const isCore = idx === 0;

    // Subtle lens-flare bloom + warm core in Ring 0
    const coreElements = isCore
      ? `<g class="core-pulse">
          <ellipse cx="0" cy="0" rx="56" ry="26" fill="url(#core-bar-grad)" filter="url(#blur-nebula)"/>
          <ellipse cx="0" cy="0" rx="88" ry="6" fill="url(#lens-flare-grad)" opacity="0.45" filter="url(#blur-star)"/>
          <circle cx="0" cy="0" r="32" fill="url(#core-hot-grad)"/>
          <circle cx="0" cy="0" r="9.5" fill="#ffffff" opacity="0.96"/>
        </g>`
      : '';

    const twinkles = data.twinkleBuckets
      .map((bucket, bIdx) =>
        bucket.length ? `<g class="tw tw${bIdx + 1}">${bucket.join('')}</g>` : ''
      )
      .join('');

    return `<g class="ring ${ring.id}">
      <g filter="url(#blur-nebula)">${data.clouds.join('')}${data.nebulae.join('')}</g>
      <g filter="url(#blur-dust)">${data.dust.join('')}</g>
      ${coreElements}
      <g>${data.stars.join('')}</g>
      ${twinkles}
      <g>${repoGroupsByRing[idx].join('')}</g>
    </g>`;
  }).join('\n    ');

  const fontSans =
    "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";
  const fontMono =
    "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

  const legendItems = topLanguages
    .map((lang, idx) => {
      const y = 224 + idx * 28;
      return `
      <g>
        <circle cx="44" cy="${y - 4}" r="5" fill="${escapeXml(lang.color || '#94a3b8')}"/>
        <text x="58" y="${y}" font-size="13" font-weight="600" fill="#e2e8f0">${escapeXml(lang.name)}</text>
        <text x="230" y="${y}" text-anchor="end" font-family="${fontMono}" font-size="12" fill="#94a3b8">${escapeXml(lang.percentage.toFixed(1))}%</text>
      </g>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Repo Galaxy for @${escapeXml(login)}">
  <style>
    @keyframes spin-cw {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes spin-ccw {
      from { transform: rotate(0deg); }
      to { transform: rotate(-360deg); }
    }
    @keyframes core-pulse {
      0%, 100% { opacity: 0.92; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.045); }
    }
    @keyframes twinkle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.28; }
    }
    @keyframes comet-fly-mid {
      0% { transform: translateX(-520px); opacity: 0; }
      4% { opacity: 1; }
      14% { transform: translateX(0px); opacity: 0.95; }
      28% { transform: translateX(620px); opacity: 0; }
      100% { transform: translateX(620px); opacity: 0; }
    }
    @keyframes comet-fly-edge {
      0% { transform: translateX(0px); opacity: 0; }
      4% { opacity: 1; }
      22% { opacity: 0.95; }
      28% { transform: translateX(1180px); opacity: 0; }
      100% { transform: translateX(1180px); opacity: 0; }
    }
    @keyframes rock-drift {
      0% { transform: translateX(0px); opacity: 0; }
      8% { opacity: 0.95; }
      92% { opacity: 0.95; }
      100% { transform: translateX(1080px); opacity: 0; }
    }
    @keyframes shoot-streak-mid {
      0% { transform: translateX(-140px); opacity: 0; }
      2.5% { transform: translateX(0px); opacity: 1; }
      6.5% { transform: translateX(180px); opacity: 0; }
      100% { transform: translateX(180px); opacity: 0; }
    }
    @keyframes shoot-streak-edge {
      0% { transform: translateX(0px); opacity: 0; }
      2% { opacity: 1; }
      6.5% { transform: translateX(280px); opacity: 0; }
      100% { transform: translateX(280px); opacity: 0; }
    }
    ${ringCss}
    .asteroid-belt { transform-origin: 0px 0px; animation: spin-cw 300s linear infinite; }
    .core-pulse { transform-origin: 0px 0px; animation: core-pulse 8s ease-in-out infinite; }
    .tumble { transform-origin: 0px 0px; animation: spin-cw 9s linear infinite; }

    /* Parallax twinkle speeds */
    .p-far-1 { animation: twinkle 17s ease-in-out infinite 0s; }
    .p-far-2 { animation: twinkle 19s ease-in-out infinite -6s; }
    .p-far-3 { animation: twinkle 21s ease-in-out infinite -13s; }
    .p-mid-1 { animation: twinkle 11s ease-in-out infinite -2s; }
    .p-mid-2 { animation: twinkle 13s ease-in-out infinite -5.5s; }
    .p-mid-3 { animation: twinkle 12s ease-in-out infinite -9s; }
    .p-near-1 { animation: twinkle 6.5s ease-in-out infinite -1s; }
    .p-near-2 { animation: twinkle 7.5s ease-in-out infinite -3.2s; }
    .p-near-3 { animation: twinkle 8.2s ease-in-out infinite -5.1s; }

    /* Galactic arm twinkle groups */
    .tw { animation: twinkle 11s ease-in-out infinite; }
    .tw1 { animation-delay: 0s; }
    .tw2 { animation-delay: -3.4s; animation-duration: 13s; }
    .tw3 { animation-delay: -6.8s; animation-duration: 9.5s; }
    .tw4 { animation-delay: -9.5s; animation-duration: 14.5s; }

    /* Staggered comets (1-2 visible at once) */
    .comet-1 { animation: comet-fly-mid 36s linear infinite -5s; }
    .comet-2 { animation: comet-fly-mid 42s linear infinite -20s; }
    .comet-3 { animation: comet-fly-edge 38s linear infinite -12s; }
    .comet-4 { animation: comet-fly-edge 44s linear infinite -29s; }
    .comet-5 { animation: comet-fly-edge 40s linear infinite -34s; }

    /* Tumbling drifting rocks */
    .drifter { animation: rock-drift 46s linear infinite; }
    .drift-1 { animation-duration: 42s; animation-delay: -9s; }
    .drift-2 { animation-duration: 48s; animation-delay: -24s; }
    .drift-3 { animation-duration: 52s; animation-delay: -33s; }
    .drift-4 { animation-duration: 46s; animation-delay: -14s; }

    /* Quick shooting stars every 8-15s */
    .shoot-1 { animation: shoot-streak-mid 10.5s ease-out infinite -0.25s; }
    .shoot-2 { animation: shoot-streak-edge 9.5s ease-out infinite -3.8s; }
    .shoot-3 { animation: shoot-streak-edge 13.0s ease-out infinite -7.6s; }
    .shoot-4 { animation: shoot-streak-edge 14.5s ease-out infinite -11.4s; }

    @media (prefers-reduced-motion: reduce) {
      .ring, .counter, .asteroid-belt, .core-pulse, .tumble,
      .p-far-1, .p-far-2, .p-far-3, .p-mid-1, .p-mid-2, .p-mid-3, .p-near-1, .p-near-2, .p-near-3,
      .tw, .comet, .comet-1, .comet-2, .comet-3, .comet-4, .comet-5,
      .drifter, .shoot, .shoot-1, .shoot-2, .shoot-3, .shoot-4 {
        animation: none !important;
      }
    }
  </style>
  <defs>
    <linearGradient id="space-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#030611"/>
      <stop offset="55%" stop-color="#060c1f"/>
      <stop offset="100%" stop-color="#09122b"/>
    </linearGradient>
    <radialGradient id="vignette" cx="52%" cy="50%" r="65%">
      <stop offset="48%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.58"/>
    </radialGradient>
    <radialGradient id="neb-purple" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="neb-teal" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0d9488" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#0d9488" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="neb-pink" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#db2777" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="#db2777" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="gas-halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.2"/>
      <stop offset="52%" stop-color="#1e3a8a" stop-opacity="0.1"/>
      <stop offset="82%" stop-color="#312e81" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#030611" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="core-bar-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fffbeb" stop-opacity="0.96"/>
      <stop offset="45%" stop-color="#fde68a" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="core-hot-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="38%" stop-color="#fef3c7" stop-opacity="0.88"/>
      <stop offset="75%" stop-color="#fcd34d" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="lens-flare-grad" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0"/>
      <stop offset="30%" stop-color="#bae6fd" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="#fffbeb" stop-opacity="0.9"/>
      <stop offset="70%" stop-color="#bae6fd" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="comet-tail-grad" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0"/>
      <stop offset="55%" stop-color="#7dd3fc" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="shoot-grad" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0"/>
      <stop offset="70%" stop-color="#bae6fd" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="card-border" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.38"/>
      <stop offset="50%" stop-color="#1e293b" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#818cf8" stop-opacity="0.38"/>
    </linearGradient>
    <filter id="blur-bg-nebula" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="28"/>
    </filter>
    <filter id="blur-nebula" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="11"/>
    </filter>
    <filter id="blur-dust" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="5.5"/>
    </filter>
    <filter id="blur-star" x="-160%" y="-160%" width="420%" height="420%">
      <feGaussianBlur stdDeviation="3.2"/>
    </filter>
    <clipPath id="card-clip">
      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="20"/>
    </clipPath>
  </defs>

  <g clip-path="url(#card-clip)">
    <!-- Deep Navy-Black Space & Colorful Background Nebula -->
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#space-bg)"/>
    ${buildBackgroundNebula()}

    <!-- 3 Parallax Star Layers -->
    <g id="parallax-stars">${buildParallaxFieldStars()}</g>

    <!-- Tilted Galactic Disk + Faint Gas Halo + Asteroid Belt -->
    <g transform="translate(${GALAXY_CX}, ${GALAXY_CY}) rotate(${TILT_DEG}) scale(1, ${TILT_SCALE_Y})">
      <circle cx="0" cy="0" r="305" fill="url(#gas-halo)"/>
      ${buildAsteroidBelt()}
      ${ringsSvg}
    </g>

    <!-- Drifting Tumbling Rocks, Comets, and Shooting Stars -->
    <g id="drifting-rocks">${buildDriftingRocks()}</g>
    <g id="comets">${buildComets()}</g>
    <g id="shooting-stars">${buildShootingStars()}</g>

    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#vignette)"/>
  </g>

  <!-- Rounded Card Border -->
  <rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="20" fill="none" stroke="url(#card-border)" stroke-width="1.5"/>

  <!-- Top-Left Header -->
  <g font-family="${fontSans}">
    <text x="36" y="46" font-size="11" font-weight="700" letter-spacing="2.6" fill="#38bdf8">REPO GALAXY</text>
    <text x="36" y="86" font-size="28" font-weight="800" fill="#f8fafc" letter-spacing="-0.4">@${escapeXml(login)}</text>
    <text x="36" y="114" font-family="${fontMono}" font-size="13.5" font-weight="500" fill="#cbd5e1">${escapeXml(pluralize(publicRepos, 'repository', 'repositories'))}</text>
    <text x="36" y="138" font-size="12" fill="#64748b">Each star is a repository.</text>
  </g>

  <!-- ARMS Legend -->
  <g font-family="${fontSans}">
    <text x="36" y="196" font-size="10.5" font-weight="700" letter-spacing="2.2" fill="#64748b">ARMS</text>
    ${legendItems}
  </g>
</svg>
`;
}

async function main() {
  const raw = await fs.readFile(INPUT_PATH, 'utf8');
  const stats = JSON.parse(raw);
  const svg = renderGalaxySvg(stats);

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, svg, 'utf8');
  console.log(`Generated ${OUTPUT_PATH} (${(Buffer.byteLength(svg, 'utf8') / 1024).toFixed(1)} KB)`);
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
