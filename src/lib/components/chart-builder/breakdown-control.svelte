<script lang="ts">
  import * as Select from '$lib/components/ui/select/index.js';
  import { getBreakdownOptions, type Breakdown, type ChartConfig } from '$lib/app/chart-config';

  let {
    chart,
    onChange
  }: {
    chart: ChartConfig;
    onChange: (chart: ChartConfig) => void;
  } = $props();

  const disabled = $derived(
    chart.visualization === 'number' || (chart.visualization === 'pie' && chart.type === 'balance')
  );
  const options = $derived(getBreakdownOptions(chart.type, chart.visualization));
  const label = $derived(
    options.find((option) => option.value === (chart.breakdown ?? 'none'))?.label ?? 'None'
  );

  function setBreakdown(value: string) {
    if (disabled) return;
    onChange({ ...chart, breakdown: value as Breakdown });
  }
</script>

{#if !disabled}
  <div class="field">
    <span>Breakdown</span>
    <Select.Root type="single" value={chart.breakdown ?? 'none'} onValueChange={setBreakdown}>
      <Select.Trigger class="w-full">{label}</Select.Trigger>
      <Select.Content>
        {#each options as option (option.value)}
          <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>
{/if}
