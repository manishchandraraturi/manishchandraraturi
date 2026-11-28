import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLangColor } from './colors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT_DIR, 'data', 'stats.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'assets', 'solar.svg');

const WIDTH = 900;
const HEIGHT = 600;
const CX = 450;
const CY = 304;

const LANG_MARKS = {
  TypeScript: 'TS',
  Python: 'PY',
  'Jupyter Notebook': 'IPYNB',
  Kotlin: 'KT',
  JavaScript: 'JS',
  HTML: 'HTML',
  CSS: 'CSS',
  Rust: 'RS',
  Go: 'GO',
  Java: 'JAVA',
  'C++': 'C++',
  C: 'C',
  Shell: 'SH',
  Dart: 'DART',
  Swift: 'SW',
  Ruby: 'RB',
};

// Orbit tracks for top 6 languages (gap between R3=156 and R4=206 holds the tilted asteroid belt)
const ORBIT_SLOTS = [
  { orbitR: 88, angleDeg: -48, duration: 40, labelAbove: true },
  { orbitR: 124, angleDeg: 148, duration: 64 },
  { orbitR: 156, angleDeg: 32, duration: 88 },
  { orbitR: 206, angleDeg: -148, duration: 114 },
  { orbitR: 236, angleDeg: -12, duration: 138 },
  { orbitR: 264, angleDeg: 172, duration: 160 },
];

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getLangMark(name) {
  if (LANG_MARKS[name]) return LANG_MARKS[name];
  return String(name || 'CODE')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase();
}

function shadeHex(hex, factor) {
  const clean = String(hex || '#94a3b8').replace('#', '');
  if (clean.length !== 6) return '#64748b';
  const r = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * factor)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * factor)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function tintWhiteHex(hex, amount = 0.55) {
  const clean = String(hex || '#94a3b8').replace('#', '');
  if (clean.length !== 6) return '#e2e8f0';
  const r = Math.round(parseInt(clean.slice(0, 2), 16) * (1 - amount) + 255 * amount);
  const g = Math.round(parseInt(clean.slice(2, 4), 16) * (1 - amount) + 255 * amount);
  const b = Math.round(parseInt(clean.slice(4, 6), 16) * (1 - amount) + 255 * amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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

async function fetchAvatarDataUri(avatarUrl) {
  if (!avatarUrl) return null;
  const response = await fetch(avatarUrl, {
    headers: { 'User-Agent': 'manishchandraraturi-profile-scripts' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch avatar (${response.status}): ${avatarUrl}`);
  }
  const contentType = response.headers.get('content-type')?.split(';')[0].trim() || 'image/png';
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

function buildStarLayers() {
  const rand = mulberry32(31415);
  const layers = [
    { cls: 'star-far', count: 240, minR: 0.3, maxR: 0.65, minOp: 0.14, maxOp: 0.4, buckets: [[], [], []] },
    { cls: 'star-mid', count: 140, minR: 0.55, maxR: 0.95, minOp: 0.35, maxOp: 0.68, buckets: [[], [], []] },
    { cls: 'star-near', count: 55, minR: 0.9, maxR: 1.4, minOp: 0.6, maxOp: 0.92, buckets: [[], [], []] },
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
            ? '#fef3c7'
            : i % 5 === 0
              ? '#bae6fd'
              : '#ffffff'
          : i % 7 === 0
            ? '#cbd5e1'
            : '#e2e8f0';
      layer.buckets[i % 3].push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${op}"/>`);
    }
  });

  return layers
    .map((layer) =>
      layer.buckets.map((stars, idx) => `<g class="${layer.cls}-${idx + 1}">${stars.join('')}</g>`).join('')
    )
    .join('\n    ');
}

function buildAsteroidBelt() {
  const rand = mulberry32(99173);
  const fills = ['#78716c', '#64748b', '#8b735b', '#57534e', '#71717a', '#9a8470'];
  const rocks = [];
  const count = 74;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.08;
    const radius = 177 + (rand() - 0.5) * 14;
    const cx = Math.cos(angle) * radius;
    const cy = Math.sin(angle) * radius;
    const baseR = 1.4 + rand() * 1.8;
    const vertices = 5 + (i % 3);
    const pts = [];
    const rot = rand() * Math.PI * 2;

    for (let v = 0; v < vertices; v++) {
      const a = rot + (v * Math.PI * 2) / vertices + (rand() - 0.5) * 0.25;
      const rr = baseR * (0.68 + rand() * 0.5);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    const poly = pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
    const hl = `${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} ${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)} ${pts[2][0].toFixed(1)},${pts[2][1].toFixed(1)}`;
    rocks.push(
      `<polygon points="${poly}" fill="${fills[i % fills.length]}" stroke="#1e293b" stroke-width="0.3"/><polyline points="${hl}" fill="none" stroke="#e2e8f0" stroke-width="0.5" stroke-opacity="0.5"/>`
    );
  }

  return `<g transform="translate(${CX}, ${CY}) rotate(-9) scale(1, 0.91)"><g class="asteroid-belt">${rocks.join('')}</g></g>`;
}

function rectsOverlap(a, b, pad = 4) {
  return !(
    a.x + a.w + pad < b.x ||
    a.x > b.x + b.w + pad ||
    a.y + a.h + pad < b.y ||
    a.y > b.y + b.h + pad
  );
}

function circleOverlapsRect(cx, cy, r, rect, pad = 4) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < (r + pad) * (r + pad);
}

