import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureText, textToPaths } from './textpath.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');

const HEADER_WIDTH = 900;
const HEADER_HEIGHT = 150;

const HEADERS = [
  {
    file: 'h-about.svg',
    num: '01',
    title: 'ABOUT ME',
    subtitle: 'Who I am in 10 seconds',
    tag: 'INTRO',
    theme: 'cream',
    accent: '#EC4899',
    accentSoft: '#FCE7F3',
    pillText: '#FFFFFF',
  },
  {
    file: 'h-city.svg',
    num: '02',
    title: 'CONTRIBUTION CITY',
    subtitle: 'My year of commits, one building per day',
    tag: 'ACTIVITY',
    theme: 'dark',
    bg1: '#05171B',
    bg2: '#092B32',
    accent: '#2DD4BF',
    accentSoft: '#0F3C44',
    pillText: '#05171B',
  },
  {
    file: 'h-galaxy.svg',
    num: '03',
    title: 'REPO GALAXY',
    subtitle: 'Every repository is a star',
    tag: 'PROJECTS',
    theme: 'dark',
    bg1: '#07091C',
    bg2: '#131130',
    accent: '#A855F7',
    accentSoft: '#251748',
    pillText: '#FFFFFF',
  },
  {
    file: 'h-stack.svg',
    num: '04',
    title: 'TECH STACK',
    subtitle: 'The tools I build with',
    tag: 'TOOLKIT',
    theme: 'cream',
    accent: '#F97316',
    accentSoft: '#FFEDD5',
    pillText: '#FFFFFF',
  },
  {
    file: 'h-solar.svg',
    num: '05',
    title: 'SOLAR SYSTEM',
    subtitle: 'Languages are planets, repos are moons',
    tag: 'LANGUAGES',
    theme: 'dark',
    bg1: '#050919',
    bg2: '#0B1738',
    accent: '#38BDF8',
    accentSoft: '#102B54',
    pillText: '#050919',
  },
  {
    file: 'h-connect.svg',
    num: '06',
    title: 'CONNECT',
    subtitle: "Let's build something together",
    tag: 'LINKS',
    theme: 'dark',
    bg1: '#051610',
    bg2: '#0A2C1F',
    accent: '#34D399',
    accentSoft: '#103B2A',
    pillText: '#051610',
  },
];

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildBrushUnderline(x, y, width, accent) {
  const endX = x + width;
  const midX = x + width * 0.5;
  const d = `M ${x} ${y} Q ${x + width * 0.25} ${y - 3.5} ${midX} ${y - 0.5} T ${endX} ${y - 1.5} L ${endX - 4} ${y + 5.5} Q ${midX} ${y + 7.5} ${x + 3} ${y + 6} Z`;
  return `<path class="brush-line" style="transform-origin: ${x}px ${y}px" d="${d}" fill="${accent}" opacity="0.9"/>`;
}

