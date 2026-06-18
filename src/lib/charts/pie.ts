import type { PieSlicePoint } from './types';

const MAX_VISIBLE_PIE_SLICES = 6;
const MIN_VISIBLE_PIE_SLICE_SHARE = 0.03;

export const OTHER_PIE_SLICE_KEY = '__others__';

export function aggregatePieSlices(points: PieSlicePoint[]): PieSlicePoint[] {
  const sorted = [...points].sort(sortPieSlices);
  const total = sorted.reduce((sum, point) => sum + pieSliceValue(point), 0);

  if (sorted.length <= 1 || total <= 0) return sorted;

  const significantCount = sorted.filter(
    (point) => pieSliceValue(point) / total >= MIN_VISIBLE_PIE_SLICE_SHARE
  ).length;
  const visibleCount =
    significantCount > 0
      ? Math.min(significantCount, MAX_VISIBLE_PIE_SLICES)
      : Math.min(sorted.length, MAX_VISIBLE_PIE_SLICES);

  if (visibleCount >= sorted.length) return sorted;

  const primary = sorted.slice(0, visibleCount);
  const overflow = sorted.slice(visibleCount);
  const othersTotal = overflow.reduce((sum, point) => sum + pieSliceValue(point), 0);

  if (othersTotal <= 0) return primary;

  return [
    ...primary,
    {
      key: OTHER_PIE_SLICE_KEY,
      label: 'Others',
      valueMilliunits: othersTotal
    }
  ];
}

function sortPieSlices(left: PieSlicePoint, right: PieSlicePoint): number {
  return pieSliceValue(right) - pieSliceValue(left) || left.label.localeCompare(right.label);
}

function pieSliceValue(point: PieSlicePoint): number {
  return Math.abs(point.valueMilliunits);
}
