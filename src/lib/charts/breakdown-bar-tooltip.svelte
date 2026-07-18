<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Tooltip, type ChartState } from 'layerchart';

  type BreakdownBarDatum = Record<string, string | number> & {
    bucketId: string;
    label: string;
  };

  type BreakdownBarHighlight = {
    bucketId: string;
    groupKey: string;
  };

  type SegmentTooltip = {
    kind: 'segment';
    bucketId: string;
    groupKey: string;
    label: string;
    value: number;
    color?: string;
  };

  type TotalTooltip = {
    kind: 'total';
    label: string;
    value: number;
  };

  let {
    context,
    formatValue,
    onHighlightChange
  }: {
    context: ChartState<BreakdownBarDatum>;
    formatValue: (value: number) => string;
    onHighlightChange: (highlight: BreakdownBarHighlight | null) => void;
  } = $props();

  const activeTooltip = $derived.by<SegmentTooltip | TotalTooltip | null>(() => {
    const data = context.tooltip.data as BreakdownBarDatum | null;
    if (!data) return null;

    const pointerY = context.tooltip.y - context.padding.top;
    const segments: Array<{
      key: string;
      label: string;
      value: number;
      color?: string;
      top: number;
      bottom: number;
    }> = [];

    for (const series of context.series.visibleSeries) {
      const stack = context.series.getStackValue(series.key, data);
      const value = data[series.key];
      if (!stack || typeof value !== 'number' || value === 0) continue;

      const firstY = context.yScale(stack[0]);
      const secondY = context.yScale(stack[1]);
      if (typeof firstY !== 'number' || typeof secondY !== 'number') continue;

      segments.push({
        key: series.key,
        label: series.label ?? series.key,
        value,
        color: series.color,
        top: Math.min(firstY, secondY),
        bottom: Math.max(firstY, secondY)
      });
    }

    if (segments.length === 0) return null;

    // Later series are painted on top, so prefer the last match at shared or overlapping edges.
    let hoveredSegment: (typeof segments)[number] | undefined;
    for (const segment of segments) {
      if (pointerY >= segment.top && pointerY <= segment.bottom) {
        hoveredSegment = segment;
      }
    }

    if (hoveredSegment) {
      return {
        kind: 'segment',
        bucketId: data.bucketId,
        groupKey: hoveredSegment.key,
        label: hoveredSegment.label,
        value: hoveredSegment.value,
        color: hoveredSegment.color
      };
    }

    const barTop = Math.min(...segments.map((segment) => segment.top));
    if (pointerY < barTop) {
      return {
        kind: 'total',
        label: 'Total',
        value: segments.reduce((total, segment) => total + segment.value, 0)
      };
    }

    return null;
  });

  $effect(() => {
    onHighlightChange(
      activeTooltip?.kind === 'segment'
        ? { bucketId: activeTooltip.bucketId, groupKey: activeTooltip.groupKey }
        : null
    );
  });

  onDestroy(() => onHighlightChange(null));
</script>

{#if activeTooltip}
  <Tooltip.Root {context} x="data" y="pointer">
    <Tooltip.Header value={(context.tooltip.data as BreakdownBarDatum).label} />
    <Tooltip.List>
      <Tooltip.Item
        label={activeTooltip.label}
        value={formatValue(activeTooltip.value)}
        color={activeTooltip.kind === 'segment' ? activeTooltip.color : undefined}
        valueAlign="right"
      />
    </Tooltip.List>
  </Tooltip.Root>
{/if}
