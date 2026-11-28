import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureText, textToPaths } from './textpath.js';
import { getLangColor } from './colors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT_DIR, 'data', 'stats.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'assets', 'city.svg');

const WIDTH = 900;
const HEIGHT = 560;

// Isometric grid parameters (~1.25x bigger plate, active right end near middle-bottom)
const STEP_X = 10.4;
const STEP_Y = 5.2;
const BAR_SCALE = 0.78;
const BASE_TILE_HEIGHT = 2.6;
const MIN_BAR_HEIGHT = 18;
const MAX_BAR_HEIGHT = 150;
const ORIGIN_X = 116;
const ORIGIN_Y = 158;

// Flat 0-contribution tile on the white plate (crisper grey grid lines)
const ZERO_TILE = { top: '#ffffff', left: '#f1f5f9', right: '#e2e8f0', stroke: '#a8b5c7' };

// Season palettes (low/pale -> high/saturated dark), each with 3 shaded faces (top, left, right)
const SEASONS = {
  winter: [
    { top: '#e2e8f0', left: '#cbd5e1', right: '#94a3b8' },
    { top: '#cbd5e1', left: '#94a3b8', right: '#64748b' },
    { top: '#94a3b8', left: '#64748b', right: '#475569' },
    { top: '#64748b', left: '#475569', right: '#334155' },
  ],
  spring: [
    { top: '#fce7f3', left: '#fbcfe8', right: '#f9a8d4' },
    { top: '#f9a8d4', left: '#f472b6', right: '#ec4899' },
    { top: '#f472b6', left: '#ec4899', right: '#db2777' },
    { top: '#ec4899', left: '#db2777', right: '#be185d' },
  ],
  summer: [
    { top: '#dcfce7', left: '#bbf7d0', right: '#86efac' },
    { top: '#86efac', left: '#4ade80', right: '#22c55e' },
    { top: '#4ade80', left: '#22c55e', right: '#16a34a' },
    { top: '#22c55e', left: '#16a34a', right: '#15803d' },
  ],
  autumn: [
    { top: '#fef3c7', left: '#fde68a', right: '#fcd34d' },
    { top: '#fde68a', left: '#fbbf24', right: '#f59e0b' },
    { top: '#fbbf24', left: '#f59e0b', right: '#d97706' },
    { top: '#f59e0b', left: '#ea580c', right: '#c2410c' },
  ],
};

