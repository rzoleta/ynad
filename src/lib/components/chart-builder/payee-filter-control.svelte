<script lang="ts">
  import { Search } from '@lucide/svelte';
  import type { ChartConfig, PayeeRef } from '$lib/app/chart-config';
  import type { PayeeEntity } from '$lib/domain/types';
  import { cn } from '$lib/utils';
  import {
    buildPayeeOptions,
    payeeKey,
    selectedPayeeSet,
    type PayeeOption
  } from './filter-summary';

  let {
    chart,
    payees = [],
    onChange
  }: {
    chart: ChartConfig;
    payees?: PayeeEntity[];
    onChange: (chart: ChartConfig) => void;
  } = $props();

  let query = $state('');

  const enabled = $derived(chart.type === 'spending' || chart.type === 'income');
  const selectedKeys = $derived(selectedPayeeSet(chart.payees));
  const options = $derived(buildPayeeOptions(payees, chart.payees));
  const visibleOptions = $derived.by(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter(
      (payee) => selectedKeys.has(payee.key) || payee.name.toLowerCase().includes(normalizedQuery)
    );
  });
  const selectedCount = $derived(
    chart.payees?.mode === 'selected' ? chart.payees.payees.length : 0
  );

  function setMode(mode: 'all' | 'selected') {
    if (!enabled) return;
    if (mode === 'all') {
      onChange({ ...chart, payees: { mode: 'all' } });
      return;
    }

    onChange({
      ...chart,
      payees: {
        mode: 'selected',
        payees: chart.payees?.mode === 'selected' ? chart.payees.payees : []
      }
    });
  }

  function togglePayee(payee: PayeeOption) {
    if (!enabled) return;

    const current = chart.payees?.mode === 'selected' ? chart.payees.payees : [];
    const selected = new Set(current.map(payeeKey));
    const next = selected.has(payee.key)
      ? current.filter((item) => payeeKey(item) !== payee.key)
      : [...current, { id: payee.id, name: payee.name } satisfies PayeeRef];

    onChange({ ...chart, payees: { mode: 'selected', payees: next } });
  }

  function updateQuery(event: Event) {
    query = event.currentTarget instanceof HTMLInputElement ? event.currentTarget.value : '';
  }
</script>

<div class={cn('space-y-3', !enabled && 'opacity-60')}>
  <div class="field">
    <span>Payees</span>
    <div class="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-background">
      <button
        type="button"
        class={cn(
          'min-h-10 border-r border-border px-3 text-sm transition hover:bg-muted disabled:cursor-not-allowed',
          chart.payees?.mode !== 'selected' && 'bg-primary text-primary-foreground hover:bg-primary'
        )}
        disabled={!enabled}
        aria-pressed={chart.payees?.mode !== 'selected'}
        onclick={() => setMode('all')}
      >
        All payees
      </button>
      <button
        type="button"
        class={cn(
          'min-h-10 px-3 text-sm transition hover:bg-muted disabled:cursor-not-allowed',
          chart.payees?.mode === 'selected' && 'bg-primary text-primary-foreground hover:bg-primary'
        )}
        disabled={!enabled}
        aria-pressed={chart.payees?.mode === 'selected'}
        onclick={() => setMode('selected')}
      >
        Selected{selectedCount ? ` (${selectedCount})` : ''}
      </button>
    </div>
  </div>

  {#if enabled && chart.payees?.mode === 'selected'}
    <label class="relative block">
      <span class="sr-only">Search payees</span>
      <Search
        class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        size={16}
      />
      <input
        class="min-h-10 w-full rounded-md border border-border bg-background pr-3 pl-9 text-sm"
        placeholder="Search payees"
        value={query}
        oninput={updateQuery}
      />
    </label>

    <div class="max-h-72 overflow-y-auto rounded-md border border-border bg-background">
      {#if visibleOptions.length === 0}
        <p class="p-3 text-sm text-muted-foreground">No matching payees.</p>
      {:else}
        <div class="divide-y divide-border">
          {#each visibleOptions as payee (payee.key)}
            <label
              class="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/70"
            >
              <input
                type="checkbox"
                class="size-4 accent-primary"
                checked={selectedKeys.has(payee.key)}
                onchange={() => togglePayee(payee)}
              />
              <span class="min-w-0 flex-1 truncate">{payee.name}</span>
              {#if payee.missing}
                <span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Saved
                </span>
              {:else if payee.transactionCount}
                <span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {payee.transactionCount}
                </span>
              {/if}
            </label>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
