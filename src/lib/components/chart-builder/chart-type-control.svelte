<script lang="ts">
  import { ChartColumn, Hash, ReceiptText, Wallet } from '@lucide/svelte';
  import type { ChartConfig, ChartType } from '$lib/app/chart-config';
  import { cn } from '$lib/utils';

  let {
    chart,
    onChange
  }: {
    chart: ChartConfig;
    onChange: (chart: ChartConfig) => void;
  } = $props();

  const options = [
    { value: 'balance', label: 'Balance', icon: Wallet },
    { value: 'spending', label: 'Spending', icon: ReceiptText },
    { value: 'income', label: 'Income', icon: ChartColumn },
    { value: 'number', label: 'Number', icon: Hash }
  ] satisfies Array<{ value: ChartType; label: string; icon: typeof Wallet }>;

  function setType(type: ChartType) {
    onChange({ ...chart, type });
  }
</script>

<div class="field">
  <span>Type</span>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
    {#each options as option (option.value)}
      {@const Icon = option.icon}
      <button
        type="button"
        class={cn(
          'flex min-h-20 cursor-pointer flex-col items-start justify-between rounded-md border border-border bg-background p-3 text-left text-sm transition hover:bg-muted',
          chart.type === option.value &&
            'border-border bg-primary text-primary-foreground hover:bg-primary'
        )}
        aria-pressed={chart.type === option.value}
        onclick={() => setType(option.value)}
      >
        <Icon size={18} />
        <span class="font-medium">{option.label}</span>
      </button>
    {/each}
  </div>
</div>