function outlineBlock(text, options) {
  const res = textToPaths(text, { ...options, precision: 1 });
  // Combine all per-letter path `d` attributes into one <path> and apply TrueType T-shorthand
  const ds = [...res.svg.matchAll(/d="([^"]+)"/g)].map((m) => m[1]);
  if (!ds.length) return { svg: '', width: res.width };

  const combined = ds.join('').replace(/([MLQT])\s*/g, '$1');
  // Compress consecutive quadratic segments using SVG T-shorthand where reflection matches
  const tokens = combined.match(/[MLQTZ]|-?\d*\.?\d+/g) || [];
  const out = [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  let lastCtrlX = null;
  let lastCtrlY = null;
  let lastCmd = '';

  while (i < tokens.length) {
    const t = tokens[i];
    if (t === 'M') {
      cx = Number(tokens[i + 1]);
      cy = Number(tokens[i + 2]);
      out.push(`M${cx} ${cy}`);
      lastCtrlX = null;
      lastCtrlY = null;
      lastCmd = 'M';
      i += 3;
    } else if (t === 'L') {
      const nx = Number(tokens[i + 1]);
      const ny = Number(tokens[i + 2]);
      out.push(`${lastCmd === 'L' ? ' ' : 'L'}${nx} ${ny}`);
      cx = nx;
      cy = ny;
      lastCtrlX = null;
      lastCtrlY = null;
      lastCmd = 'L';
      i += 3;
    } else if (t === 'Q') {
      const x1 = Number(tokens[i + 1]);
      const y1 = Number(tokens[i + 2]);
      const nx = Number(tokens[i + 3]);
      const ny = Number(tokens[i + 4]);
      if (lastCtrlX !== null) {
        const rx = Number((2 * cx - lastCtrlX).toFixed(1));
        const ry = Number((2 * cy - lastCtrlY).toFixed(1));
        if (Math.abs(rx - x1) <= 0.15 && Math.abs(ry - y1) <= 0.15) {
          out.push(`${lastCmd === 'T' ? ' ' : 'T'}${nx} ${ny}`);
          lastCtrlX = rx;
          lastCtrlY = ry;
          cx = nx;
          cy = ny;
          lastCmd = 'T';
          i += 5;
          continue;
        }
      }
      out.push(`${lastCmd === 'Q' ? ' ' : 'Q'}${x1} ${y1} ${nx} ${ny}`);
      lastCtrlX = x1;
      lastCtrlY = y1;
      cx = nx;
      cy = ny;
      lastCmd = 'Q';
      i += 5;
    } else if (t === 'Z') {
      out.push('Z');
      lastCtrlX = null;
      lastCtrlY = null;
      lastCmd = 'Z';
      i += 1;
    } else {
      i += 1;
    }
  }

  return {
    svg: `<path d="${out.join('')}" fill="${options.fill || '#0f172a'}"/>`,
    width: res.width,
  };
}

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

function getSeason(dateStr) {
  const month = Number(String(dateStr || '').split('-')[1] || 1);
  if (month === 12 || month <= 2) return 'winter';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  return 'autumn';
}

function getSeasonColors(dateStr, count, maxCount) {
  if (count <= 0) return ZERO_TILE;
  const season = SEASONS[getSeason(dateStr)];
  const ratio = maxCount <= 1 ? 1 : count / maxCount;
  const tier = ratio <= 0.2 ? 0 : ratio <= 0.45 ? 1 : ratio <= 0.72 ? 2 : 3;
  return season[tier];
}

function getBarHeight(count, maxCount) {
  if (count <= 0) return 0;
  if (maxCount <= 1) return MIN_BAR_HEIGHT;
  const t = (Math.sqrt(count) - 1) / (Math.sqrt(maxCount) - 1);
  return Number((MIN_BAR_HEIGHT + t * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT)).toFixed(1));
}

function isoPoint(w, d) {
  return {
    x: ORIGIN_X + (w - d) * STEP_X,
    y: ORIGIN_Y + (w + d) * STEP_Y,
  };
}

function buildPlateTray(weekCount) {
  const padW = 1.15;
  const padD = 1.15;
  const pTop = isoPoint(-padW, -padD);
  const pRight = isoPoint(weekCount - 1 + padW, -padD);
  const pBot = isoPoint(weekCount - 1 + padW, 6 + padD);
  const pLeft = isoPoint(-padW, 6 + padD);
  const depth = 11;

  const f = (n) => n.toFixed(1);
  const topD = `M${f(pTop.x)} ${f(pTop.y)}L${f(pRight.x)} ${f(pRight.y)}L${f(pBot.x)} ${f(pBot.y)}L${f(pLeft.x)} ${f(pLeft.y)}Z`;
  const leftD = `M${f(pLeft.x)} ${f(pLeft.y)}L${f(pBot.x)} ${f(pBot.y)}L${f(pBot.x)} ${f(pBot.y + depth)}L${f(pLeft.x)} ${f(pLeft.y + depth)}Z`;
  const rightD = `M${f(pBot.x)} ${f(pBot.y)}L${f(pRight.x)} ${f(pRight.y)}L${f(pRight.x)} ${f(pRight.y + depth)}L${f(pBot.x)} ${f(pBot.y + depth)}Z`;

  const shadowD = `M${f(pTop.x + 2)} ${f(pTop.y + depth + 8)}L${f(pRight.x + 6)} ${f(pRight.y + depth + 10)}L${f(pBot.x + 4)} ${f(pBot.y + depth + 13)}L${f(pLeft.x - 4)} ${f(pLeft.y + depth + 10)}Z`;

  return `
    <path d="${shadowD}" fill="#94a3b8" opacity="0.28" filter="url(#plate-shadow)"/>
    <path d="${leftD}" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="0.6"/>
    <path d="${rightD}" fill="#cbd5e1" stroke="#94a3b8" stroke-width="0.6"/>
    <path d="${topD}" fill="#ffffff" stroke="#d5dde8" stroke-width="1"/>
  `;
}

