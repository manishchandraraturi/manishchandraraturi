import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLangColor } from './colors.js';
import { measureText, textToPaths } from './textpath.js';

// Editable Tech Stack tiles & concept pills
const TECH = [
  { name: 'TypeScript', mark: 'TS', color: getLangColor('TypeScript') },
  { name: 'Python', mark: 'PY', color: getLangColor('Python') },
  { name: 'Kotlin', mark: 'KT', color: getLangColor('Kotlin') },
  { name: 'JavaScript', mark: 'JS', color: getLangColor('JavaScript') },
  { name: 'HTML', mark: 'HTML', color: getLangColor('HTML') },
  { name: 'Jupyter', mark: 'IPYNB', color: getLangColor('Jupyter Notebook') },
];

const CONCEPTS = [
  { label: 'Generative AI', color: '#F472B6' },
  { label: 'RAG', color: '#22D3EE' },
  { label: 'Machine Learning', color: '#A78BFA' },
  { label: 'Hackathons', color: '#FBBF24' },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT_DIR, 'data', 'stats.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'assets', 'stack.svg');

const WIDTH = 900;
const HEIGHT = 300;
const FONT_SANS = "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";

const MARK_LOOKUP = {
  TypeScript: 'TS',
  Python: 'PY',
  Kotlin: 'KT',
  JavaScript: 'JS',
  HTML: 'HTML',
  CSS: 'CSS',
  'Jupyter Notebook': 'IPYNB',
  Jupyter: 'IPYNB',
};

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildTilesFromStats(stats) {
  const langs = stats?.languages || [];
  if (!langs.length) return TECH;

  const targetNames = new Set(TECH.map((t) => (t.name === 'Jupyter' ? 'Jupyter Notebook' : t.name)));
  const ordered = [];
  for (const lang of langs) {
    const displayName = lang.name === 'Jupyter Notebook' ? 'Jupyter' : lang.name;
    if (targetNames.has(lang.name) || ordered.length < 6) {
      ordered.push({
        name: displayName,
        mark:
          MARK_LOOKUP[lang.name] ||
          lang.name
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(0, 4)
            .toUpperCase(),
        color: getLangColor(lang.name, lang.color),
      });
    }
    if (ordered.length >= 6) break;
  }
  return ordered.length ? ordered : TECH;
}

function buildTileDef(tile, id) {
  const w = 142;
  const h = 72;
  const markSize = tile.mark.length >= 5 ? 19 : tile.mark.length >= 4 ? 21 : 25;
  const markPaths = textToPaths(tile.mark, {
    x: w / 2,
    y: 36,
    fontSize: markSize,
    weight: 700,
    fill: tile.color,
    align: 'center',
    precision: 1,
  });

  return `<g id="${id}">
      <rect x="3" y="5" width="${w}" height="${h}" rx="15" fill="#090318" opacity="0.6"/>
      <rect x="0" y="0" width="${w}" height="${h}" rx="15" fill="#231252" stroke="${tile.color}" stroke-width="2"/>
      <rect x="4" y="3" width="${w - 8}" height="24" rx="11" fill="#FFFFFF" opacity="0.09"/>
      ${markPaths.svg}
      <text x="${w / 2}" y="58" text-anchor="middle" font-family="${FONT_SANS}" font-size="12" font-weight="600" fill="#E2E8F0">${escapeXml(tile.name)}</text>
    </g>`;
}

export function renderStackSvg(stats) {
  const tiles = buildTilesFromStats(stats);
  const tileW = 142;
  const gap = 18;
  const step = tileW + gap;
  const trackW = tiles.length * step;

  const tileDefs = tiles.map((t, i) => buildTileDef(t, `tile-${i}`)).join('\n    ');

  // Row 1 order: 0..N-1 ; Row 2 shifted order for visual variety
  const row1Set = tiles.map((_, i) => `<use href="#tile-${i}" x="${i * step}" y="0"/>`).join('');
  const row2Order = tiles.map((_, i) => (i + 3) % tiles.length);
  const row2Set = row2Order.map((idx, pos) => `<use href="#tile-${idx}" x="${pos * step}" y="0"/>`).join('');

  // Centered concept pills in Row 3
  const pillGap = 14;
  const pillMeta = CONCEPTS.map((c) => {
    const tw = Math.round(measureText(c.label, { weight: 600, fontSize: 12.5 }));
    return { ...c, w: tw + 30 };
  });
  const totalPillsW = pillMeta.reduce((s, p) => s + p.w, 0) + (pillMeta.length - 1) * pillGap;
  let px = Math.round((WIDTH - totalPillsW) / 2);
  const pillsSvg = pillMeta
    .map((p) => {
      const labelPaths = textToPaths(p.label, {
        x: px + p.w / 2,
        y: 260.5,
        fontSize: 12.5,
        weight: 600,
        fill: '#F8FAFC',
        align: 'center',
        precision: 1,
      });
      const block = `<g>
        <rect x="${px}" y="241" width="${p.w}" height="30" rx="15" fill="#180B3B" stroke="${p.color}" stroke-width="1.6"/>
        ${labelPaths.svg}
      </g>`;
      px += p.w + pillGap;
      return block;
    })
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Tech Stack and Concepts">
  <style>
    @keyframes marquee-left {
      from { transform: translateX(0%); }
      to { transform: translateX(-50%); }
    }
    @keyframes marquee-right {
      from { transform: translateX(-50%); }
      to { transform: translateX(0%); }
    }
    .marquee-row-1 { animation: marquee-left 40s linear infinite; }
    .marquee-row-2 { animation: marquee-right 40s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .marquee-row-1, .marquee-row-2 {
        animation: none !important;
      }
    }
  </style>
  <defs>
    <linearGradient id="arcade-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E0B4B"/>
      <stop offset="50%" stop-color="#311068"/>
      <stop offset="100%" stop-color="#1E1B5E"/>
    </linearGradient>
    <radialGradient id="neon-glow" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#A855F7" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#1E0B4B" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="neon-border" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22D3EE" stop-opacity="0.7"/>
      <stop offset="50%" stop-color="#C084FC" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#F472B6" stop-opacity="0.7"/>
    </linearGradient>
    <pattern id="arcade-grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#A855F7" stroke-opacity="0.16" stroke-width="1"/>
    </pattern>
    <clipPath id="card-clip">
      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="20"/>
    </clipPath>
    <clipPath id="marquee-clip">
      <rect x="20" y="20" width="${WIDTH - 40}" height="202" rx="12"/>
    </clipPath>
    ${tileDefs}
  </defs>

  <g clip-path="url(#card-clip)">
    <!-- Bright Dark-Purple to Indigo Arcade Neon Background -->
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#arcade-bg)"/>
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#arcade-grid)"/>
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#neon-glow)"/>

    <!-- Opposite-Direction Seamless 40s Marquee Rows -->
    <g clip-path="url(#marquee-clip)">
      <g transform="translate(20, 30)">
        <g class="marquee-row-1">
          <rect x="0" y="0" width="${trackW * 2}" height="78" fill="none"/>
          <g>${row1Set}</g>
          <g transform="translate(${trackW}, 0)">${row1Set}</g>
        </g>
      </g>
      <g transform="translate(20, 126)">
        <g class="marquee-row-2">
          <rect x="0" y="0" width="${trackW * 2}" height="78" fill="none"/>
          <g>${row2Set}</g>
          <g transform="translate(${trackW}, 0)">${row2Set}</g>
        </g>
      </g>
    </g>

    <!-- Third Row: Concept Pills -->
    <g id="concept-pills">
      ${pillsSvg}
    </g>
  </g>

  <rect x="1.25" y="1.25" width="${WIDTH - 2.5}" height="${HEIGHT - 2.5}" rx="20" fill="none" stroke="url(#neon-border)" stroke-width="2"/>
</svg>
`;
}

async function main() {
  let stats = {};
  try {
    const raw = await fs.readFile(INPUT_PATH, 'utf8');
    stats = JSON.parse(raw);
  } catch {
    stats = {};
  }

  const svg = renderStackSvg(stats);
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