export function renderHeaderSvg(cfg) {
  const isCream = cfg.theme === 'cream';
  const titleFill = isCream ? '#111827' : '#F8FAFC';
  const subFill = isCream ? '#4B5563' : '#94A3B8';
  const numFill = isCream ? '#111827' : cfg.accent;
  const numOpacity = isCream ? '0.09' : '0.16';
  const borderColor = isCream ? '#111827' : cfg.accent;
  const borderOpacity = isCream ? '0.85' : '0.45';

  // Fit longest header cleanly at ~64px (slightly scaled down for CONTRIBUTION CITY so pill stays inside card)
  let titleSize = 62;
  const maxTitleWidth = 570;
  if (measureText(cfg.title, { weight: 700, fontSize: titleSize }) > maxTitleWidth) {
    titleSize = 54;
  }

  const titleX = 166;
  const titleY = 82;

  const numPaths = textToPaths(cfg.num, {
    x: 26,
    y: 112,
    fontSize: 102,
    weight: 700,
    fill: numFill,
  });

  const titlePaths = textToPaths(cfg.title, {
    x: titleX,
    y: titleY,
    fontSize: titleSize,
    weight: 700,
    fill: titleFill,
    letterSpacing: -0.5,
    letterClass: 'ltr',
    baseDelay: 0.1,
    stagger: 0.025,
  });

  const subPaths = textToPaths(cfg.subtitle, {
    x: titleX,
    y: 122,
    fontSize: 17,
    weight: 500,
    fill: subFill,
    letterClass: 'sub-ltr',
    baseDelay: 0.35,
    stagger: 0.01,
  });

  // Colored pill tag positioned neatly beside title (or clamped inside right padding)
  const tagTextW = measureText(cfg.tag, { weight: 700, fontSize: 12 });
  const pillW = Math.round(tagTextW + 24);
  const pillH = 26;
  const pillX = Math.min(HEADER_WIDTH - pillW - 26, Math.round(titleX + titlePaths.width + 18));
  const pillY = 46;

  const pillTextPaths = textToPaths(cfg.tag, {
    x: pillX + pillW / 2,
    y: pillY + 17.5,
    fontSize: 12,
    weight: 700,
    fill: cfg.pillText,
    align: 'center',
  });

  const underlineW = Math.min(Math.round(titlePaths.width * 0.92), 540);
  const underlineSvg = buildBrushUnderline(titleX, 92, underlineW, cfg.accent);

  const bgMarkup = isCream
    ? `<rect x="0" y="0" width="${HEADER_WIDTH}" height="${HEADER_HEIGHT}" fill="#FAF6EE"/>
       <circle cx="815" cy="75" r="185" fill="url(#glow-right)"/>
       <circle cx="95" cy="75" r="140" fill="url(#glow-left)"/>`
    : `<rect x="0" y="0" width="${HEADER_WIDTH}" height="${HEADER_HEIGHT}" fill="url(#card-bg)"/>
       <ellipse cx="775" cy="75" rx="225" ry="125" fill="url(#glow-right)"/>
       <circle cx="110" cy="75" r="145" fill="url(#glow-left)"/>`;

  const gradDef = isCream
    ? `<radialGradient id="glow-right" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${cfg.accent}" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="${cfg.accent}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="glow-left" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${cfg.accentSoft}" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="${cfg.accentSoft}" stop-opacity="0"/>
      </radialGradient>`
    : `<linearGradient id="card-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${cfg.bg1}"/>
        <stop offset="100%" stop-color="${cfg.bg2}"/>
      </linearGradient>
      <radialGradient id="glow-right" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${cfg.accent}" stop-opacity="0.22"/>
        <stop offset="55%" stop-color="${cfg.accent}" stop-opacity="0.06"/>
        <stop offset="100%" stop-color="${cfg.accent}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="glow-left" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${cfg.accent}" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="${cfg.accent}" stop-opacity="0"/>
      </radialGradient>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${HEADER_WIDTH}" height="${HEADER_HEIGHT}" viewBox="0 0 ${HEADER_WIDTH} ${HEADER_HEIGHT}" role="img" aria-label="${escapeXml(cfg.num)} ${escapeXml(cfg.title)} — ${escapeXml(cfg.subtitle)}">
  <style>
    @keyframes letter-rise {
      from { transform: translateY(15px); opacity: 0; }
      to { transform: translateY(0px); opacity: 1; }
    }
    @keyframes brush-wipe {
      from { transform: scaleX(0); opacity: 0.2; }
      to { transform: scaleX(1); opacity: 0.9; }
    }
    @keyframes fade-in {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: ${numOpacity}; transform: translateX(0px); }
    }
    @keyframes pill-in {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    .ltr { animation: letter-rise 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
    .sub-ltr { animation: letter-rise 0.38s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
    .brush-line { animation: brush-wipe 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.22s both; }
    .num-fade { animation: fade-in 0.7s ease-out 0.05s both; }
    .pill-tag { transform-origin: ${pillX + pillW / 2}px ${pillY + pillH / 2}px; animation: pill-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s both; }
    @media (prefers-reduced-motion: reduce) {
      .ltr, .sub-ltr, .brush-line, .num-fade, .pill-tag {
        animation: none !important;
      }
    }
  </style>
  <defs>
    ${gradDef}
    <clipPath id="card-clip">
      <rect x="0" y="0" width="${HEADER_WIDTH}" height="${HEADER_HEIGHT}" rx="18"/>
    </clipPath>
  </defs>

  <g clip-path="url(#card-clip)">
    ${bgMarkup}

    <!-- Huge Ghost Number -->
    <g class="num-fade" opacity="${numOpacity}">
      ${numPaths.svg}
    </g>

    <!-- Brush Underline -->
    ${underlineSvg}

    <!-- Big Round Outlined Title -->
    <g>${titlePaths.svg}</g>

    <!-- Small Colored Pill Tag -->
    <g class="pill-tag">
      <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="13" fill="${cfg.accent}"/>
      ${pillTextPaths.svg}
    </g>

    <!-- Plain-English Subtitle -->
    <g>${subPaths.svg}</g>
  </g>

  <rect x="1" y="1" width="${HEADER_WIDTH - 2}" height="${HEADER_HEIGHT - 2}" rx="18" fill="none" stroke="${borderColor}" stroke-opacity="${borderOpacity}" stroke-width="2"/>
</svg>
`;
}

