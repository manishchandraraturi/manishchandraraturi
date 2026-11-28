import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureText, textToPaths } from './textpath.js';

// Editable About Me configuration
const ABOUT = {
  greeting: "Hi, I'm Manish.",
  bioLines: [
    '3rd-year AIML student at CMR Institute of Technology,',
    'Bangalore. I love building AI/ML, GenAI and RAG',
    'systems, and I learn fastest by shipping. I also love',
    'speaking and explaining tech to people.',
  ],
  chips: [
    { label: 'FOCUS', value: 'AI / ML and GenAI', bg: '#FCE7F3', border: '#EC4899', pill: '#DB2777' },
    { label: 'STYLE', value: 'Build first, theory later', bg: '#CCFBF1', border: '#14B8A6', pill: '#0D9488' },
    { label: 'ALSO', value: 'Speaking and presenting', bg: '#FEF3C7', border: '#F59E0B', pill: '#D97706' },
    { label: 'GOAL', value: 'Meaningful AI systems', bg: '#EDE9FE', border: '#A855F7', pill: '#7C3AED' },
  ],
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT_DIR, 'assets', 'about.svg');

const WIDTH = 900;
const HEIGHT = 380;
const FONT_SANS = "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderAboutSvg() {
  // Typewriter greeting in Fredoka outlines (per-letter reveal)
  const greetingX = 56;
  const greetingY = 128;
  const greetingPaths = textToPaths(ABOUT.greeting, {
    x: greetingX,
    y: greetingY,
    fontSize: 36,
    weight: 700,
    fill: '#111111',
    letterSpacing: -0.4,
    letterClass: 'type-ltr',
    baseDelay: 0.15,
    stagger: 0.065,
    precision: 1,
  });

  const cursorX = Math.round(greetingX + greetingPaths.width + 6);

  const badgeTag = textToPaths('ABOUT ME', {
    x: 76,
    y: 74,
    fontSize: 11,
    weight: 700,
    fill: '#FFFFFF',
    precision: 1,
  });
  const badgeW = Math.round(measureText('ABOUT ME', { weight: 700, fontSize: 11 }) + 38);

  const bioSvg = ABOUT.bioLines
    .map(
      (line, idx) =>
        `<text class="bio-line" x="56" y="${174 + idx * 24}" font-family="${FONT_SANS}" font-size="13.5" font-weight="500" fill="#334155" style="animation-delay: ${(1.05 + idx * 0.14).toFixed(2)}s">${escapeXml(line)}</text>`
    )
    .join('\n      ');

  const chipsSvg = ABOUT.chips
    .map((chip, idx) => {
      const x = 516;
      const y = 32 + idx * 82;
      const w = 352;
      const h = 66;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const delay = (0.32 + idx * 0.18).toFixed(2);

      const lblW = measureText(chip.label, { weight: 700, fontSize: 10.5 });
      const pillW = Math.round(lblW + 20);
      const pillPaths = textToPaths(chip.label, {
        x: x + 16 + pillW / 2,
        y: y + 26.5,
        fontSize: 10.5,
        weight: 700,
        fill: '#FFFFFF',
        align: 'center',
        precision: 1,
      });

      const valPaths = textToPaths(chip.value, {
        x: x + 16,
        y: y + 51,
        fontSize: 16.5,
        weight: 600,
        fill: '#111111',
        precision: 1,
      });

      return `<g class="chip" style="transform-origin: ${cx}px ${cy}px; animation-delay: ${delay}s">
      <rect x="${x + 4}" y="${y + 4}" width="${w}" height="${h}" rx="15" fill="#111111"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="15" fill="${chip.bg}" stroke="#111111" stroke-width="2"/>
      <rect x="${x + 16}" y="${y + 12}" width="${pillW}" height="21" rx="10.5" fill="${chip.pill}" stroke="#111111" stroke-width="1.2"/>
      ${pillPaths.svg}
      ${valPaths.svg}
    </g>`;
    })
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="About Manish Chandra Raturi">
  <style>
    @keyframes type-char {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }
    @keyframes bio-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0px); }
    }
    @keyframes chip-pop {
      0% { opacity: 0; transform: scale(0.86) translateY(10px); }
      70% { opacity: 1; transform: scale(1.03) translateY(-2px); }
      100% { opacity: 1; transform: scale(1) translateY(0px); }
    }

    .type-ltr { animation: type-char 0.01s steps(1, end) both; }
    .cursor { animation: blink 0.85s steps(1, end) infinite; }
    .bio-line { animation: bio-in 0.55s ease-out both; }
    .chip { animation: chip-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

    @media (prefers-reduced-motion: reduce) {
      .type-ltr, .cursor, .bio-line, .chip {
        animation: none !important;
      }
      .cursor { opacity: 0; }
    }
  </style>
  <defs>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="1.2" fill="#D6CFC0"/>
    </pattern>
    <clipPath id="card-clip">
      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="20"/>
    </clipPath>
  </defs>

  <g clip-path="url(#card-clip)">
    <!-- Light Cream Sticker Card -->
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#FAF6EE"/>
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#dots)" opacity="0.55"/>

    <!-- Left Sticker Panel -->
    <rect x="37" y="37" width="450" height="312" rx="18" fill="#111111"/>
    <rect x="32" y="32" width="450" height="312" rx="18" fill="#FFFFFF" stroke="#111111" stroke-width="2.2"/>

    <!-- Top Pill -->
    <rect x="56" y="56" width="${badgeW}" height="26" rx="13" fill="#EC4899" stroke="#111111" stroke-width="1.5"/>
    <circle cx="68" cy="69" r="3.5" fill="#FDE047"/>
    ${badgeTag.svg}

    <!-- Typewriter Greeting -->
    <g>${greetingPaths.svg}</g>
    <rect class="cursor" x="${cursorX}" y="97" width="3.5" height="34" rx="1.5" fill="#EC4899"/>

    <!-- Short 3-line Bio -->
    <g>
      ${bioSvg}
    </g>

    <!-- Bottom Sticker Accent Strip -->
    <rect x="56" y="302" width="64" height="8" rx="4" fill="#EC4899"/>
    <rect x="128" y="302" width="36" height="8" rx="4" fill="#14B8A6"/>
    <rect x="172" y="302" width="24" height="8" rx="4" fill="#FFD60A"/>

    <!-- Right: 4 Animated Stat Chips -->
    ${chipsSvg}
  </g>

  <rect x="1.25" y="1.25" width="${WIDTH - 2.5}" height="${HEIGHT - 2.5}" rx="20" fill="none" stroke="#111111" stroke-width="2.5"/>
</svg>
`;
}

async function main() {
  const svg = renderAboutSvg();
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
