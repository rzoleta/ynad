<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HTMLAttributes } from 'svelte/elements';
  import { setChartContext, type ChartConfig } from './chart-utils';

  const uid = $props.id();

  let {
    id = uid,
    class: className,
    children,
    config,
    ...restProps
  }: HTMLAttributes<HTMLElement> & {
    config: ChartConfig;
  } = $props();

  const chartId = $derived(`chart-${id || uid.replace(/:/g, '')}`);
  const chartStyle = $derived(
    Object.entries(config)
      .map(([key, item]) => {
        const color = item.color ?? item.theme?.light;
        return color ? `--color-${key}: ${color}` : '';
      })
      .filter(Boolean)
      .join('; ')
  );

  setChartContext({
    get config() {
      return config;
    }
  });
</script>

<div
  data-chart={chartId}
  data-slot="chart"
  class={cn(
    'flex aspect-video min-h-[220px] w-full justify-center overflow-visible text-xs',
    '[&_.lc-axis-tick]:stroke-0',
    '[&_.lc-axis-tick-label]:fill-muted-foreground [&_.lc-axis-tick-label]:font-normal',
    '[&_.lc-grid-line]:stroke-border',
    '[&_.lc-line]:stroke-[2.5px]',
    '[&_.lc-spline-path]:stroke-[2.5px]',
    '[&_.lc-highlight-point]:stroke-background',
    '[&_.lc-labels-text:not([fill])]:fill-foreground',
    '[&_text]:stroke-transparent',
    className
  )}
  style={chartStyle}
  {...restProps}
>
  {@render children?.()}
</div>
