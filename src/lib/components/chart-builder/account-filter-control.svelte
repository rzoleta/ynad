<script lang="ts">
  import type { ChartConfig } from '$lib/app/chart-config';
  import type { AccountEntity } from '$lib/domain/types';
  import { cn } from '$lib/utils';
  import {
    getAccountGroupKey,
    groupAccounts,
    selectedIdSet,
    toggleSelectedId
  } from './filter-summary';

  let {
    chart,
    accounts = [],
    onChange
  }: {
    chart: ChartConfig;
    accounts?: AccountEntity[];
    onChange: (chart: ChartConfig) => void;
  } = $props();

  const groups = $derived(groupAccounts(accounts));
  const selectedIds = $derived(selectedIdSet(chart.accounts));
  const selectedCount = $derived(
    chart.accounts.mode === 'selected' ? chart.accounts.ids.length : 0
  );

  function setMode(mode: 'all' | 'selected') {
    if (mode === 'all') {
      onChange({ ...chart, accounts: { mode: 'all' } });
      return;
    }

    onChange({
      ...chart,
      accounts: {
        mode: 'selected',
        ids: chart.accounts.mode === 'selected' ? chart.accounts.ids : []
      }
    });
  }

  function toggleAccount(accountId: string) {
    onChange({ ...chart, accounts: toggleSelectedId(chart.accounts, accountId) });
  }

  function selectAccounts(accountIds: string[]) {
    onChange({ ...chart, accounts: { mode: 'selected', ids: accountIds } });
  }
</script>

<div class="space-y-3">
  <div class="field">
    <span>Accounts</span>
    <div class="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-background">
      <button
        type="button"
        class={cn(
          'min-h-10 border-r border-border px-3 text-sm transition hover:bg-muted',
          chart.accounts.mode === 'all' && 'bg-primary text-primary-foreground hover:bg-primary'
        )}
        aria-pressed={chart.accounts.mode === 'all'}
        onclick={() => setMode('all')}
      >
        All accounts
      </button>
      <button
        type="button"
        class={cn(
          'min-h-10 px-3 text-sm transition hover:bg-muted',
          chart.accounts.mode === 'selected' &&
            'bg-primary text-primary-foreground hover:bg-primary'
        )}
        aria-pressed={chart.accounts.mode === 'selected'}
        onclick={() => setMode('selected')}
      >
        Selected{selectedCount ? ` (${selectedCount})` : ''}
      </button>
    </div>
  </div>

  {#if chart.accounts.mode === 'selected'}
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="button secondary min-h-8 px-3 py-1 text-xs"
        onclick={() =>
          selectAccounts(
            accounts
              .filter((account) => getAccountGroupKey(account) === 'cash')
              .map((account) => account.id)
          )}
      >
        All Cash
      </button>
      <button
        type="button"
        class="button secondary min-h-8 px-3 py-1 text-xs"
        onclick={() =>
          selectAccounts(
            accounts
              .filter((account) => getAccountGroupKey(account) === 'tracking')
              .map((account) => account.id)
          )}
      >
        All Tracking
      </button>
      <button
        type="button"
        class="button secondary min-h-8 px-3 py-1 text-xs"
        onclick={() =>
          selectAccounts(
            accounts.filter((account) => !account.closed).map((account) => account.id)
          )}
      >
        All Active
      </button>
    </div>

    <div class="max-h-72 overflow-y-auto rounded-md border border-border bg-background">
      {#if groups.length === 0}
        <p class="p-3 text-sm text-muted-foreground">No accounts loaded.</p>
      {:else}
        {#each groups as group (group.key)}
          <div class="border-b border-border last:border-b-0">
            <div
              class="bg-muted/60 px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              {group.label}
            </div>
            <div class="divide-y divide-border">
              {#each group.accounts as account (account.id)}
                <label
                  class="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/70"
                >
                  <input
                    type="checkbox"
                    class="size-4 accent-primary"
                    checked={selectedIds.has(account.id)}
                    onchange={() => toggleAccount(account.id)}
                  />
                  <span class="min-w-0 flex-1 truncate">{account.name}</span>
                  {#if account.closed}
                    <span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Closed
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
