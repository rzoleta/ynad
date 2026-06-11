<script lang="ts">
  import { Search } from '@lucide/svelte';
  import * as Select from '$lib/components/ui/select/index.js';
  import type { ChartConfig } from '$lib/app/chart-config';
  import type { PayeeEntity } from '$lib/domain/types';
  import { buildPayeeOptions, payeeKey } from './filter-summary';

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
  const options = $derived(buildPayeeOptions(payees, chart.payees));
  const allKeys = $derived(options.map((payee) => payee.key));
  const selectedKeys = $derived(
    chart.payees?.mode === 'all' || !chart.payees ? allKeys : chart.payees.payees.map(payeeKey)
  );

  const filteredOptions = $derived(
    query.trim() === ''
      ? options
      : options.filter((payee) => payee.name.toLowerCase().includes(query.trim().toLowerCase()))
  );

  const triggerLabel = $derived(
    selectedKeys.length === allKeys.length
      ? 'All payees'
      : selectedKeys.length === 0
        ? 'No payees'
        : `${selectedKeys.length} payee${selectedKeys.length === 1 ? '' : 's'}`
  );

  function handleChange(nextKeys: string[]) {
    if (!enabled) return;
    const nextPayees = nextKeys.map((key) => {
      const option = options.find((p) => p.key === key);
      return { id: option?.id ?? null, name: option?.name ?? '' };
    });
    onChange({ ...chart, payees: { mode: 'selected', payees: nextPayees } });
  }

  function selectAll() {
    if (!enabled) return;
    const nextPayees = options.map((payee) => ({ id: payee.id, name: payee.name }));
    onChange({ ...chart, payees: { mode: 'selected', payees: nextPayees } });
  }

  function selectNone() {
    if (!enabled) return;
    onChange({ ...chart, payees: { mode: 'selected', payees: [] } });
  }
</script>

{#if enabled}
  <div class="field">
    <div class="flex items-center justify-between">
      <span>Payees</span>
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
    <Select.Root type="multiple" value={selectedKeys} onValueChange={handleChange}>
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
              placeholder="Search payees..."
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
        {#if filteredOptions.length === 0}
          <div class="px-2 py-3 text-sm text-muted-foreground">No matching payees.</div>
        {:else}
          {#each filteredOptions as payee (payee.key)}
            <Select.Item value={payee.key} label={payee.name}>
              <span class="flex items-center gap-2">
                <span class="truncate">{payee.name}</span>
                {#if payee.missing}
                  <span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Saved
                  </span>
                {:else if payee.transactionCount}
                  <span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {payee.transactionCount}
                  </span>
                {/if}
              </span>
            </Select.Item>
          {/each}
        {/if}
      </Select.Content>
    </Select.Root>
  </div>
{/if}
