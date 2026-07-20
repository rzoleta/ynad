import { getCategoryLabel, UNCATEGORIZED_CATEGORY_ID } from '$lib/domain/categories';
import type { CategoryEntity, Milliunits, TransactionEntry } from '$lib/domain/types';
import type { BreakdownTooltipItem } from './types';

const MIN_VISIBLE_BREAKDOWN_GROUPS = 5;
const MAX_VISIBLE_BREAKDOWN_GROUPS = 8;
const TARGET_BREAKDOWN_SHARE = 0.9;

export function selectBreakdownGroups<T>(
  groups: T[],
  getContribution: (group: T) => number
): { primary: T[]; overflow: T[] } {
  const sorted = groups
    .map((group, index) => ({
      group,
      index,
      contribution: Math.abs(getContribution(group))
    }))
    .sort((left, right) => right.contribution - left.contribution || left.index - right.index);

  const maximumVisible = Math.min(MAX_VISIBLE_BREAKDOWN_GROUPS, sorted.length);
  let visibleCount = Math.min(MIN_VISIBLE_BREAKDOWN_GROUPS, maximumVisible);
  const totalContribution = sorted.reduce((total, item) => total + item.contribution, 0);
  let visibleContribution = sorted
    .slice(0, visibleCount)
    .reduce((total, item) => total + item.contribution, 0);

  while (
    visibleCount < maximumVisible &&
    totalContribution > 0 &&
    visibleContribution / totalContribution < TARGET_BREAKDOWN_SHARE
  ) {
    visibleContribution += sorted[visibleCount].contribution;
    visibleCount += 1;
  }

  return {
    primary: sorted.slice(0, visibleCount).map((item) => item.group),
    overflow: sorted.slice(visibleCount).map((item) => item.group)
  };
}

export function getCategoryTooltipItems(
  entries: TransactionEntry[],
  categoryById: Map<string, CategoryEntity>,
  getValue: (entry: TransactionEntry) => Milliunits
): BreakdownTooltipItem[] {
  const itemsByCategory = new Map<string, BreakdownTooltipItem>();

  for (const entry of entries) {
    const key = entry.categoryId ?? UNCATEGORIZED_CATEGORY_ID;
    const current = itemsByCategory.get(key);

    if (current) {
      current.valueMilliunits += getValue(entry);
    } else {
      itemsByCategory.set(key, {
        key,
        label: getCategoryLabel(entry.categoryId, categoryById),
        valueMilliunits: getValue(entry)
      });
    }
  }

  return [...itemsByCategory.values()]
    .filter((item) => item.valueMilliunits !== 0)
    .sort(
      (left, right) =>
        Math.abs(right.valueMilliunits) - Math.abs(left.valueMilliunits) ||
        left.label.localeCompare(right.label)
    );
}
