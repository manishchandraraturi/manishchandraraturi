import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(__dirname, 'node_modules', '@fontsource', 'fredoka', 'files');

const WEIGHT_FILES = {
  400: 'fredoka-latin-400-normal.woff',
  500: 'fredoka-latin-500-normal.woff',
  600: 'fredoka-latin-600-normal.woff',
  700: 'fredoka-latin-700-normal.woff',
  800: 'fredoka-latin-700-normal.woff',
  900: 'fredoka-latin-700-normal.woff',
};

const fontCache = new Map();

export function loadFont(weight = 700) {
  const file = WEIGHT_FILES[weight] || WEIGHT_FILES[700];
  if (fontCache.has(file)) {
    return fontCache.get(file);
  }
  const fontPath = path.join(FONT_DIR, file);
  const buffer = fs.readFileSync(fontPath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const font = opentype.parse(arrayBuffer);
  fontCache.set(file, font);
  return font;
}

export function measureText(text, options = {}) {
  const { weight = 700, fontSize = 32, letterSpacing = 0 } = options;
  const font = loadFont(weight);
  const str = String(text ?? '');
  const scale = fontSize / font.unitsPerEm;

  let width = 0;
  let prevGlyph = null;
  for (const ch of str) {
    const glyph = font.charToGlyph(ch);
    if (prevGlyph) {
      width += font.getKerningValue(prevGlyph, glyph) * scale;
    }
    width += (glyph.advanceWidth || 0) * scale + letterSpacing;
    prevGlyph = glyph;
  }
  if (str.length > 0) {
    width -= letterSpacing;
  }
  return width;
}

function commandsToPathData(commands, precision = 1) {
  const f = (n) => Number(n.toFixed(precision));
  return commands
    .map((cmd) => {
      switch (cmd.type) {
        case 'M':
          return `M${f(cmd.x)} ${f(cmd.y)}`;
        case 'L':
          return `L${f(cmd.x)} ${f(cmd.y)}`;
        case 'Q':
          return `Q${f(cmd.x1)} ${f(cmd.y1)} ${f(cmd.x)} ${f(cmd.y)}`;
        case 'C':
          return `C${f(cmd.x1)} ${f(cmd.y1)} ${f(cmd.x2)} ${f(cmd.y2)} ${f(cmd.x)} ${f(cmd.y)}`;
        case 'Z':
          return 'Z';
        default:
          return '';
      }
    })
    .join('');
}

/**
 * Convert text into individual <path> outlines (one path per non-whitespace glyph).
 */
export function textToPaths(text, options = {}) {
  const {
    x = 0,
    y = 0,
    fontSize = 32,
    weight = 700,
    fill = '#111111',
    opacity,
    align = 'left',
    letterSpacing = 0,
    letterClass = '',
    baseDelay = 0,
    stagger = 0,
    precision = fontSize <= 24 ? 2 : 1,
    extraAttrs = '',
  } = options;

  const font = loadFont(weight);
  const str = String(text ?? '');
  const scale = fontSize / font.unitsPerEm;
  const totalWidth = measureText(str, { weight, fontSize, letterSpacing });

  let cursorX = x;
  if (align === 'center' || align === 'middle') {
    cursorX = x - totalWidth / 2;
  } else if (align === 'right' || align === 'end') {
    cursorX = x - totalWidth;
  }

  const paths = [];
  let prevGlyph = null;
  let letterIdx = 0;

  for (const ch of str) {
    const glyph = font.charToGlyph(ch);
    if (prevGlyph) {
      cursorX += font.getKerningValue(prevGlyph, glyph) * scale;
    }

    const advance = (glyph.advanceWidth || 0) * scale;
    if (!/\s/.test(ch)) {
      const glyphPath = glyph.getPath(cursorX, y, fontSize);
      const d = commandsToPathData(glyphPath.commands, precision);
      if (d) {
        const clsAttr = letterClass ? ` class="${letterClass}"` : '';
        const opAttr = opacity !== undefined ? ` opacity="${opacity}"` : '';
        const delayAttr =
          stagger > 0 || baseDelay > 0
            ? ` style="animation-delay: ${(baseDelay + letterIdx * stagger).toFixed(3)}s"`
            : '';
        const extras = extraAttrs ? ` ${extraAttrs}` : '';
        paths.push(`<path${clsAttr} d="${d}" fill="${fill}"${opAttr}${delayAttr}${extras}/>`);
        letterIdx += 1;
      }
    }

    cursorX += advance + letterSpacing;
    prevGlyph = glyph;
  }

  return {
    svg: paths.join(''),
    width: totalWidth,
    letterCount: letterIdx,
    startX: align === 'right' || align === 'end' ? x - totalWidth : align === 'center' || align === 'middle' ? x - totalWidth / 2 : x,
  };
}
