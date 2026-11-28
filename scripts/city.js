import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT_DIR, 'data', 'stats.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'assets', 'city.svg');

const WIDTH = 900;
const HEIGHT = 480;
const STEP_X = 9.4;
const STEP_Y = 4.7;
const BAR_SCALE = 0.78;
const BASE_TILE_HEIGHT = 3.5;
const MAX_BAR_HEIGHT = 96;

const BASE_COLOR = {
  top: '#133840',
  left: '#0d2930',
  right: '#091e24',
  stroke: '#194954',
};

const MINT_COLOR = {
  top: '#6ee7b7',
  left: '#34d399',
  right: '#10b981',
  stroke: '#a7f3d0',
};

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

function getBarHeight(count, maxCount) {
  if (count <= 0 || maxCount <= 0) return BASE_TILE_HEIGHT;
  const normalized = Math.pow(count / maxCount, 0.72);
  return Number((BASE_TILE_HEIGHT + 5 + normalized * MAX_BAR_HEIGHT).toFixed(2));
}

function isoBarPath(cx, cy, bx, by, h, colors) {
  const f = (n) => n.toFixed(2);
  const topY = cy - h;

  const topFace = `M ${f(cx)} ${f(topY - by)} L ${f(cx + bx)} ${f(topY)} L ${f(cx)} ${f(topY + by)} L ${f(cx - bx)} ${f(topY)} Z`;
  const leftFace = `M ${f(cx - bx)} ${f(topY)} L ${f(cx)} ${f(topY + by)} L ${f(cx)} ${f(cy + by)} L ${f(cx - bx)} ${f(cy)} Z`;
  const rightFace = `M ${f(cx)} ${f(topY + by)} L ${f(cx + bx)} ${f(topY)} L ${f(cx + bx)} ${f(cy)} L ${f(cx)} ${f(cy + by)} Z`;

  return [
    `<path d="${leftFace}" fill="${colors.left}"/>`,
    `<path d="${rightFace}" fill="${colors.right}"/>`,
    `<path d="${topFace}" fill="${colors.top}" stroke="${colors.stroke}" stroke-width="0.45" stroke-linejoin="round"/>`,
  ].join('');
}

function buildCityBars(weeks) {
  const cells = [];
  let maxCount = 0;

  weeks.forEach((week, wIdx) => {
    const days = week.contributionDays || [];
    days.forEach((day, dIdx) => {
      const count = day.contributionCount || 0;
      const weekday = typeof day.weekday === 'number' ? day.weekday : dIdx;
      if (count > maxCount) maxCount = count;
      cells.push({
        w: wIdx,
        d: weekday,
        count,
        date: day.date,
      });
    });
  });

  // Painter's algorithm: back-to-front by (w + d), then w
  cells.sort((a, b) => a.w + a.d - (b.w + b.d) || a.w - b.w);

  const weekCount = Math.max(weeks.length, 1);
  const minGridX = -6 * STEP_X;
  const maxGridX = (weekCount - 1) * STEP_X;
  const originX = (WIDTH - (minGridX + maxGridX)) / 2 + 42;
  const originY = 148;

  const bx = STEP_X * BAR_SCALE;
  const by = STEP_Y * BAR_SCALE;

  return cells
    .map((cell) => {
      const cx = originX + (cell.w - cell.d) * STEP_X;
      const cy = originY + (cell.w + cell.d) * STEP_Y;
      const h = getBarHeight(cell.count, maxCount);
      const colors = cell.count > 0 ? MINT_COLOR : BASE_COLOR;
      const paths = isoBarPath(cx, cy, bx, by, h, colors);
      if (cell.count > 0) {
        const delay = (cell.w * 0.02).toFixed(2);
        return `<g class="bar" style="animation-delay: ${delay}s">${paths}</g>`;
      }
      return paths;
    })
    .join('\n    ');
}

export function renderCitySvg(stats) {
  const login = stats?.user?.login || 'manishchandraraturi';
  const contributions = stats?.contributions || {};
  const weeks = contributions.weeks || [];
  const totalContributions = contributions.totalContributions ?? 0;
  const activeDays = contributions.activeDays ?? 0;
  const busiestCount = contributions.busiestDay?.count ?? 0;

  const barsSvg = buildCityBars(weeks);

  const fontSans =
    "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";
  const fontMono =
    "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Contribution City for @${escapeXml(login)}">
  <style>
    .bar {
      transform-box: fill-box;
      transform-origin: bottom;
      animation: rise 0.9s cubic-bezier(.2,.8,.2,1) both;
    }
    @keyframes rise {
      from {
        transform: scaleY(0);
        opacity: 0;
      }
      to {
        transform: scaleY(1);
        opacity: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .bar {
        animation: none;
      }
    }
  </style>
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#05171b"/>
      <stop offset="52%" stop-color="#08242a"/>
      <stop offset="100%" stop-color="#0c343b"/>
    </linearGradient>
    <radialGradient id="city-glow" cx="56%" cy="56%" r="48%">
      <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.16"/>
      <stop offset="60%" stop-color="#0d9488" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#05171b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.45"/>
      <stop offset="50%" stop-color="#155e63" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#5eead4" stop-opacity="0.35"/>
    </linearGradient>
  </defs>

  <!-- Card Background & Rounded Border -->
  <rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="20" fill="url(#bg-grad)" stroke="url(#border-grad)" stroke-width="1.5"/>
  <rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="20" fill="url(#city-glow)"/>

  <!-- Header: Label, Total Contributions, and Plain Stats -->
  <g font-family="${fontSans}">
    <text x="36" y="44" font-size="11" font-weight="700" letter-spacing="2.6" fill="#5eead4">CONTRIBUTION CITY</text>
    <text x="36" y="92" font-size="44" font-weight="800" fill="#ecfdf5" letter-spacing="-0.5">${escapeXml(formatNumber(totalContributions))}</text>
    <text x="36" y="114" font-size="13" font-weight="500" fill="#7fb5bc">contributions in the last year</text>
    <text x="36" y="140" font-size="13" font-weight="600" fill="#a7f3d0">${escapeXml(formatNumber(activeDays))} active days</text>
    <text x="36" y="160" font-size="13" font-weight="600" fill="#a7f3d0">Busiest day: ${escapeXml(formatNumber(busiestCount))}</text>
  </g>

  <!-- Isometric 3D City -->
  <g id="contribution-city">
    ${barsSvg}
  </g>

  <!-- Footer: Handle (bottom-left) -->
  <text x="36" y="${HEIGHT - 26}" font-family="${fontMono}" font-size="13" font-weight="600" fill="#5eead4">@${escapeXml(login)}</text>
</svg>
`;
}

async function main() {
  const raw = await fs.readFile(INPUT_PATH, 'utf8');
  const stats = JSON.parse(raw);
  const svg = renderCitySvg(stats);

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, svg, 'utf8');
  console.log(`Generated ${OUTPUT_PATH}`);
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