function getBaseReservedRects() {
  return [
    // Top-left header: SOLAR SYSTEM · @MANISHCHANDRARATURI
    { x: 20, y: 16, w: 380, h: 36 },
    // Bottom-right legend: planets = languages · moons = repos · comets = recent pushes
    { x: 420, y: HEIGHT - 42, w: WIDTH - 436, h: 30 },
  ];
}

function buildComets(recentRepos, obstacles) {
  const configs = [
    { cls: 'comet-1', sx: 145, sy: 105, deg: 22, len: 120, color: '#67e8f9', onScreen: true },
    { cls: 'comet-2', sx: 765, sy: 485, deg: 198, len: 125, color: '#bae6fd', onScreen: true },
    { cls: 'comet-3', sx: -110, sy: 440, deg: -24, len: 115, color: '#fde68a', onScreen: false },
    { cls: 'comet-4', sx: 790, sy: -90, deg: 142, len: 125, color: '#a5f3fc', onScreen: false },
  ];

  const fontSans =
    "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";

  const placedLabelRects = [];

  return recentRepos
    .slice(0, 4)
    .map((repo, idx) => {
      const c = configs[idx];
      const headR = 3.1;
      const tailPoly = `0,-2.8 -${c.len},0 0,2.8`;
      const outerPoly = `0,-6 -${Math.round(c.len * 0.85)},0 0,6`;

      const estW = repo.name.length * 6.4 + 8;
      const estH = 14;
      const candidates = [
        { dx: 12, dy: -7, anchor: 'start' },
        { dx: -12, dy: -7, anchor: 'end' },
        { dx: 12, dy: 14, anchor: 'start' },
        { dx: -12, dy: 14, anchor: 'end' },
        { dx: 0, dy: -14, anchor: 'middle' },
        { dx: 0, dy: 18, anchor: 'middle' },
      ];

      // Choose an upright offset that does not collide with sun, planet badges, or edges
      let chosen = null;
      if (!c.onScreen) {
        // Offscreen comets get clean side away from their tail (-X in rotated frame)
        const tailPointsRight = Math.cos((c.deg * Math.PI) / 180) < 0;
        chosen = tailPointsRight ? candidates[1] : candidates[0];
      } else {
        for (const cand of candidates) {
          const lx =
            cand.anchor === 'start'
              ? c.sx + cand.dx
              : cand.anchor === 'end'
                ? c.sx + cand.dx - estW
                : c.sx + cand.dx - estW / 2;
          const ly = c.sy + cand.dy - estH + 3;
          const rect = { x: lx, y: ly, w: estW, h: estH };

          const inBounds =
            lx >= 16 && lx + estW <= WIDTH - 16 && ly >= 18 && ly + estH <= HEIGHT - 16;
          const hitsRect =
            obstacles.rects.some((r) => rectsOverlap(rect, r, 6)) ||
            placedLabelRects.some((r) => rectsOverlap(rect, r, 6));
          const hitsCircle = obstacles.circles.some((cir) =>
            circleOverlapsRect(cir.cx, cir.cy, cir.r, rect, 6)
          );

          if (inBounds && !hitsRect && !hitsCircle) {
            chosen = cand;
            placedLabelRects.push(rect);
            break;
          }
        }
      }

      const labelSvg = chosen
        ? `<g transform="rotate(${-c.deg})">
            <text x="${chosen.dx}" y="${chosen.dy}" text-anchor="${chosen.anchor}" font-family="${fontSans}" font-size="11" font-weight="600" fill="#040814" stroke="#040814" stroke-width="3.2" stroke-linejoin="round" opacity="0.9">${escapeXml(repo.name)}</text>
            <text x="${chosen.dx}" y="${chosen.dy}" text-anchor="${chosen.anchor}" font-family="${fontSans}" font-size="11" font-weight="600" fill="#bae6fd">${escapeXml(repo.name)}</text>
          </g>`
        : '';

      return `<g transform="translate(${c.sx}, ${c.sy}) rotate(${c.deg})">
        <g class="comet ${c.cls}">
          <polygon points="${outerPoly}" fill="url(#comet-tail-grad)" opacity="0.32" filter="url(#blur-glow)"/>
          <polygon points="${tailPoly}" fill="url(#comet-tail-grad)" opacity="0.9"/>
          <circle cx="0" cy="0" r="8" fill="${c.color}" opacity="0.34" filter="url(#blur-glow)"/>
          <circle cx="0" cy="0" r="${headR}" fill="${c.color}"/>
          <circle cx="0" cy="0" r="1.5" fill="#ffffff"/>
          ${labelSvg}
        </g>
      </g>`;
    })
    .join('\n    ');
}

