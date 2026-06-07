<script lang="ts">
  import { Search } from '@lucide/svelte';
  import * as Select from '$lib/components/ui/select/index.js';
  import type { ChartConfig } from '$lib/app/chart-config';
  import { UNCATEGORIZED_CATEGORY_ID } from '$lib/domain/categories';
  import type { CategoryEntity, CategoryGroupEntity } from '$lib/domain/types';
  import { cn } from '$lib/utils';
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
  const allIds = $derived([
    UNCATEGORIZED_CATEGORY_ID,
    ...categories.map((category) => category.id)
  ]);
  const selectedIds = $derived(
    chart.categories?.mode === 'all' || !chart.categories ? allIds : chart.categories.ids
  );

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
</script>

<div class={cn('field', !enabled && 'opacity-60')}>
  <div class="flex items-center justify-between">
    <span>Categories</span>
    <div class="flex items-center gap-2">
      <button type="button" class="text-xs text-muted-foreground hover:underline" onclick={selectAll}
        >All</button
      >
      <button type="button" class="text-xs text-muted-foreground hover:underline" onclick={selectNone}
        >None</button
      >
    </div>
  </div>
  <Select.Root type="multiple" value={selectedIds} disabled={!enabled} onValueChange={handleChange}>
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
              if (['ArrowDown', 'ArrowUp', 'Enter', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
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
            <Select.GroupHeading>Uncategorized</Select.GroupHeading>
            <Select.Item value={UNCATEGORIZED_CATEGORY_ID} label="Uncategorized">
              Uncategorized
            </Select.Item>
          </Select.Group>
        {/if}
        {#each filteredGroups as group (group.id)}
          <Select.Group>
            <Select.GroupHeading>{group.name}</Select.GroupHeading>
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
