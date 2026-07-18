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
