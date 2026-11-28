import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT_DIR, 'data', 'stats.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'assets', 'cartographer.svg');

const WIDTH = 900;
const HEIGHT = 300;

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

function buildCompassSvg(cx, cy) {
  return `
  <g transform="translate(${cx}, ${cy})">
    <circle cx="0" cy="0" r="24" fill="#faf5ea" fill-opacity="0.85" stroke="#c93b2b" stroke-width="1.4"/>
    <circle cx="0" cy="0" r="19" fill="none" stroke="#c93b2b" stroke-width="0.6" stroke-opacity="0.45" stroke-dasharray="2 2"/>
    <!-- Cardinal ticks -->
    <line x1="0" y1="-24" x2="0" y2="-20" stroke="#c93b2b" stroke-width="1.4"/>
    <line x1="0" y1="20" x2="0" y2="24" stroke="#c93b2b" stroke-width="1.4"/>
    <line x1="-24" y1="0" x2="-20" y2="0" stroke="#c93b2b" stroke-width="1.4"/>
    <line x1="20" y1="0" x2="24" y2="0" stroke="#c93b2b" stroke-width="1.4"/>
    <!-- Compass needle -->
    <polygon points="0,-16 4.5,0 0,-2.5" fill="#c93b2b"/>
    <polygon points="0,-16 -4.5,0 0,-2.5" fill="#e06558"/>
    <polygon points="0,16 4.5,0 0,2.5" fill="#e8b4ae"/>
    <polygon points="0,16 -4.5,0 0,2.5" fill="#f3d5d1"/>
    <polygon points="-13,0 0,-3.2 0,3.2" fill="#c93b2b" fill-opacity="0.35"/>
    <polygon points="13,0 0,-3.2 0,3.2" fill="#c93b2b" fill-opacity="0.55"/>
    <circle cx="0" cy="0" r="2.2" fill="#faf5ea" stroke="#c93b2b" stroke-width="1.2"/>
  </g>`;
}

export function renderCartographerSvg(stats, avatarDataUri) {
  const user = stats?.user || {};
  const login = user.login || 'manishchandraraturi';
  const name = user.name || login;
  const bio = (user.bio || '').trim();
  const followers = user.followers ?? 0;
  const publicRepos = user.publicRepos ?? 0;

  const fontSans =
    "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";
  const fontMono =
    "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

  const avatarCx = 718;
  const avatarCy = 166;
  const avatarR = 66;

  const bioBlock = bio
    ? `<text x="48" y="182" font-family="${fontSans}" font-size="15" font-weight="400" fill="#475569">${escapeXml(bio)}</text>`
    : '';
  const statsY = bio ? 222 : 196;

  const avatarImage = avatarDataUri
    ? `<image href="${avatarDataUri}" x="${avatarCx - avatarR}" y="${avatarCy - avatarR}" width="${avatarR * 2}" height="${avatarR * 2}" clip-path="url(#avatar-clip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}" fill="#e6decb"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="The Cartographer profile card for ${escapeXml(name)}">
  <defs>
    <pattern id="grid-paper" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e5dcc8" stroke-width="1"/>
    </pattern>
    <clipPath id="card-clip">
      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="18"/>
    </clipPath>
    <clipPath id="avatar-clip">
      <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}"/>
    </clipPath>
  </defs>

  <!-- Cream Grid-Paper Background -->
  <g clip-path="url(#card-clip)">
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#faf5ea"/>
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#grid-paper)"/>
  </g>

  <!-- Outer Subtle Border & Dashed Inner Border -->
  <rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="18" fill="none" stroke="#dfd4bc" stroke-width="1.5"/>
  <rect x="16" y="16" width="${WIDTH - 32}" height="${HEIGHT - 32}" rx="12" fill="none" stroke="#cbbda0" stroke-width="1.5" stroke-dasharray="6 5"/>

  <!-- Left Content -->
  <text x="48" y="66" font-family="${fontSans}" font-size="11.5" font-weight="700" letter-spacing="2.4" fill="#c93b2b">&#9670; THE CARTOGRAPHER</text>
  <text x="48" y="138" font-family="${fontSans}" font-size="38" font-weight="800" fill="#0f233c" letter-spacing="-0.6">${escapeXml(name)}</text>
  ${bioBlock}
  <text x="48" y="${statsY}" font-family="${fontMono}" font-size="14" font-weight="500" fill="#334155">${escapeXml(pluralize(followers, 'follower'))} · ${escapeXml(pluralize(publicRepos, 'repo'))}</text>

  <!-- Top-Right Red Compass -->
  ${buildCompassSvg(832, 62)}

  <!-- Right Circular Avatar with Red Border -->
  <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR + 6}" fill="none" stroke="#c93b2b" stroke-width="1" stroke-opacity="0.28" stroke-dasharray="4 3"/>
  ${avatarImage}
  <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}" fill="none" stroke="#c93b2b" stroke-width="3.5"/>
</svg>
`;
}

async function main() {
  const raw = await fs.readFile(INPUT_PATH, 'utf8');
  const stats = JSON.parse(raw);

  const avatarDataUri = await fetchAvatarDataUri(stats?.user?.avatarUrl);
  const svg = renderCartographerSvg(stats, avatarDataUri);

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
