<script lang="ts">
  import { Maximize2, Minimize2, PanelRightOpen } from '@lucide/svelte';
  import type { ChartConfig, ChartSize } from '$lib/app/chart-config';
  import { cn } from '$lib/utils';

  let {
    chart,
    onChange
  }: {
    chart: ChartConfig;
    onChange: (chart: ChartConfig) => void;
  } = $props();

  const options = [
    { value: 'small', label: 'Small', icon: Minimize2 },
    { value: 'medium', label: 'Medium', icon: PanelRightOpen },
    { value: 'large', label: 'Large', icon: Maximize2 }
  ] satisfies Array<{ value: ChartSize; label: string; icon: typeof Minimize2 }>;

  function setSize(size: ChartSize) {
    onChange({ ...chart, size });
  }
</script>

<div class="field">
  <span>Size</span>
  <div class="grid grid-cols-3 overflow-hidden rounded-md border border-border bg-background">
    {#each options as option (option.value)}
      {@const Icon = option.icon}
      <button
        type="button"
        class={cn(
          'flex min-h-10 items-center justify-center gap-2 border-r border-border px-2 text-sm transition last:border-r-0 hover:bg-muted',
          chart.size === option.value && 'bg-primary text-primary-foreground hover:bg-primary'
        )}
        aria-pressed={chart.size === option.value}
        onclick={() => setSize(option.value)}
      >
        <Icon size={15} />
        <span>{option.label}</span>
      </button>
    {/each}
  </div>
</div>
