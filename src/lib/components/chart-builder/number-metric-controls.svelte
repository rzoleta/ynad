<script lang="ts">
  import * as Select from '$lib/components/ui/select/index.js';
  import type {
    ChartConfig,
    Granularity,
    NumberMetric,
    NumberOperation
  } from '$lib/app/chart-config';

  let {
    chart,
    onChange
  }: {
    chart: ChartConfig;
    onChange: (chart: ChartConfig) => void;
  } = $props();

  const metricOptions = [
    { value: 'balance', label: 'Balance' },
    { value: 'spending', label: 'Spending' },
    { value: 'income', label: 'Income' },
    { value: 'net-income', label: 'Net Income' }
  ] satisfies Array<{ value: NumberMetric; label: string }>;

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
    ],
    'net-income': [
      { value: 'total', label: 'Total' },
      { value: 'average', label: 'Average' },
      { value: 'median', label: 'Median' }
    ]
  } satisfies Record<NumberMetric, Array<{ value: NumberOperation; label: string }>>;

  const periodOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ] satisfies Array<{ value: Granularity; label: string }>;

  const disabled = $derived(chart.type !== 'number');
  const metric = $derived(chart.numberMetric ?? 'spending');
  const operation = $derived(chart.numberOperation ?? operationOptions[metric][0].value);
  const period = $derived(chart.numberPeriod ?? 'monthly');
  const operationLabel = $derived(
    operationOptions[metric].find((option) => option.value === operation)?.label ?? 'Operation'
  );
  const metricLabel = $derived(
    metricOptions.find((option) => option.value === metric)?.label ?? 'Metric'
  );
  const periodLabel = $derived(
    periodOptions.find((option) => option.value === period)?.label ?? 'Period'
  );

  function setMetric(value: string) {
    if (disabled) return;
    onChange({ ...chart, numberMetric: value as NumberMetric });
  }

  function setOperation(value: string) {
    if (disabled) return;
    onChange({ ...chart, numberOperation: value as NumberOperation });
  }

  function setPeriod(value: string) {
    if (disabled) return;
    onChange({ ...chart, numberPeriod: value as Granularity });
  }
</script>

<div class="grid gap-3 sm:grid-cols-3">
  <label class="field">
    <span>Metric</span>
    <Select.Root type="single" value={metric} {disabled} onValueChange={setMetric}>
      <Select.Trigger class="w-full">{metricLabel}</Select.Trigger>
      <Select.Content>
        {#each metricOptions as option (option.value)}
          <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </label>
  <label class="field">
    <span>Operation</span>
    <Select.Root type="single" value={operation} {disabled} onValueChange={setOperation}>
      <Select.Trigger class="w-full">{operationLabel}</Select.Trigger>
      <Select.Content>
        {#each operationOptions[metric] as option (option.value)}
          <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </label>
  <label class="field">
    <span>Period</span>
    <Select.Root
      type="single"
      value={period}
      disabled={disabled || operation === 'current'}
      onValueChange={setPeriod}
    >
      <Select.Trigger class="w-full">{periodLabel}</Select.Trigger>
      <Select.Content>
        {#each periodOptions as option (option.value)}
          <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </label>
</div>
