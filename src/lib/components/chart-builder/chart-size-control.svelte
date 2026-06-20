<script lang="ts">
  import { Maximize2, Minimize2, PanelRightOpen } from '@lucide/svelte';
  import type { ChartConfig, ChartSize } from '$lib/app/chart-config';
  import { cn } from '$lib/utils';

  let {
    chart,
    onChange,
    compact = false
  }: {
    chart: ChartConfig;
    onChange: (chart: ChartConfig) => void;
    compact?: boolean;
  } = $props();

  const options = [
    { value: 'small', label: 'Small', short: 'S', icon: Minimize2 },
    { value: 'medium', label: 'Medium', short: 'M', icon: PanelRightOpen },
    { value: 'large', label: 'Large', short: 'L', icon: Maximize2 }
  ] satisfies Array<{ value: ChartSize; label: string; short: string; icon: typeof Minimize2 }>;

  function setSize(size: ChartSize) {
    onChange({ ...chart, size });
  }
</script>

<div class="field">
  <span class={compact ? 'text-xs text-muted-foreground' : undefined}>Size</span>
  <div
    class={cn(
      'grid grid-cols-3 overflow-hidden rounded-md border border-border bg-background',
      compact && 'w-[6rem]'
    )}
  >
    {#each options as option (option.value)}
      {@const Icon = option.icon}
      <button
        type="button"
        class={cn(
          'flex cursor-pointer items-center justify-center gap-1 border-r border-border transition last:border-r-0 hover:bg-muted',
          compact ? 'h-8 px-1.5 text-xs' : 'min-h-10 gap-2 px-4 text-sm',
          chart.size === option.value && 'bg-primary text-primary-foreground hover:bg-primary'
        )}
        aria-pressed={chart.size === option.value}
        onclick={() => setSize(option.value)}
      >
        <span>{option.short}</span>
      </button>
    {/each}
  </div>
</div>
