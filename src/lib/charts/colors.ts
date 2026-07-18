import colors from 'tailwindcss/colors';

const CHART_COLOR_NAMES = [
  'blue',
  'red',
  'green',
  'indigo',
  'amber',
  'pink',
  'teal',
  'yellow',
  'slate'
] as const;

const CHART_COLOR_SHADES = {
  light: '400',
  dark: '900'
} as const;

const UNGROUPED_CHART_COLOR_COUNT = 5;

function tailwindChartColor(name: (typeof CHART_COLOR_NAMES)[number]): string {
  const palette = colors[name];
  return `light-dark(${palette[CHART_COLOR_SHADES.light]}, ${palette[CHART_COLOR_SHADES.dark]})`;
}

export function chartColorForRank(rank: number): string {
  const name = CHART_COLOR_NAMES[rank - 1];

  if (!name) throw new RangeError(`Chart color rank ${rank} is not configured.`);
  return tailwindChartColor(name);
}

export function chartColorForKey(key: string): string {
  let hash = 0;

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }

  const colorIndex = Math.abs(hash) % UNGROUPED_CHART_COLOR_COUNT;
  return chartColorForRank(colorIndex + 1);
}
