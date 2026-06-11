<script lang="ts">
  import * as Select from '$lib/components/ui/select/index.js';
  import type { ChartConfig, Granularity } from '$lib/app/chart-config';

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
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ] satisfies Array<{ value: Granularity; label: string }>;

  const disabled = $derived(chart.type === 'number' || chart.visualization === 'pie');
  const label = $derived(
    options.find((option) => option.value === chart.granularity)?.label ?? 'Not used'
  );

  function setGranularity(value: string) {
    if (disabled) return;
    onChange({ ...chart, granularity: value as Granularity });
  }
</script>

{#if !disabled}
  <div class="field">
    <span class={compact ? 'text-xs text-muted-foreground' : undefined}>Period</span>
    <Select.Root type="single" value={chart.granularity ?? ''} onValueChange={setGranularity}>
      <Select.Trigger class={compact ? 'w-[6.75rem]' : 'w-full'} size={compact ? 'sm' : 'default'}>
        {label}
      </Select.Trigger>
      <Select.Content>
        {#each options as option (option.value)}
          <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>
{/if}