function buildPlanetsAndMoons(topLanguages, repositories) {
  const maxPct = Math.max(...topLanguages.map((l) => l.percentage || 0), 1);

  // Group repositories by their primary language matching one of the planets
  const planetNames = new Set(topLanguages.map((l) => l.name));
  const moonsByLang = new Map(topLanguages.map((l) => [l.name, []]));

  for (const repo of repositories) {
    const primary = repo.primaryLanguage?.name;
    if (primary && planetNames.has(primary)) {
      moonsByLang.get(primary).push(repo);
    } else if (repo.languages?.length) {
      const match = repo.languages.find((l) => planetNames.has(l.name));
      if (match) moonsByLang.get(match.name).push(repo);
    }
  }

  const fontSans =
    "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";
  const fontMono =
    "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

  const planetGradients = topLanguages
    .map((lang, idx) => {
      const color = getLangColor(lang.name, lang.color);
      const highlight = tintWhiteHex(color, 0.58);
      const midDark = shadeHex(color, 0.56);
      const deepDark = shadeHex(color, 0.25);
      return `<radialGradient id="planet-grad-${idx}" cx="34%" cy="30%" r="70%">
      <stop offset="0%" stop-color="${highlight}"/>
      <stop offset="35%" stop-color="${color}"/>
      <stop offset="78%" stop-color="${midDark}"/>
      <stop offset="100%" stop-color="${deepDark}"/>
    </radialGradient>`;
    })
    .join('\n    ');

  const orbitRings = topLanguages
    .map((_, idx) => {
      const r = ORBIT_SLOTS[idx].orbitR;
      return `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="#334155" stroke-width="1" stroke-dasharray="4 5" stroke-opacity="0.55"/>`;
    })
    .join('\n    ');

  const planetCss = ORBIT_SLOTS.slice(0, topLanguages.length)
    .map(
      (slot, idx) =>
        `.planet-orbit-${idx} { transform-origin: ${CX}px ${CY}px; animation: orbit-cw ${slot.duration}s linear infinite; }\n    .planet-counter-${idx} { transform-origin: 0px 0px; animation: orbit-ccw ${slot.duration}s linear infinite; }`
    )
    .join('\n    ');

  // Precompute planet circles + sun exclusion zone for collision-free badge/comet placement
  const obstacles = {
    rects: getBaseReservedRects(),
    circles: [{ cx: CX, cy: CY, r: 46 }],
  };

  const planetSpecs = topLanguages.map((lang, idx) => {
    const slot = ORBIT_SLOTS[idx];
    const color = getLangColor(lang.name, lang.color);
    const norm = (lang.percentage || 0) / maxPct;
    const planetR = Number((9.5 + Math.pow(norm, 0.72) * 10.5).toFixed(1));
    const rad = (slot.angleDeg * Math.PI) / 180;
    const px = CX + Math.cos(rad) * slot.orbitR;
    const py = CY + Math.sin(rad) * slot.orbitR;
    const moons = moonsByLang.get(lang.name) || [];
    const maxMoonOrbitR =
      moons.length > 5 ? planetR + 17 : moons.length > 0 ? planetR + 10 : planetR;

    obstacles.circles.push({ cx: px, cy: py, r: maxMoonOrbitR + 3 });
    return { lang, idx, slot, color, planetR, px, py, moons, maxMoonOrbitR };
  });

  const planetsSvg = planetSpecs
    .map(({ lang, idx, slot, color, planetR, px, py, moons, maxMoonOrbitR }) => {
      const moonOrbitRings =
        moons.length > 0
          ? `<circle cx="0" cy="0" r="${(planetR + 9).toFixed(1)}" fill="none" stroke="${color}" stroke-opacity="0.22" stroke-width="0.7"/>${
              moons.length > 5
                ? `<circle cx="0" cy="0" r="${(planetR + 16).toFixed(1)}" fill="none" stroke="${color}" stroke-opacity="0.16" stroke-width="0.6"/>`
                : ''
            }`
          : '';

      const moonsSvg = moons
        .map((repo, mIdx) => {
          const onOuter = moons.length > 5 && mIdx % 2 === 1;
          const mOrbitR = planetR + (onOuter ? 16 : 9);
          const mAngle = (mIdx / Math.max(moons.length, 1)) * Math.PI * 2 + idx * 0.7;
          const mx = Math.cos(mAngle) * mOrbitR;
          const my = Math.sin(mAngle) * mOrbitR;
          const mSize = 2.0 + ((repo.name.length % 3) * 0.35);
          const mDur = (7 + (mIdx % 5) * 2.4 + (onOuter ? 3.5 : 0)).toFixed(1);
          const moonTint = tintWhiteHex(color, 0.65);

          return `<g class="moon-orbit" style="animation-duration: ${mDur}s">
            <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${mSize.toFixed(2)}" fill="${moonTint}" stroke="#060c1f" stroke-width="0.45"/>
          </g>`;
        })
        .join('');

      const mark = getLangMark(lang.name);
      const pctLabel = `${Math.round(lang.percentage || 0)}%`;
      const labelText = `${lang.name} ${pctLabel}`;
      const badgeW = Math.max(24, mark.length * 6.8 + 10);
      const badgeH = 15;
      const totalGroupW = badgeW + 6 + labelText.length * 6.2;

      const belowOffset = { startX: -totalGroupW / 2, badgeY: maxMoonOrbitR + 7 };
      const aboveOffset = { startX: -totalGroupW / 2, badgeY: -(maxMoonOrbitR + badgeH + 7) };
      const rightOffset = { startX: maxMoonOrbitR + 8, badgeY: -badgeH / 2 };
      const leftOffset = { startX: -(maxMoonOrbitR + 8 + totalGroupW), badgeY: -badgeH / 2 };

      const candidates = slot.labelAbove
        ? [aboveOffset, belowOffset, rightOffset, leftOffset]
        : [belowOffset, aboveOffset, rightOffset, leftOffset];

      let chosen = null;
      for (const cand of candidates) {
        const rect = {
          x: px + cand.startX,
          y: py + cand.badgeY,
          w: totalGroupW,
          h: badgeH,
        };
        const inBounds =
          rect.x >= 16 &&
          rect.x + rect.w <= WIDTH - 16 &&
          rect.y >= 18 &&
          rect.y + rect.h <= HEIGHT - 16;
        const hitsRect = obstacles.rects.some((r) => rectsOverlap(rect, r, 5));
        const hitsCircle = obstacles.circles.some(
          (c) =>
            !(Math.abs(c.cx - px) < 0.1 && Math.abs(c.cy - py) < 0.1) &&
            circleOverlapsRect(c.cx, c.cy, c.r, rect, 5)
        );
        if (inBounds && !hitsRect && !hitsCircle) {
          chosen = cand;
          obstacles.rects.push(rect);
          break;
        }
      }

      const badgeBlock = chosen
        ? `<g class="planet-counter-${idx}">
          <rect x="${chosen.startX.toFixed(1)}" y="${chosen.badgeY.toFixed(1)}" width="${badgeW.toFixed(1)}" height="${badgeH}" rx="5" fill="#070d1f" fill-opacity="0.92" stroke="${color}" stroke-width="1.1"/>
          <text x="${(chosen.startX + badgeW / 2).toFixed(1)}" y="${(chosen.badgeY + 11).toFixed(1)}" text-anchor="middle" font-family="${fontMono}" font-size="9.2" font-weight="700" fill="${tintWhiteHex(color, 0.45)}">${escapeXml(mark)}</text>
          <text x="${(chosen.startX + badgeW + 6).toFixed(1)}" y="${(chosen.badgeY + 11).toFixed(1)}" text-anchor="start" font-family="${fontSans}" font-size="11" font-weight="600" fill="#040814" stroke="#040814" stroke-width="3.2" stroke-linejoin="round" opacity="0.9">${escapeXml(labelText)}</text>
          <text x="${(chosen.startX + badgeW + 6).toFixed(1)}" y="${(chosen.badgeY + 11).toFixed(1)}" text-anchor="start" font-family="${fontSans}" font-size="11" font-weight="600" fill="#e2e8f0">${escapeXml(labelText)}</text>
        </g>`
        : '';

      return `<g class="planet-orbit-${idx}">
      <g transform="translate(${px.toFixed(1)}, ${py.toFixed(1)})">
        ${moonOrbitRings}
        <circle cx="0" cy="0" r="${(planetR * 1.65).toFixed(1)}" fill="${color}" opacity="0.22" filter="url(#blur-glow)"/>
        <circle cx="0" cy="0" r="${planetR}" fill="url(#planet-grad-${idx})" stroke="${tintWhiteHex(color, 0.35)}" stroke-opacity="0.45" stroke-width="0.7"/>
        <ellipse cx="${(-planetR * 0.32).toFixed(1)}" cy="${(-planetR * 0.34).toFixed(1)}" rx="${(planetR * 0.28).toFixed(1)}" ry="${(planetR * 0.16).toFixed(1)}" transform="rotate(-32 ${(-planetR * 0.32).toFixed(1)} ${(-planetR * 0.34).toFixed(1)})" fill="#ffffff" opacity="0.48"/>
        ${moonsSvg}
        ${badgeBlock}
      </g>
    </g>`;
    })
    .join('\n    ');

  return { planetGradients, orbitRings, planetCss, planetsSvg, obstacles };
}