function isoBarSvg(cx, cy, bx, by, h, colors, isZero) {
  const f = (n) => Number(n.toFixed(1));
  const topY = cy - h;

  const topFace = `M${f(cx)} ${f(topY - by)}L${f(cx + bx)} ${f(topY)}L${f(cx)} ${f(topY + by)}L${f(cx - bx)} ${f(topY)}Z`;
  if (isZero) {
    return topFace;
  }

  const leftFace = `M${f(cx - bx)} ${f(topY)}L${f(cx)} ${f(topY + by)}L${f(cx)} ${f(cy + by)}L${f(cx - bx)} ${f(cy)}Z`;
  const rightFace = `M${f(cx)} ${f(topY + by)}L${f(cx + bx)} ${f(topY)}L${f(cx + bx)} ${f(cy)}L${f(cx)} ${f(cy + by)}Z`;

  return `<path d="${leftFace}" fill="${colors.left}"/><path d="${rightFace}" fill="${colors.right}"/><path d="${topFace}" fill="${colors.top}"/>`;
}

function buildCity(weeks) {
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

  cells.sort((a, b) => a.w + a.d - (b.w + b.d) || a.w - b.w);

  const weekCount = Math.max(weeks.length, 1);
  const bx = STEP_X * BAR_SCALE;
  const by = STEP_Y * BAR_SCALE;

  const staticTileDs = [];
  const bars = [];

  for (const cell of cells) {
    const { x: cx, y: cy } = isoPoint(cell.w, cell.d);
    const h = getBarHeight(cell.count, maxCount);
    const colors = getSeasonColors(cell.date, cell.count, maxCount);

    if (cell.count <= 0) {
      staticTileDs.push(isoBarSvg(cx, cy, bx, by, 0, colors, true));
    } else {
      const delay = (cell.w * 0.032).toFixed(3);
      const body = isoBarSvg(cx, cy, bx, by, h, colors, false);
      bars.push(`<g class="bar" style="animation-delay:${delay}s">${body}</g>`);
    }
  }

  return `${buildPlateTray(weekCount)}
  <path id="city-tiles" d="${staticTileDs.join('')}" fill="${ZERO_TILE.top}" stroke="${ZERO_TILE.stroke}" stroke-width="0.78" stroke-linejoin="round"/>
  <g id="city-bars">${bars.join('')}</g>`;
}

