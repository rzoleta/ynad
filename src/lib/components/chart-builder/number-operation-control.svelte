<script lang="ts">
  import * as Select from '$lib/components/ui/select/index.js';
  import type { ChartConfig, ChartType, NumberOperation } from '$lib/app/chart-config';

  let {
    chart,
    onChange
  }: {
    chart: ChartConfig;
    onChange: (chart: ChartConfig) => void;
  } = $props();

  const operationOptions = {
    balance: [
      { value: 'current', label: 'Current' },
      { value: 'average', label: 'Average' },
      { value: 'median', label: 'Median' }
    ],
    spending: [
      { value: 'total', label: 'Total' },
      { value: 'average', label: 'Average' },
      { value: 'median', label: 'Median' }
    ],
    income: [
      { value: 'total', label: 'Total' },
      { value: 'average', label: 'Average' },
      { value: 'median', label: 'Median' }
    ]
  } satisfies Record<ChartType, Array<{ value: NumberOperation; label: string }>>;

  const disabled = $derived(chart.visualization !== 'number');
  const operation = $derived(chart.numberOperation ?? operationOptions[chart.type][0].value);
  const operationLabel = $derived(
    operationOptions[chart.type].find((option) => option.value === operation)?.label ?? 'Operation'
  );

  function setOperation(value: string) {
    if (disabled) return;
    onChange({ ...chart, numberOperation: value as NumberOperation });
  }
</script>

{#if !disabled}
  <label class="field">
    <span>Operation</span>
    <Select.Root type="single" value={operation} {disabled} onValueChange={setOperation}>
      <Select.Trigger class="w-full">{operationLabel}</Select.Trigger>
      <Select.Content>
        {#each operationOptions[chart.type] as option (option.value)}
          <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </label>
{/if}
