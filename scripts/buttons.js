import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { textToPaths } from './textpath.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');

const WIDTH = 340;
const HEIGHT = 72;
const FONT_SANS = "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";

function renderButtonSvg({ title, subtitle, bg1, bg2, border, accent, iconSvg }) {
  const titlePaths = textToPaths(title, {
    x: 84,
    y: 35,
    fontSize: 22,
    weight: 700,
    fill: '#FFFFFF',
    precision: 1,
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${title}">
  <style>
    @keyframes shine-sweep {
      0% { transform: translateX(-140px) skewX(-22deg); opacity: 0; }
      10% { opacity: 1; }
      35% { transform: translateX(${WIDTH + 120}px) skewX(-22deg); opacity: 0.9; }
      40%, 100% { transform: translateX(${WIDTH + 120}px) skewX(-22deg); opacity: 0; }
    }
    .shine { animation: shine-sweep 4s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .shine { animation: none !important; opacity: 0; }
    }
  </style>
  <defs>
    <linearGradient id="btn-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
    <linearGradient id="shine-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="btn-clip">
      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="18"/>
    </clipPath>
  </defs>

  <g clip-path="url(#btn-clip)">
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#btn-bg)"/>
    <circle cx="44" cy="36" r="20" fill="${accent}" opacity="0.22"/>
    ${iconSvg}
    ${titlePaths.svg}
    <text x="84" y="54" font-family="${FONT_SANS}" font-size="12" font-weight="500" fill="#CBD5E1">${subtitle}</text>
    <!-- Right arrow -->
    <path d="M ${WIDTH - 36} 36 L ${WIDTH - 22} 36 M ${WIDTH - 28} 30 L ${WIDTH - 22} 36 L ${WIDTH - 28} 42" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
    <!-- Sweeping Shine -->
    <rect class="shine" x="0" y="-10" width="68" height="${HEIGHT + 20}" fill="url(#shine-grad)"/>
  </g>

  <rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="18" fill="none" stroke="${border}" stroke-width="2"/>
</svg>
`;
}

async function main() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });

  const githubIcon = `<g transform="translate(30, 22)">
    <path fill="#FFFFFF" fill-rule="evenodd" clip-rule="evenodd" d="M14 0C6.265 0 0 6.265 0 14c0 6.195 4.008 11.428 9.573 13.282.7.123.962-.297.962-.665 0-.332-.018-1.435-.018-2.607-3.517.647-4.427-.858-4.707-1.645-.158-.403-.84-1.645-1.435-1.978-.49-.262-1.19-.91-.018-.927 1.103-.018 1.89 1.015 2.153 1.435 1.26 2.118 3.272 1.522 4.077 1.155.123-.91.49-1.523.893-1.873-3.115-.35-6.37-1.557-6.37-6.912 0-1.523.542-2.783 1.435-3.763-.14-.35-.63-1.785.14-3.71 0 0 1.173-.367 3.85 1.435a13.06 13.06 0 0 1 3.5-.472c1.19 0 2.38.157 3.5.472 2.677-1.82 3.85-1.435 3.85-1.435.77 1.925.28 3.36.14 3.71.892.98 1.435 2.222 1.435 3.763 0 5.372-3.273 6.562-6.387 6.912.507.438.945 1.278.945 2.59 0 1.873-.018 3.378-.018 3.85 0 .368.263.805.963.665C23.993 25.427 28 20.177 28 14c0-7.735-6.265-14-14-14z"/>
  </g>`;

  const linkedinIcon = `<g transform="translate(30, 22)">
    <rect x="0" y="0" width="28" height="28" rx="6" fill="#FFFFFF"/>
    <path fill="#0A66C2" d="M8.3 11.2H5.4v10.9h2.9V11.2zM6.85 6.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zM22.6 15.6c0-2.9-1.55-4.6-4.05-4.6-1.45 0-2.45.8-2.85 1.55v-1.35h-2.85v10.9h2.9v-5.7c0-1.5.7-2.4 1.95-2.4 1.15 0 1.95.8 1.95 2.4v5.7h2.95v-6.5z"/>
  </g>`;

  const ghSvg = renderButtonSvg({
    title: 'GitHub',
    subtitle: '@manishchandraraturi',
    bg1: '#161B22',
    bg2: '#0D1117',
    border: '#30363D',
    accent: '#58A6FF',
    iconSvg: githubIcon,
  });

  const liSvg = renderButtonSvg({
    title: 'LinkedIn',
    subtitle: 'Connect with me',
    bg1: '#0A66C2',
    bg2: '#004182',
    border: '#60A5FA',
    accent: '#93C5FD',
    iconSvg: linkedinIcon,
  });

  await fs.writeFile(path.join(ASSETS_DIR, 'btn-github.svg'), ghSvg, 'utf8');
  await fs.writeFile(path.join(ASSETS_DIR, 'btn-linkedin.svg'), liSvg, 'utf8');
  console.log(
    `Generated btn-github.svg (${(Buffer.byteLength(ghSvg, 'utf8') / 1024).toFixed(1)} KB) & btn-linkedin.svg (${(Buffer.byteLength(liSvg, 'utf8') / 1024).toFixed(1)} KB)`
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