function buildRadarChart(contributions) {
  const cx = 742;
  const cy = 140;
  const R = 88;

  const commits = contributions.totalCommitContributions ?? 0;
  const issues = contributions.totalIssueContributions ?? 0;
  const prs = contributions.totalPullRequestContributions ?? 0;
  const reviews = contributions.totalPullRequestReviewContributions ?? 0;
  const repos =
    contributions.totalRepositoryContributions ??
    Math.max(
      0,
      (contributions.totalContributions ?? 0) -
        commits -
        issues -
        prs -
        reviews -
        (contributions.restrictedContributionsCount ?? 0)
    );

  const axes = [
    { label: 'Commit', value: commits, dx: 0, dy: -13, align: 'center' },
    { label: 'Issue', value: issues, dx: 11, dy: 5, align: 'left' },
    { label: 'PullReq', value: prs, dx: 9, dy: 16, align: 'left' },
    { label: 'Review', value: reviews, dx: -9, dy: 16, align: 'right' },
    { label: 'Repo', value: repos, dx: -11, dy: 5, align: 'right' },
  ];

  const angleAt = (idx) => -Math.PI / 2 + (idx * Math.PI * 2) / 5;

  // 5 concentric dashed pentagon rings: 1, 10, 100, 1K, 10K
  const ringLabels = ['1', '10', '100', '1K', '10K'];
  const ringsSvg = ringLabels
    .map((lbl, idx) => {
      const rr = ((idx + 1) / 5) * R;
      const pts = axes
        .map((_, aIdx) => {
          const a = angleAt(aIdx);
          return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
        })
        .join(' ');
      const labelPaths = outlineBlock(lbl, {
        x: cx + 4,
        y: cy - rr + 3.5,
        fontSize: 9.5,
        weight: 600,
        fill: '#64748b',
      });
      return `<polygon points="${pts}" fill="none" stroke="#94a3b8" stroke-opacity="0.5" stroke-width="1" stroke-dasharray="3 3"/>${labelPaths.svg}`;
    })
    .join('');

  // Spokes + bigger axis labels
  const spokesAndLabels = axes
    .map((ax, idx) => {
      const a = angleAt(idx);
      const x2 = cx + Math.cos(a) * R;
      const y2 = cy + Math.sin(a) * R;
      const lx = x2 + ax.dx;
      const ly = y2 + ax.dy;
      const lblPaths = outlineBlock(ax.label, {
        x: lx,
        y: ly,
        fontSize: 13.5,
        weight: 600,
        fill: '#334155',
        align: ax.align,
      });
      return `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#cbd5e1" stroke-width="1"/>${lblPaths.svg}`;
    })
    .join('');

  // Data polygon on log10 scale (1 -> ring 1, 10K -> ring 5; 0 -> tiny hub 3.5px)
  const dataPts = axes.map((ax, idx) => {
    const a = angleAt(idx);
    const rr =
      ax.value <= 0 ? 3.5 : (Math.min(5, 1 + Math.log10(ax.value)) / 5) * R;
    return {
      x: cx + Math.cos(a) * rr,
      y: cy + Math.sin(a) * rr,
    };
  });
  const polyPoints = dataPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const dotsSvg = dataPts
    .map(
      (p) =>
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.8" fill="#16a34a" stroke="#ffffff" stroke-width="1"/>`
    )
    .join('');

  return `<g id="radar-chart">
    ${ringsSvg}
    ${spokesAndLabels}
    <g class="radar-poly" style="transform-origin:${cx}px ${cy}px">
      <polygon points="${polyPoints}" fill="#22c55e" fill-opacity="0.28" stroke="#16a34a" stroke-width="2" stroke-linejoin="round"/>
      ${dotsSvg}
    </g>
  </g>`;
}

function buildLanguageDonut(languages) {
  const top = (languages || []).slice(0, 5);
  const topSum = top.reduce((sum, l) => sum + (l.percentage || 0), 0);
  const items = [...top];
  if (topSum < 99.5 && topSum > 0) {
    items.push({
      name: 'Other',
      color: '#94a3b8',
      percentage: Number((100 - topSum).toFixed(2)),
    });
  }

  const cx = 96;
  const cy = 412;
  const r = 54;
  const strokeW = 20;
  const C = 2 * Math.PI * r;
  const gapLen = 3.2;

  const totalPct = Math.max(
    items.reduce((sum, l) => sum + (l.percentage || 0), 0),
    1
  );

  let offset = 0;
  const segmentKeyframes = [];
  const circlesSvg = [];
  const legendSvg = [];

  items.forEach((lang, idx) => {
    const share = (lang.percentage || 0) / totalPct;
    const rawLen = share * C;
    const drawLen = Math.max(1.5, rawLen - gapLen);
    const color = getLangColor(lang.name, lang.color);
    const delay = (0.3 + idx * 0.16).toFixed(2);

    segmentKeyframes.push(
      `@keyframes sweep-${idx} { from { stroke-dasharray: 0 ${C.toFixed(2)}; } to { stroke-dasharray: ${drawLen.toFixed(2)} ${C.toFixed(2)}; } }
    .donut-seg-${idx} { animation: sweep-${idx} 0.75s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s both; }`
    );

    circlesSvg.push(
      `<circle class="donut-seg-${idx}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${escapeXml(color)}" stroke-width="${strokeW}" stroke-dasharray="${drawLen.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`
    );
    offset += rawLen;

    // Larger color-square legend on the right of the donut
    const rowY = 358 + idx * 21;
    const labelText = `${lang.name} ${Math.round(lang.percentage || 0)}%`;
    const labelPaths = outlineBlock(labelText, {
      x: 196,
      y: rowY + 10.5,
      fontSize: 13.5,
      weight: 600,
      fill: '#334155',
    });
    legendSvg.push(
      `<rect x="178" y="${rowY}" width="11" height="11" rx="2.5" fill="${escapeXml(color)}"/>${labelPaths.svg}`
    );
  });

  const markup = `<g id="language-donut">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="${strokeW}"/>
    ${circlesSvg.join('')}
    <circle cx="${cx}" cy="${cy}" r="${r - strokeW / 2 - 1}" fill="none" stroke="#ffffff" stroke-width="1.2"/>
    <g id="language-legend">${legendSvg.join('')}</g>
  </g>`;

  return { markup, css: segmentKeyframes.join('\n    ') };
}

