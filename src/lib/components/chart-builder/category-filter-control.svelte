<script lang="ts">
  import { Search } from '@lucide/svelte';
  import * as Select from '$lib/components/ui/select/index.js';
  import type { ChartConfig } from '$lib/app/chart-config';
  import { UNCATEGORIZED_CATEGORY_ID } from '$lib/domain/categories';
  import type { CategoryEntity, CategoryGroupEntity } from '$lib/domain/types';
  import { groupCategories } from './filter-summary';

  let {
    chart,
    categoryGroups = [],
    categories = [],
    onChange
  }: {
    chart: ChartConfig;
    categoryGroups?: CategoryGroupEntity[];
    categories?: CategoryEntity[];
    onChange: (chart: ChartConfig) => void;
  } = $props();

  let query = $state('');

  const enabled = $derived(chart.type === 'spending' || chart.type === 'income');
  const groups = $derived(groupCategories(categoryGroups, categories));
  const categoryIdsByGroup = $derived(
    new Map(groups.map((group) => [group.id, group.categories.map((category) => category.id)]))
  );
  const allIds = $derived([
    UNCATEGORIZED_CATEGORY_ID,
    ...categories.map((category) => category.id)
  ]);
  const selectedIds = $derived(
    chart.categories?.mode === 'all' || !chart.categories ? allIds : chart.categories.ids
  );
  const selectedIdSet = $derived(new Set(selectedIds));

  const filteredGroups = $derived(
    query.trim() === ''
      ? groups
      : groups
          .map((group) => ({
            ...group,
            categories: group.categories.filter((category) =>
              category.name.toLowerCase().includes(query.trim().toLowerCase())
            )
          }))
          .filter((group) => group.categories.length > 0)
  );

  const uncategorizedMatch = $derived(
    query.trim() === '' || 'uncategorized'.toLowerCase().includes(query.trim().toLowerCase())
  );

  const triggerLabel = $derived(
    selectedIds.length === allIds.length
      ? 'All categories'
      : selectedIds.length === 0
        ? 'No categories'
        : `${selectedIds.length} categor${selectedIds.length === 1 ? 'y' : 'ies'}`
  );

  function handleChange(nextIds: string[]) {
    if (!enabled) return;
    onChange({ ...chart, categories: { mode: 'selected', ids: nextIds } });
  }

  function selectAll() {
    if (!enabled) return;
    onChange({ ...chart, categories: { mode: 'selected', ids: allIds } });
  }

  function selectNone() {
    if (!enabled) return;
    onChange({ ...chart, categories: { mode: 'selected', ids: [] } });
  }

  function areCategoryIdsSelected(categoryIds: string[]) {
    return categoryIds.length > 0 && categoryIds.every((id) => selectedIdSet.has(id));
  }

  function areNoCategoryIdsSelected(categoryIds: string[]) {
    return categoryIds.every((id) => !selectedIdSet.has(id));
  }

  function setCategoryIdsSelection(categoryIds: string[], selected: boolean) {
    if (!enabled) return;
    const nextIds = selected
      ? [...new Set([...selectedIds, ...categoryIds])]
      : selectedIds.filter((id) => !categoryIds.includes(id));

    onChange({
      ...chart,
      categories: { mode: 'selected', ids: nextIds }
    });
  }

  function setCategoryGroupSelection(groupId: string, selected: boolean) {
    setCategoryIdsSelection(categoryIdsByGroup.get(groupId) ?? [], selected);
  }
</script>

