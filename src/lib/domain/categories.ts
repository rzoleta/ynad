import type { CategoryEntity } from './types';

export const UNCATEGORIZED_CATEGORY_ID = 'uncategorized';

export function getCategoryLabel(
  categoryId: string | null,
  categoryById: Map<string, CategoryEntity>
): string {
  if (!categoryId || categoryId === UNCATEGORIZED_CATEGORY_ID) return 'Uncategorized';
  return categoryById.get(categoryId)?.name ?? 'Uncategorized';
}
