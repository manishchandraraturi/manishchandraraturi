import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { textToPaths } from './textpath.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const STATS_PATH = path.join(ROOT_DIR, 'data', 'stats.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'assets', 'footer.svg');

const WIDTH = 900;
const HEIGHT = 120;
const FONT_SANS = "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatBuildDate(isoStr) {
  const dt = isoStr ? new Date(isoStr) : new Date();
  if (Number.isNaN(dt.getTime())) return new Date().toISOString().slice(0, 10);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function buildWavePath(period, amp, baseY, heightBottom) {
  const pts = [];
  const totalW = period * 2;
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2;
    const x = (i / steps) * totalW;
    const y = baseY + Math.sin(t * Math.PI * 2) * amp;
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  pts.push(`L ${totalW} ${heightBottom} L 0 ${heightBottom} Z`);
  return pts.join(' ');
}

export function renderFooterSvg(stats) {
  const buildDate = formatBuildDate(stats?.fetchedAt || new Date().toISOString());

  const titlePaths = textToPaths('Thanks for stopping by', {
    x: WIDTH / 2,
    y: 52,
    fontSize: 28,
    weight: 700,
    fill: '#F8FAFC',
    align: 'center',
    precision: 1,
  });

  const wave1D = buildWavePath(900, 9, 86, HEIGHT + 10);
  const wave2D = buildWavePath(900, 7, 94, HEIGHT + 10);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Thanks for stopping by — Auto-updated daily">
  <style>
    @keyframes wave-fwd {
      from { transform: translateX(0px); }
      to { transform: translateX(-900px); }
    }
    @keyframes wave-rev {
      from { transform: translateX(-900px); }
      to { transform: translateX(0px); }
    }
    .wave-1 { animation: wave-fwd 12s linear infinite; }
    .wave-2 { animation: wave-rev 16s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .wave-1, .wave-2 { animation: none !important; }
    }
  </style>
  <defs>
    <linearGradient id="footer-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#071526"/>
      <stop offset="50%" stop-color="#0C223B"/>
      <stop offset="100%" stop-color="#171740"/>
    </linearGradient>
    <linearGradient id="footer-border" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#14B8A6" stop-opacity="0.55"/>
      <stop offset="50%" stop-color="#38BDF8" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#A855F7" stop-opacity="0.55"/>
    </linearGradient>
    <clipPath id="footer-clip">
      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="18"/>
    </clipPath>
  </defs>

  <g clip-path="url(#footer-clip)">
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#footer-bg)"/>

    <!-- Layered Animated Waves -->
    <g class="wave-1" opacity="0.24">
      <path d="${wave1D}" fill="#14B8A6"/>
    </g>
    <g class="wave-2" opacity="0.22">
      <path d="${wave2D}" fill="#38BDF8"/>
    </g>

    <!-- Text -->
    <g>${titlePaths.svg}</g>
    <text x="${WIDTH / 2}" y="78" text-anchor="middle" font-family="${FONT_SANS}" font-size="12.5" font-weight="500" fill="#CBD5E1">Auto-updated daily · last build ${escapeXml(buildDate)}</text>
  </g>

  <rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="18" fill="none" stroke="url(#footer-border)" stroke-width="1.5"/>
</svg>
`;
}

async function main() {
  let stats = {};
  try {
    const raw = await fs.readFile(STATS_PATH, 'utf8');
    stats = JSON.parse(raw);
  } catch {
    stats = {};
  }

  const svg = renderFooterSvg(stats);
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
