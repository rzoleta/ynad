<script lang="ts">
  import { Check, Search } from '@lucide/svelte';
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

  const enabled = $derived(chart.type === 'spending');
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

  function toggleCategoryIds(categoryIds: string[]) {
    if (!enabled) return;
    const nextIds = areCategoryIdsSelected(categoryIds)
      ? selectedIds.filter((id) => !categoryIds.includes(id))
      : [...new Set([...selectedIds, ...categoryIds])];

    onChange({
      ...chart,
      categories: { mode: 'selected', ids: nextIds }
    });
  }

  function isCategoryGroupSelected(groupId: string) {
    return areCategoryIdsSelected(categoryIdsByGroup.get(groupId) ?? []);
  }

  function toggleCategoryGroup(groupId: string) {
    toggleCategoryIds(categoryIdsByGroup.get(groupId) ?? []);
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
      <Select.Content class="max-h-[300px] overflow-y-auto">
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
                class="relative flex w-full items-center rounded-sm py-1.5 pr-8 pl-2 text-sm text-foreground"
              >
                {@const uncategorizedSelected = areCategoryIdsSelected([UNCATEGORIZED_CATEGORY_ID])}
                <span class="flex flex-1 shrink-0 gap-2 whitespace-nowrap">Uncategorized</span>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={uncategorizedSelected}
                  aria-label={uncategorizedSelected
                    ? 'Deselect Uncategorized'
                    : 'Select Uncategorized'}
                  class="absolute end-2 flex size-3.5 cursor-pointer items-center justify-center rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onclick={(event) => {
                    event.stopPropagation();
                    toggleCategoryIds([UNCATEGORIZED_CATEGORY_ID]);
                  }}
                >
                  {#if uncategorizedSelected}
                    <Check class="size-4" />
                  {/if}
                </button>
              </Select.GroupHeading>
              <Select.Item value={UNCATEGORIZED_CATEGORY_ID} label="Uncategorized">
                Uncategorized
              </Select.Item>
            </Select.Group>
          {/if}
          {#each filteredGroups as group (group.id)}
            <Select.Group>
              <Select.GroupHeading
                class="relative flex w-full items-center rounded-sm py-1.5 pr-8 pl-2 text-sm text-foreground"
              >
                {@const groupSelected = isCategoryGroupSelected(group.id)}
                <span class="flex flex-1 shrink-0 gap-2 whitespace-nowrap">{group.name}</span>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={groupSelected}
                  aria-label={groupSelected
                    ? `Deselect all ${group.name}`
                    : `Select all ${group.name}`}
                  class="absolute end-2 flex size-3.5 cursor-pointer items-center justify-center rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onclick={(event) => {
                    event.stopPropagation();
                    toggleCategoryGroup(group.id);
                  }}
                >
                  {#if groupSelected}
                    <Check class="size-4" />
                  {/if}
                </button>
              </Select.GroupHeading>
              {#each group.categories as category (category.id)}
                <Select.Item value={category.id} label={category.name}>
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
