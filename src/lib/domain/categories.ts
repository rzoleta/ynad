import type { CategoryEntity, CategoryGroupEntity } from './types';

export const UNCATEGORIZED_CATEGORY_ID = 'uncategorized';
export const UNCATEGORIZED_CATEGORY_GROUP_ID = 'uncategorized-category-group';

export function getCategoryLabel(
  categoryId: string | null,
  categoryById: Map<string, CategoryEntity>
): string {
  if (!categoryId || categoryId === UNCATEGORIZED_CATEGORY_ID) return 'Uncategorized';
  return categoryById.get(categoryId)?.name ?? 'Uncategorized';
}

export function getCategoryGroup(
  categoryId: string | null,
  categoryById: Map<string, CategoryEntity>,
  categoryGroups: CategoryGroupEntity[]
): { key: string; label: string } {
  if (!categoryId || categoryId === UNCATEGORIZED_CATEGORY_ID) {
    return { key: UNCATEGORIZED_CATEGORY_GROUP_ID, label: 'Uncategorized' };
  }

  const category = categoryById.get(categoryId);
  const group = categoryGroups.find((candidate) => candidate.id === category?.groupId);

  if (!group) {
    return { key: UNCATEGORIZED_CATEGORY_GROUP_ID, label: 'Uncategorized' };
  }

  return { key: group.id, label: group.name };
}
