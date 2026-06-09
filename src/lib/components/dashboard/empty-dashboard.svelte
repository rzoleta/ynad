<script lang="ts">
  import { BarChart3, CircleDollarSign, Landmark, Sigma } from '@lucide/svelte';
  import type { ChartType } from '$lib/app/chart-config';

  let {
    onAddChart,
    disabled = false
  }: {
    onAddChart: (type: ChartType) => void;
    disabled?: boolean;
  } = $props();

  const options = [
    { type: 'balance', label: 'Balance', icon: Landmark },
    { type: 'spending', label: 'Spending', icon: BarChart3 },
    { type: 'income', label: 'Income', icon: CircleDollarSign },
    { type: 'number', label: 'Number', icon: Sigma }
  ] satisfies Array<{ type: ChartType; label: string; icon: typeof BarChart3 }>;
</script>

<div
  class="grid min-h-[520px] place-items-center rounded-lg border border-dashed border-border bg-card"
>
  <div class="max-w-md p-6 text-center">
    <div class="mx-auto grid size-12 place-items-center rounded-md bg-primary/10 text-primary">
      <BarChart3 size={24} />
    </div>
    <h1 class="mt-5 text-2xl font-semibold">No charts yet</h1>
    <p class="mt-2 text-muted-foreground">Create the first dashboard card for this budget.</p>
    <div class="mt-6 flex flex-wrap justify-center gap-2">
      {#each options as option (option.type)}
        {@const Icon = option.icon}
        <button
          type="button"
          class={option.type === 'number' ? 'button secondary' : 'button primary'}
          {disabled}
          onclick={() => onAddChart(option.type)}
        >
          <Icon size={16} />
          {option.label}
        </button>
      {/each}
    </div>
  </div>
</div>
