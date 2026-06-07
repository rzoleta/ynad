<script lang="ts">
  import type { ChartConfig } from '$lib/app/chart-config';
  import { UNCATEGORIZED_CATEGORY_ID } from '$lib/domain/categories';
  import type { CategoryEntity, CategoryGroupEntity } from '$lib/domain/types';
  import { cn } from '$lib/utils';
  import { groupCategories, selectedIdSet, toggleSelectedId } from './filter-summary';

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

  const enabled = $derived(chart.type === 'spending');
  const groups = $derived(groupCategories(categoryGroups, categories));
  const selectedIds = $derived(selectedIdSet(chart.categories));
  const selectedCount = $derived(
    chart.categories?.mode === 'selected' ? chart.categories.ids.length : 0
  );

  function setMode(mode: 'all' | 'selected') {
    if (!enabled) return;
    if (mode === 'all') {
      onChange({ ...chart, categories: { mode: 'all' } });
      return;
    }

    onChange({
      ...chart,
      categories: {
        mode: 'selected',
        ids: chart.categories?.mode === 'selected' ? chart.categories.ids : []
      }
    });
  }

  function toggleCategory(categoryId: string) {
    if (!enabled) return;
    onChange({ ...chart, categories: toggleSelectedId(chart.categories, categoryId) });
  }

  function setGroup(categoryIds: string[], select: boolean) {
    if (!enabled) return;
    const ids = selectedIdSet(chart.categories);
    for (const id of categoryIds) {
      if (select) ids.add(id);
      else ids.delete(id);
    }
    onChange({ ...chart, categories: { mode: 'selected', ids: [...ids] } });
  }
</script>

<div class={cn('space-y-3', !enabled && 'opacity-60')}>
  <div class="field">
    <span>Categories</span>
    <div class="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-background">
      <button
        type="button"
        class={cn(
          'min-h-10 border-r border-border px-3 text-sm transition hover:bg-muted disabled:cursor-not-allowed',
          chart.categories?.mode !== 'selected' &&
            'bg-primary text-primary-foreground hover:bg-primary'
        )}
        disabled={!enabled}
        aria-pressed={chart.categories?.mode !== 'selected'}
        onclick={() => setMode('all')}
      >
        All categories
      </button>
      <button
        type="button"
        class={cn(
          'min-h-10 px-3 text-sm transition hover:bg-muted disabled:cursor-not-allowed',
          chart.categories?.mode === 'selected' &&
            'bg-primary text-primary-foreground hover:bg-primary'
        )}
        disabled={!enabled}
        aria-pressed={chart.categories?.mode === 'selected'}
        onclick={() => setMode('selected')}
      >
        Selected{selectedCount ? ` (${selectedCount})` : ''}
      </button>
    </div>
  </div>

  {#if enabled && chart.categories?.mode === 'selected'}
    <div class="max-h-72 overflow-y-auto rounded-md border border-border bg-background">
      <div class="border-b border-border">
        <label
          class="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/70"
        >
          <input
            type="checkbox"
            class="size-4 accent-primary"
            checked={selectedIds.has(UNCATEGORIZED_CATEGORY_ID)}
            onchange={() => toggleCategory(UNCATEGORIZED_CATEGORY_ID)}
          />
          <span class="min-w-0 flex-1 truncate">Uncategorized</span>
        </label>
      </div>

      {#if groups.length === 0}
        <p class="p-3 text-sm text-muted-foreground">No categories loaded.</p>
      {:else}
        {#each groups as group (group.id)}
          {@const categoryIds = group.categories.map((category) => category.id)}
          {@const groupSelected = categoryIds.every((id) => selectedIds.has(id))}
          <div class="border-b border-border last:border-b-0">
            <div
              class="flex items-center justify-between gap-3 bg-muted/60 px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              <span>{group.name}</span>
              <button
                type="button"
                class="rounded-md px-2 py-1 text-xs tracking-normal normal-case hover:bg-background"
                onclick={() => setGroup(categoryIds, !groupSelected)}
              >
                {groupSelected ? 'Clear group' : 'Select group'}
              </button>
            </div>
            <div class="divide-y divide-border">
              {#each group.categories as category (category.id)}
                <label
                  class="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/70"
                >
                  <input
                    type="checkbox"
                    class="size-4 accent-primary"
                    checked={selectedIds.has(category.id)}
                    onchange={() => toggleCategory(category.id)}
                  />
                  <span class="min-w-0 flex-1 truncate">{category.name}</span>
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
                </label>
              {/each}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
