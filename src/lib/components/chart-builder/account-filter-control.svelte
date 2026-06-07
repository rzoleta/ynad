<script lang="ts">
  import { Search } from '@lucide/svelte';
  import * as Select from '$lib/components/ui/select/index.js';
  import type { ChartConfig } from '$lib/app/chart-config';
  import type { AccountEntity } from '$lib/domain/types';
  import { groupAccounts } from './filter-summary';

  let {
    chart,
    accounts = [],
    onChange
  }: {
    chart: ChartConfig;
    accounts?: AccountEntity[];
    onChange: (chart: ChartConfig) => void;
  } = $props();

  let query = $state('');

  const groups = $derived(groupAccounts(accounts));
  const allIds = $derived(accounts.map((account) => account.id));
  const selectedIds = $derived(chart.accounts.mode === 'all' ? allIds : chart.accounts.ids);

  const filteredGroups = $derived(
    query.trim() === ''
      ? groups
      : groups
          .map((group) => ({
            ...group,
            accounts: group.accounts.filter((account) =>
              account.name.toLowerCase().includes(query.trim().toLowerCase())
            )
          }))
          .filter((group) => group.accounts.length > 0)
  );

  const triggerLabel = $derived(
    selectedIds.length === allIds.length
      ? 'All accounts'
      : selectedIds.length === 0
        ? 'No accounts'
        : `${selectedIds.length} account${selectedIds.length === 1 ? '' : 's'}`
  );

  function handleChange(nextIds: string[]) {
    onChange({ ...chart, accounts: { mode: 'selected', ids: nextIds } });
  }

  function selectAll() {
    onChange({ ...chart, accounts: { mode: 'selected', ids: allIds } });
  }

  function selectNone() {
    onChange({ ...chart, accounts: { mode: 'selected', ids: [] } });
  }
</script>

<div class="field">
  <div class="flex items-center justify-between">
    <span>Accounts</span>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="text-xs text-muted-foreground hover:underline"
        onclick={selectAll}>All</button
      >
      <button
        type="button"
        class="text-xs text-muted-foreground hover:underline"
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
            placeholder="Search accounts..."
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
      {#if filteredGroups.length === 0}
        <div class="px-2 py-3 text-sm text-muted-foreground">No matching accounts.</div>
      {:else}
        {#each filteredGroups as group (group.key)}
          <Select.Group>
            <Select.GroupHeading>{group.label}</Select.GroupHeading>
            {#each group.accounts as account (account.id)}
              <Select.Item value={account.id} label={account.name}>
                <span class="flex items-center gap-2">
                  <span class="truncate">{account.name}</span>
                  {#if account.closed}
                    <span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Closed
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
