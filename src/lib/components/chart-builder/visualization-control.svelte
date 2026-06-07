<script lang="ts">
  import { ChartColumn, ChartPie, LineChart } from '@lucide/svelte';
  import type { ChartConfig, Visualization } from '$lib/app/chart-config';
  import { cn } from '$lib/utils';

  let {
    chart,
    onChange
  }: {
    chart: ChartConfig;
    onChange: (chart: ChartConfig) => void;
  } = $props();

  const disabled = $derived(chart.type === 'number');
  const options = [
    { value: 'line', label: 'Line', icon: LineChart },
    { value: 'bar', label: 'Bar', icon: ChartColumn },
    { value: 'pie', label: 'Pie', icon: ChartPie }
  ] satisfies Array<{ value: Visualization; label: string; icon: typeof LineChart }>;

  function setVisualization(visualization: Visualization) {
    if (disabled) return;
    onChange({ ...chart, visualization });
  }
</script>

<div class="field">
  <span>Visualization</span>
  <div class="grid grid-cols-3 overflow-hidden rounded-md border border-border bg-background">
    {#each options as option (option.value)}
      {@const Icon = option.icon}
      <button
        type="button"
        class={cn(
          'flex min-h-10 items-center justify-center gap-2 border-r border-border px-2 text-sm transition last:border-r-0 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
          chart.visualization === option.value &&
            'bg-primary text-primary-foreground hover:bg-primary'
        )}
        {disabled}
        aria-pressed={chart.visualization === option.value}
        onclick={() => setVisualization(option.value)}
      >
        <Icon size={15} />
        <span>{option.label}</span>
      </button>
    {/each}
  </div>
</div>
