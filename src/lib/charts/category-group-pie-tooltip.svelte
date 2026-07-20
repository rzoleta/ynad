<script lang="ts">
  import { Tooltip, type ChartState } from 'layerchart';
  import type { BreakdownTooltipItem } from '$lib/charts/types';

  type CategoryGroupPieDatum = {
    key: string;
    label: string;
    value: number;
    fill: string;
    tooltipItems?: BreakdownTooltipItem[];
  };

  let {
    context,
    formatValue
  }: {
    context: ChartState<CategoryGroupPieDatum>;
    formatValue: (value: number) => string;
  } = $props();

  const data = $derived(context.tooltip.data as CategoryGroupPieDatum | null);
</script>

{#if data}
  <Tooltip.Root {context}>
    <Tooltip.List>
      <Tooltip.Item
        label={data.label}
        value={formatValue(data.value)}
        color={data.fill}
        classes={{ label: 'font-medium', value: 'font-medium' }}
        valueAlign="right"
        onpointerenter={() => (context.series.highlightKey = data.key)}
        onpointerleave={() => (context.series.highlightKey = null)}
      />
      {#if data.tooltipItems && data.tooltipItems.length > 0}
        <div
          class="col-span-2 mt-1 grid grid-cols-[1fr_auto] gap-x-2 gap-y-1 border-t border-border pt-2 text-muted-foreground"
        >
          {#each data.tooltipItems as item (item.key)}
            <span class="pl-2 whitespace-nowrap">{item.label}</span>
            <span class="text-right">{formatValue(item.valueMilliunits)}</span>
          {/each}
        </div>
      {/if}
    </Tooltip.List>
  </Tooltip.Root>
{/if}