export function renderCitySvg(stats) {
  const login = stats?.user?.login || 'manishchandraraturi';
  const contributions = stats?.contributions || {};
  const weeks = contributions.weeks || [];
  const totalContributions = contributions.totalContributions ?? 0;
  const activeDays = contributions.activeDays ?? 0;
  const busiestCount = contributions.busiestDay?.count ?? 0;
  const longestStreak = contributions.longestStreak ?? 0;

  const cityMarkup = buildCity(weeks);
  const radarMarkup = buildRadarChart(contributions);
  const donut = buildLanguageDonut(stats?.languages || []);

  // Outlined big number via textpath.js; clean system <text> for secondary stats & handle (<150 KB)
  const bigStr = `${formatNumber(totalContributions)} contributions`;
  const subStr = `${formatNumber(activeDays)} active days · busiest day ${formatNumber(busiestCount)} · longest streak ${formatNumber(longestStreak)}`;

  const fontSans =
    "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";
  const fontMono =
    "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

  const bigW = measureText(bigStr, { weight: 700, fontSize: 22 });
  const subW = subStr.length * 6.5;
  const totalBottomW = bigW + 14 + subW;
  const bottomStartX = Math.max(205, Math.round(545 - totalBottomW / 2));

  const bigPaths = outlineBlock(bigStr, {
    x: bottomStartX,
    y: 530,
    fontSize: 22,
    weight: 700,
    fill: '#0f172a',
  });

  const subX = (bottomStartX + bigW + 14).toFixed(1);
  const subText = `<text x="${subX}" y="529" font-family="${fontSans}" font-size="13" font-weight="500" fill="#475569">${escapeXml(subStr)}</text>`;
  const handleText = `<text x="34" y="531" font-family="${fontMono}" font-size="12" font-weight="600" fill="#64748b">@${escapeXml(login)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Contribution City for @${escapeXml(login)}">
  <style>
    @keyframes rise {
      from { transform: scaleY(0); opacity: 0; }
      to { transform: scaleY(1); opacity: 1; }
    }
    @keyframes radar-grow {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .bar {
      transform-box: fill-box;
      transform-origin: bottom;
      animation: rise 1.3s ease-out both;
    }
    .radar-poly {
      animation: radar-grow 1s cubic-bezier(0.22, 1, 0.36, 1) 3.0s both;
    }
    ${donut.css}
    @media (prefers-reduced-motion: reduce) {
      .bar, .radar-poly, [class*="donut-seg-"] {
        animation: none !important;
      }
    }
  </style>
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f7f9fc"/>
      <stop offset="100%" stop-color="#e8edf5"/>
    </linearGradient>
    <filter id="plate-shadow" x="-15%" y="-15%" width="130%" height="140%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
  </defs>

  <!-- Light Card Background & Rounded Border -->
  <rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="20" fill="url(#bg-grad)" stroke="#cfd8e6" stroke-width="1.5"/>

  <!-- Isometric Contribution City Plate & Seasonal Buildings -->
  ${cityMarkup}

  <!-- Top-Right Pentagon Radar -->
  ${radarMarkup}

  <!-- Bottom-Left Language Donut & Legend -->
  ${donut.markup}

  <!-- Bottom Handle & Stats Summary -->
  ${handleText}
  <g>${bigPaths.svg}</g>
  ${subText}
</svg>
`;
}

async function main() {
  const raw = await fs.readFile(INPUT_PATH, 'utf8');
  const stats = JSON.parse(raw);
  const svg = renderCitySvg(stats);

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