export function renderSolarSvg(stats, avatarDataUri) {
  const user = stats?.user || {};
  const login = user.login || 'manishchandraraturi';
  const topLanguages = (stats?.languages || []).slice(0, 6);
  const repos = stats?.repositories || [];
  const recentRepos = [...repos].sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt));

  const { planetGradients, orbitRings, planetCss, planetsSvg, obstacles } = buildPlanetsAndMoons(
    topLanguages,
    repos
  );

  const fontSans =
    "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";
  const fontMono =
    "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

  const sunR = 30;
  const avatarElement = avatarDataUri
    ? `<image href="${avatarDataUri}" x="${CX - sunR}" y="${CY - sunR}" width="${sunR * 2}" height="${sunR * 2}" clip-path="url(#sun-clip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="${CX}" cy="${CY}" r="${sunR}" fill="#f59e0b"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Solar System for @${escapeXml(login)}">
  <style>
    @keyframes orbit-cw {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes orbit-ccw {
      from { transform: rotate(0deg); }
      to { transform: rotate(-360deg); }
    }
    @keyframes corona-pulse {
      0%, 100% { transform: scale(1); opacity: 0.85; }
      50% { transform: scale(1.1); opacity: 1; }
    }
    @keyframes twinkle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.25; }
    }
    @keyframes comet-mid {
      0% { transform: translateX(-420px); opacity: 0; }
      4% { opacity: 1; }
      14% { transform: translateX(0px); opacity: 0.95; }
      28% { transform: translateX(640px); opacity: 0; }
      100% { transform: translateX(640px); opacity: 0; }
    }
    @keyframes comet-edge {
      0% { transform: translateX(0px); opacity: 0; }
      4% { opacity: 1; }
      24% { opacity: 0.95; }
      30% { transform: translateX(1160px); opacity: 0; }
      100% { transform: translateX(1160px); opacity: 0; }
    }

    ${planetCss}
    .moon-orbit { transform-origin: 0px 0px; animation: orbit-cw 10s linear infinite; }
    .asteroid-belt { transform-origin: 0px 0px; animation: orbit-cw 220s linear infinite; }
    .sun-corona { transform-origin: ${CX}px ${CY}px; animation: corona-pulse 6.5s ease-in-out infinite; }

    /* 3 twinkling star layers */
    .star-far-1 { animation: twinkle 18s ease-in-out infinite 0s; }
    .star-far-2 { animation: twinkle 20s ease-in-out infinite -7s; }
    .star-far-3 { animation: twinkle 22s ease-in-out infinite -14s; }
    .star-mid-1 { animation: twinkle 11s ease-in-out infinite -2s; }
    .star-mid-2 { animation: twinkle 13s ease-in-out infinite -6s; }
    .star-mid-3 { animation: twinkle 12s ease-in-out infinite -10s; }
    .star-near-1 { animation: twinkle 6.5s ease-in-out infinite -1s; }
    .star-near-2 { animation: twinkle 7.8s ease-in-out infinite -3.5s; }
    .star-near-3 { animation: twinkle 8.5s ease-in-out infinite -5.8s; }

    /* Staggered comets on 30-45s loops */
    .comet-1 { animation: comet-mid 32s linear infinite -4.5s; }
    .comet-2 { animation: comet-mid 38s linear infinite -18s; }
    .comet-3 { animation: comet-edge 41s linear infinite -11s; }
    .comet-4 { animation: comet-edge 44s linear infinite -29s; }

    @media (prefers-reduced-motion: reduce) {
      [class*="planet-orbit-"], [class*="planet-counter-"],
      .moon-orbit, .asteroid-belt, .sun-corona,
      .star-far-1, .star-far-2, .star-far-3,
      .star-mid-1, .star-mid-2, .star-mid-3,
      .star-near-1, .star-near-2, .star-near-3,
      .comet-1, .comet-2, .comet-3, .comet-4 {
        animation: none !important;
      }
    }
  </style>
  <defs>
    <linearGradient id="space-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#030612"/>
      <stop offset="52%" stop-color="#070d22"/>
      <stop offset="100%" stop-color="#0b1330"/>
    </linearGradient>
    <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.72"/>
      <stop offset="38%" stop-color="#fbbf24" stop-opacity="0.34"/>
      <stop offset="72%" stop-color="#f59e0b" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="sun-corona-grad" cx="50%" cy="50%" r="50%">
      <stop offset="35%" stop-color="#fde68a" stop-opacity="0.45"/>
      <stop offset="70%" stop-color="#f59e0b" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ea580c" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="comet-tail-grad" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0"/>
      <stop offset="55%" stop-color="#7dd3fc" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="card-border" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.32"/>
      <stop offset="50%" stop-color="#1e293b" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.35"/>
    </linearGradient>
    ${planetGradients}
    <filter id="blur-glow" x="-120%" y="-120%" width="340%" height="340%">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
    <filter id="blur-corona" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
    <clipPath id="card-clip">
      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="20"/>
    </clipPath>
    <clipPath id="sun-clip">
      <circle cx="${CX}" cy="${CY}" r="${sunR}"/>
    </clipPath>
  </defs>

  <g clip-path="url(#card-clip)">
    <!-- Dark Space Card & 3 Twinkling Star Layers -->
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#space-bg)"/>
    <g id="star-layers">${buildStarLayers()}</g>

    <!-- Concentric Dashed Orbit Rings -->
    <g id="orbit-rings">${orbitRings}</g>

    <!-- Tilted Asteroid Belt -->
    ${buildAsteroidBelt()}

    <!-- Sun: Pulsing Corona + Warm Glow + Avatar with Gold Ring -->
    <g class="sun-corona">
      <circle cx="${CX}" cy="${CY}" r="66" fill="url(#sun-corona-grad)" filter="url(#blur-corona)"/>
    </g>
    <circle cx="${CX}" cy="${CY}" r="54" fill="url(#sun-glow)"/>
    <circle cx="${CX}" cy="${CY}" r="${sunR + 5}" fill="none" stroke="#fde68a" stroke-width="0.9" stroke-opacity="0.38" stroke-dasharray="3 3"/>
    ${avatarElement}
    <circle cx="${CX}" cy="${CY}" r="${sunR}" fill="none" stroke="#fbbf24" stroke-width="2.6"/>

    <!-- Planets & Moons -->
    <g id="planets">${planetsSvg}</g>

    <!-- Comets (Recent Pushes) -->
    <g id="comets">${buildComets(recentRepos, obstacles)}</g>
  </g>

  <!-- Rounded Card Border -->
  <rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="20" fill="none" stroke="url(#card-border)" stroke-width="1.5"/>

  <!-- Top-Left Label -->
  <text x="32" y="40" font-family="${fontMono}" font-size="11" font-weight="700" letter-spacing="2.2" fill="#fbbf24">SOLAR SYSTEM · @${escapeXml(login.toUpperCase())}</text>

  <!-- Bottom-Right Legend -->
  <text x="${WIDTH - 28}" y="${HEIGHT - 22}" text-anchor="end" font-family="${fontMono}" font-size="11" fill="#94a3b8">planets = languages · moons = repos · comets = recent pushes</text>
</svg>
`;
}

async function main() {
  const raw = await fs.readFile(INPUT_PATH, 'utf8');
  const stats = JSON.parse(raw);

  const avatarDataUri = await fetchAvatarDataUri(stats?.user?.avatarUrl);
  const svg = renderSolarSvg(stats, avatarDataUri);

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