{#if enabled}
  <div class="field">
    <div class="flex items-center justify-between">
      <span>Categories</span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="cursor-pointer text-xs text-muted-foreground hover:underline"
          onclick={selectAll}>All</button
        >
        <button
          type="button"
          class="cursor-pointer text-xs text-muted-foreground hover:underline"
          onclick={selectNone}>None</button
        >
      </div>
    </div>
    <Select.Root type="multiple" value={selectedIds} onValueChange={handleChange}>
      <Select.Trigger class="w-full">
        {triggerLabel}
      </Select.Trigger>
      <Select.Content>
        <div class="sticky top-0 z-10 border-b border-border bg-popover px-2 py-1.5">
          <div class="relative">
            <Search
              class="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground"
              size={14}
            />
            <input
              type="text"
              placeholder="Search categories..."
              class="w-full rounded-sm border border-input bg-background py-1 pr-2 pl-7 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={query}
              oninput={(e) => (query = e.currentTarget.value)}
              onkeydown={(e) => {
                if (
                  ['ArrowDown', 'ArrowUp', 'Enter', 'Home', 'End', 'PageUp', 'PageDown'].includes(
                    e.key
                  )
                ) {
                  e.stopPropagation();
                }
              }}
            />
          </div>
        </div>
        {#if filteredGroups.length === 0 && !uncategorizedMatch}
          <div class="px-2 py-3 text-sm text-muted-foreground">No matching categories.</div>
        {:else}
          {#if uncategorizedMatch}
            <Select.Group>
              <Select.GroupHeading
                class="flex w-full items-center gap-2 rounded-sm py-1.5 pr-2 pl-2 text-sm text-foreground"
              >
                <span class="min-w-0 flex-1 truncate whitespace-nowrap">Uncategorized</span>
                <div class="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label="Select all Uncategorized"
                    disabled={areCategoryIdsSelected([UNCATEGORIZED_CATEGORY_ID])}
                    class="cursor-pointer text-xs text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-default disabled:no-underline disabled:opacity-40"
                    onclick={(event) => {
                      event.stopPropagation();
                      setCategoryIdsSelection([UNCATEGORIZED_CATEGORY_ID], true);
                    }}>All</button
                  >
                  <button
                    type="button"
                    aria-label="Deselect all Uncategorized"
                    disabled={areNoCategoryIdsSelected([UNCATEGORIZED_CATEGORY_ID])}
                    class="cursor-pointer text-xs text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-default disabled:no-underline disabled:opacity-40"
                    onclick={(event) => {
                      event.stopPropagation();
                      setCategoryIdsSelection([UNCATEGORIZED_CATEGORY_ID], false);
                    }}>None</button
                  >
                </div>
              </Select.GroupHeading>
              <Select.Item value={UNCATEGORIZED_CATEGORY_ID} label="Uncategorized" class="pl-6">
                Uncategorized
              </Select.Item>
            </Select.Group>
          {/if}
          {#each filteredGroups as group (group.id)}
            {@const groupCategoryIds = categoryIdsByGroup.get(group.id) ?? []}
            <Select.Group>
              <Select.GroupHeading
                class="flex w-full items-center gap-2 rounded-sm py-1.5 pr-2 pl-2 text-sm text-foreground"
              >
                <span class="min-w-0 flex-1 truncate whitespace-nowrap">{group.name}</span>
                <div class="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Select all ${group.name}`}
                    disabled={areCategoryIdsSelected(groupCategoryIds)}
                    class="cursor-pointer text-xs text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-default disabled:no-underline disabled:opacity-40"
                    onclick={(event) => {
                      event.stopPropagation();
                      setCategoryGroupSelection(group.id, true);
                    }}>All</button
                  >
                  <button
                    type="button"
                    aria-label={`Deselect all ${group.name}`}
                    disabled={areNoCategoryIdsSelected(groupCategoryIds)}
                    class="cursor-pointer text-xs text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-default disabled:no-underline disabled:opacity-40"
                    onclick={(event) => {
                      event.stopPropagation();
                      setCategoryGroupSelection(group.id, false);
                    }}>None</button
                  >
                </div>
              </Select.GroupHeading>
              {#each group.categories as category (category.id)}
                <Select.Item value={category.id} label={category.name} class="pl-6">
                  <span class="flex items-center gap-2">
                    <span class="truncate">{category.name}</span>
                    {#if category.hidden}
                      <span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Hidden
                      </span>
                    {/if}
                    {#if category.deleted}
                      <span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Deleted
                      </span>
                    {/if}
                  </span>
                </Select.Item>
              {/each}
            </Select.Group>
          {/each}
        {/if}
      </Select.Content>
    </Select.Root>
  </div>
{/if}
