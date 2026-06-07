<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { useQueryClient } from '@tanstack/svelte-query';
  import { writeSelectedBudgetId } from '$lib/app/budget-selection';
  import * as Select from '$lib/components/ui/select/index.js';
  import type { BudgetEntity } from '$lib/domain/types';
  import { getYnabErrorMessage } from '$lib/ynab/errors';

  let {
    budgets = [],
    selectedBudgetId = null,
    loading = false,
    error = null
  }: {
    budgets?: BudgetEntity[];
    selectedBudgetId?: string | null;
    loading?: boolean;
    error?: unknown;
  } = $props();

  const queryClient = useQueryClient();
  const selectedBudgetName = $derived(
    budgets.find((budget) => budget.id === selectedBudgetId)?.name ??
      (selectedBudgetId ? 'Unknown budget' : 'No budget selected')
  );
  const disabled = $derived(loading || Boolean(error) || budgets.length === 0);

  async function selectBudget(nextBudgetId: string) {
    if (!nextBudgetId || nextBudgetId === selectedBudgetId) return;

    writeSelectedBudgetId(nextBudgetId);
    queryClient.removeQueries({ queryKey: ['ynab', 'snapshot'] });
    await queryClient.invalidateQueries({ queryKey: ['ynab', 'budget-selection'] });
    await goto(resolve('/app'));
  }
</script>

<div>
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 class="text-lg font-semibold">Active budget</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Dashboard cards are stored separately for each YNAB budget.
      </p>
    </div>
    {#if selectedBudgetId}
      <span class="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
        {selectedBudgetName}
      </span>
    {/if}
  </div>

  {#if loading}
    <p class="mt-4 text-sm text-muted-foreground">Loading budgets...</p>
  {:else if error}
    <p class="mt-4 text-sm text-danger">{getYnabErrorMessage(error)}</p>
  {:else if budgets.length === 0}
    <p class="mt-4 text-sm text-muted-foreground">No budgets were returned by YNAB.</p>
  {:else}
    <label class="field mt-4 max-w-sm">
      <span>Budget</span>
      <Select.Root
        type="single"
        value={selectedBudgetId ?? ''}
        {disabled}
        onValueChange={selectBudget}
      >
        <Select.Trigger class="w-full">{selectedBudgetName}</Select.Trigger>
        <Select.Content>
          {#each budgets as budget (budget.id)}
            <Select.Item value={budget.id} label={budget.name}>{budget.name}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </label>
  {/if}
</div>
