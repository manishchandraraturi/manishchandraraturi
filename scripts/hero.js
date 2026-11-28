import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { measureText, textToPaths } from './textpath.js';

// Editable hero banner text configuration
const HERO = {
  topLine1: 'AI / ML Engineer in the making',
  topLine2: 'GenAI · RAG · Hackathons',
  badge: 'Student at CMRIT, Bangalore',
  nameLines: ['Manish', 'Chandra', 'Raturi'],
  tagline: 'I build things that think.',
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CUTOUT_PATH = path.join(ROOT_DIR, 'assets', 'photo-cutout.png');
const PLAIN_PATH = path.join(ROOT_DIR, 'assets', 'photo.png');
const OUTPUT_PATH = path.join(ROOT_DIR, 'assets', 'hero.svg');

const WIDTH = 900;
const HEIGHT = 420;

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadPhoto() {
  const hasCutout = await fileExists(CUTOUT_PATH);
  const sourcePath = hasCutout ? CUTOUT_PATH : PLAIN_PATH;

  if (!(await fileExists(sourcePath))) {
    throw new Error(`Missing photo asset: checked ${CUTOUT_PATH} and ${PLAIN_PATH}`);
  }

  // 300px wide palette PNG keeps hero.svg well under 150 KB while exceeding 293px SVG display width
  const buffer = await sharp(sourcePath)
    .resize({ width: 300, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 86, effort: 10 })
    .toBuffer();

  const meta = await sharp(buffer).metadata();
  return {
    isCutout: hasCutout,
    width: meta.width || 440,
    height: meta.height || 552,
    dataUri: `data:image/png;base64,${buffer.toString('base64')}`,
  };
}

function buildSparkle(cx, cy, size, fill, cls) {
  const rOut = size;
  const rIn = size * 0.28;
  const d = [
    `M ${cx} ${cy - rOut}`,
    `Q ${cx + rIn} ${cy - rIn} ${cx + rOut} ${cy}`,
    `Q ${cx + rIn} ${cy + rIn} ${cx} ${cy + rOut}`,
    `Q ${cx - rIn} ${cy + rIn} ${cx - rOut} ${cy}`,
    `Q ${cx - rIn} ${cy - rIn} ${cx} ${cy - rOut} Z`,
  ].join(' ');
  return `<g class="${cls}" style="transform-origin: ${cx}px ${cy}px"><path d="${d}" fill="${fill}" stroke="#111111" stroke-width="1.2" stroke-linejoin="round"/></g>`;
}

export function renderHeroSvg(photo) {
  const targetH = 368;
  const aspect = photo.width / photo.height;
  const drawW = Math.round(targetH * aspect);
  const drawH = targetH;
  const photoX = Math.round((WIDTH - drawW) / 2 - 4);
  const photoY = HEIGHT - drawH + 8;
  const photoCx = Math.round(photoX + drawW / 2);
  const photoCy = Math.round(photoY + drawH / 2);

  // Hand-painted yellow (#FFD60A) brush strokes with organic bristle edges
  const brushLeftPath =
    'M 28 198 C 82 192, 165 197, 256 190 C 338 184, 416 190, 488 184 Q 502 186 492 193 L 474 198 Q 504 203 498 209 L 479 216 Q 508 221 495 229 L 476 236 Q 498 242 486 250 C 424 257, 344 252, 260 259 C 174 266, 92 259, 32 266 Q 16 263 28 254 L 44 247 Q 14 241 24 233 L 42 225 Q 15 218 26 210 L 40 205 Z';

  const brushRightPath =
    'M 388 286 C 464 279, 558 285, 654 277 C 736 271, 808 276, 868 270 Q 884 272 872 280 L 854 287 Q 886 293 878 301 L 858 309 Q 888 317 874 326 L 856 334 Q 880 342 864 350 C 792 358, 704 351, 610 359 C 524 366, 444 359, 386 365 Q 370 361 384 352 L 402 344 Q 372 336 384 328 L 400 319 Q 374 311 386 303 L 400 296 Z';

  let photoMarkup;
  if (photo.isCutout) {
    photoMarkup = `
      <g filter="url(#photo-shadow)">
        <image href="${photo.dataUri}" x="${photoX}" y="${photoY}" width="${drawW}" height="${drawH}" preserveAspectRatio="xMidYMid meet"/>
      </g>`;
  } else {
    const archW = 248;
    const archH = 326;
    const archX = Math.round((WIDTH - archW) / 2 - 4);
    const archY = 50;
    const r = archW / 2;
    const archD = `M ${archX} ${archY + archH} L ${archX} ${archY + r} A ${r} ${r} 0 0 1 ${archX + archW} ${archY + r} L ${archX + archW} ${archY + archH} Z`;
    photoMarkup = `
      <path d="${archD}" transform="translate(8, 8)" fill="#111111"/>
      <image href="${photo.dataUri}" x="${archX}" y="${archY}" width="${archW}" height="${archH}" clip-path="url(#arch-clip)" preserveAspectRatio="xMidYMid slice"/>
      <path d="${archD}" fill="none" stroke="#111111" stroke-width="5"/>`;
  }

  const archClipDef = photo.isCutout
    ? ''
    : (() => {
        const archW = 248;
        const archH = 326;
        const archX = Math.round((WIDTH - archW) / 2 - 4);
        const archY = 50;
        const r = archW / 2;
        const archD = `M ${archX} ${archY + archH} L ${archX} ${archY + r} A ${r} ${r} 0 0 1 ${archX + archW} ${archY + r} L ${archX + archW} ${archY + archH} Z`;
        return `<clipPath id="arch-clip"><path d="${archD}"/></clipPath>`;
      })();

  // Convert all typography into Fredoka <path> outlines (one path per letter for staggered intro)
  const top1 = textToPaths(HERO.topLine1, {
    x: 36,
    y: 62,
    fontSize: 17.5,
    weight: 700,
    fill: '#111111',
    letterClass: 'ltr',
    baseDelay: 0.42,
    stagger: 0.015,
    precision: 1,
  });

  const top2 = textToPaths(HERO.topLine2, {
    x: 36,
    y: 88,
    fontSize: 15.5,
    weight: 600,
    fill: '#27272A',
    letterClass: 'ltr',
    baseDelay: 0.65,
    stagger: 0.015,
    precision: 1,
  });

  const name1 = textToPaths(HERO.nameLines[0] || '', {
    x: 864,
    y: 134,
    fontSize: 58,
    weight: 700,
    fill: '#111111',
    align: 'right',
    letterSpacing: -0.8,
    letterClass: 'ltr',
    baseDelay: 0.72,
    stagger: 0.032,
    precision: 1,
  });

  const name2 = textToPaths(HERO.nameLines[1] || '', {
    x: 864,
    y: 194,
    fontSize: 58,
    weight: 700,
    fill: '#111111',
    align: 'right',
    letterSpacing: -0.8,
    letterClass: 'ltr',
    baseDelay: 0.92,
    stagger: 0.032,
    precision: 1,
  });

  const name3 = textToPaths(HERO.nameLines[2] || '', {
    x: 864,
    y: 254,
    fontSize: 58,
    weight: 700,
    fill: '#111111',
    align: 'right',
    letterSpacing: -0.8,
    letterClass: 'ltr',
    baseDelay: 1.12,
    stagger: 0.032,
    precision: 1,
  });

  const tagline = textToPaths(HERO.tagline, {
    x: 864,
    y: 325,
    fontSize: 16.5,
    weight: 700,
    fill: '#111111',
    align: 'right',
    letterClass: 'ltr',
    baseDelay: 1.32,
    stagger: 0.016,
    precision: 1,
  });

  const badgeTextWidth = measureText(HERO.badge, { weight: 600, fontSize: 13 });
  const badgeW = Math.round(badgeTextWidth + 40);
  const badgeText = textToPaths(HERO.badge, {
    x: 66,
    y: 370,
    fontSize: 13,
    weight: 600,
    fill: '#F7F4EC',
    precision: 1,
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(HERO.nameLines.join(' '))} — ${escapeXml(HERO.topLine1)}">
  <style>
    @keyframes brush-wipe {
      from { transform: scaleX(0); opacity: 0.2; }
      to { transform: scaleX(1); opacity: 1; }
    }
    @keyframes letter-rise {
      from { transform: translateY(16px); opacity: 0; }
      to { transform: translateY(0px); opacity: 1; }
    }
    @keyframes badge-pop {
      from { transform: translateY(14px); opacity: 0; }
      to { transform: translateY(0px); opacity: 1; }
    }
    @keyframes photo-pop {
      0% { transform: scale(0.85); opacity: 0; }
      70% { transform: scale(1.03); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes photo-float {
      0%, 100% { transform: translateY(0px) rotate(-2deg); }
      50% { transform: translateY(-7px) rotate(2deg); }
    }
    @keyframes shadow-pulse {
      0%, 100% { transform: scaleX(1.03) scaleY(1); opacity: 0.22; }
      50% { transform: scaleX(0.92) scaleY(0.88); opacity: 0.12; }
    }
    @keyframes sparkle-twinkle {
      0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
      50% { transform: scale(0.55) rotate(22deg); opacity: 0.45; }
    }

    .brush-1 { transform-origin: 20px 230px; animation: brush-wipe 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both; }
    .brush-2 { transform-origin: 382px 320px; animation: brush-wipe 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both; }

    .photo-pop { transform-origin: ${photoCx}px ${photoCy}px; animation: photo-pop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) 0.30s both; }
    .photo-float { transform-origin: ${photoCx}px ${photoCy + 60}px; animation: photo-float 6s ease-in-out 1.0s infinite; }
    .ground-shadow { transform-origin: ${photoCx}px ${HEIGHT - 16}px; animation: shadow-pulse 6s ease-in-out 1.0s infinite; }

    .ltr { animation: letter-rise 0.46s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
    .badge { animation: badge-pop 0.48s cubic-bezier(0.2, 0.8, 0.2, 1) 1.45s both; }

    .sp1 { animation: sparkle-twinkle 2.8s ease-in-out 0.9s infinite; }
    .sp2 { animation: sparkle-twinkle 3.4s ease-in-out 1.4s infinite; }
    .sp3 { animation: sparkle-twinkle 3.1s ease-in-out 1.9s infinite; }

    @media (prefers-reduced-motion: reduce) {
      .brush-1, .brush-2, .photo-pop, .photo-float, .ground-shadow,
      .ltr, .badge, .sp1, .sp2, .sp3 {
        animation: none !important;
      }
    }
  </style>
  <defs>
    <filter id="photo-shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="4" dy="6" stdDeviation="5" flood-color="#000000" flood-opacity="0.16"/>
    </filter>
    <filter id="ground-blur" x="-30%" y="-60%" width="160%" height="220%">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
    <clipPath id="card-clip">
      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="22"/>
    </clipPath>
    ${archClipDef}
  </defs>

  <g clip-path="url(#card-clip)">
    <!-- Off-white Poster Card -->
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#F7F4EC"/>

    <!-- Two Hand-Painted Yellow Brush-Stroke Bands -->
    <g class="brush-1">
      <path d="${brushLeftPath}" fill="#FFD60A"/>
      <path d="M 48 214 Q 240 206 465 204" fill="none" stroke="#FFE659" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
      <path d="M 62 252 Q 250 258 455 248" fill="none" stroke="#F0C400" stroke-width="3.5" stroke-linecap="round" opacity="0.65"/>
    </g>
    <g class="brush-2">
      <path d="${brushRightPath}" fill="#FFD60A"/>
      <path d="M 420 302 Q 640 294 845 292" fill="none" stroke="#FFE659" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
      <path d="M 435 344 Q 655 352 840 342" fill="none" stroke="#F0C400" stroke-width="3.5" stroke-linecap="round" opacity="0.65"/>
    </g>

    <!-- Soft Pulsing Ground Shadow Under Avatar -->
    <ellipse class="ground-shadow" cx="${photoCx}" cy="${HEIGHT - 16}" rx="${Math.round(drawW * 0.44)}" ry="12" fill="#000000" filter="url(#ground-blur)"/>

    <!-- Center Portrait: Pop-in + Slow Float & Gentle Tilt -->
    <g class="photo-pop">
      <g class="photo-float">
        ${photoMarkup}
      </g>
    </g>

    <!-- Twinkling Sparkle Stars Around Photo -->
    ${buildSparkle(322, 92, 11, '#FFD60A', 'sp1')}
    ${buildSparkle(304, 152, 6.5, '#FFFFFF', 'sp2')}
    ${buildSparkle(576, 86, 9.5, '#FFD60A', 'sp3')}
    ${buildSparkle(594, 146, 6, '#FFFFFF', 'sp1')}
    ${buildSparkle(276, 304, 8, '#FFFFFF', 'sp2')}
    ${buildSparkle(586, 266, 7.5, '#FFD60A', 'sp3')}

    <!-- Left Top: Outlined Intro Lines -->
    <g>
      ${top1.svg}
      ${top2.svg}
    </g>

    <!-- Left Bottom: Badge -->
    <g class="badge">
      <rect x="36" y="348" width="${badgeW}" height="34" rx="17" fill="#111111"/>
      <circle cx="53" cy="365" r="4" fill="#FFD60A"/>
      ${badgeText.svg}
    </g>

    <!-- Right: Huge Stacked Name + Tagline in Fredoka Outlines -->
    <g>
      ${name1.svg}
      ${name2.svg}
      ${name3.svg}
      ${tagline.svg}
    </g>
  </g>

  <!-- Rounded Poster Border -->
  <rect x="1.25" y="1.25" width="${WIDTH - 2.5}" height="${HEIGHT - 2.5}" rx="22" fill="none" stroke="#111111" stroke-width="2.5"/>
</svg>
`;
}

async function main() {
  const photo = await loadPhoto();
  const svg = renderHeroSvg(photo);

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
