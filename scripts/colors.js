// Single source of truth for distinct language colors across all profile SVGs
export const LANG_COLORS = {
  TypeScript: '#3178c6',
  Python: '#14b8a6',
  JavaScript: '#f1e05a',
  Kotlin: '#a97bff',
  'Jupyter Notebook': '#f97316',
  HTML: '#ec4899',
  CSS: '#06b6d4',
  Other: '#94a3b8',
};

export function getLangColor(name, fallback) {
  if (name && LANG_COLORS[name]) return LANG_COLORS[name];
  return fallback || LANG_COLORS.Other;
}