export function renderDividerSvg() {
  const W = 900;
  const H = 40;
  // Gentle multi-cycle sine wave across x=40..860
  const startX = 40;
  const endX = 860;
  const span = endX - startX;
  const waves = 6;
  const amp = 7;
  const pts = [];
  const steps = 120;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = startX + t * span;
    const y = H / 2 + Math.sin(t * Math.PI * 2 * waves) * amp;
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const waveD = pts.join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="presentation">
  <style>
    @keyframes travel-a {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: -280; }
    }
    @keyframes travel-b {
      from { stroke-dashoffset: -140; }
      to { stroke-dashoffset: 140; }
    }
    .dots-halo-a { animation: travel-a 5.5s linear infinite; }
    .dots-core-a { animation: travel-a 5.5s linear infinite; }
    .dots-halo-b { animation: travel-b 7.5s linear infinite; }
    .dots-core-b { animation: travel-b 7.5s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .dots-halo-a, .dots-core-a, .dots-halo-b, .dots-core-b {
        animation: none !important;
      }
    }
  </style>
  <defs>
    <linearGradient id="wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0"/>
      <stop offset="15%" stop-color="#38BDF8" stop-opacity="0.45"/>
      <stop offset="50%" stop-color="#A855F7" stop-opacity="0.55"/>
      <stop offset="85%" stop-color="#2DD4BF" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#2DD4BF" stop-opacity="0"/>
    </linearGradient>
    <filter id="dot-glow" x="-20%" y="-100%" width="140%" height="300%">
      <feGaussianBlur stdDeviation="2.5"/>
    </filter>
  </defs>

  <!-- Thin Wavy Line -->
  <path d="${waveD}" fill="none" stroke="url(#wave-grad)" stroke-width="1.6" stroke-linecap="round"/>

  <!-- Small Glowing Dots Travelling Along the Wave -->
  <path class="dots-halo-a" d="${waveD}" fill="none" stroke="#38BDF8" stroke-width="8" stroke-linecap="round" stroke-dasharray="0.5 279.5" opacity="0.42" filter="url(#dot-glow)"/>
  <path class="dots-core-a" d="${waveD}" fill="none" stroke="#BAE6FD" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="0.5 279.5" opacity="0.95"/>

  <path class="dots-halo-b" d="${waveD}" fill="none" stroke="#EC4899" stroke-width="7.5" stroke-linecap="round" stroke-dasharray="0.5 279.5" opacity="0.38" filter="url(#dot-glow)"/>
  <path class="dots-core-b" d="${waveD}" fill="none" stroke="#FBCFE8" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="0.5 279.5" opacity="0.92"/>
</svg>
`;
}

async function main() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });

  for (const cfg of HEADERS) {
    const svg = renderHeaderSvg(cfg);
    const outPath = path.join(ASSETS_DIR, cfg.file);
    await fs.writeFile(outPath, svg, 'utf8');
    console.log(`Generated ${outPath} (${(Buffer.byteLength(svg, 'utf8') / 1024).toFixed(1)} KB)`);
  }

  const dividerSvg = renderDividerSvg();
  const dividerPath = path.join(ASSETS_DIR, 'divider.svg');
  await fs.writeFile(dividerPath, dividerSvg, 'utf8');
  console.log(
    `Generated ${dividerPath} (${(Buffer.byteLength(dividerSvg, 'utf8') / 1024).toFixed(1)} KB)`
  );
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
