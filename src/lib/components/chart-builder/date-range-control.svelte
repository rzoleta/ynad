<script lang="ts">
  import { CalendarDays } from '@lucide/svelte';
  import * as Select from '$lib/components/ui/select/index.js';
  import { datePresetOptions, type ChartConfig, type DatePreset } from '$lib/app/chart-config';

  let {
    chart,
    onChange
  }: {
    chart: ChartConfig;
    onChange: (chart: ChartConfig) => void;
  } = $props();

  const label = $derived(
    datePresetOptions.find((option) => option.value === chart.dateRange.preset)?.label ??
      'Date range'
  );

  function formatLocalDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function setPreset(value: string) {
    if (value === 'custom') {
      if (chart.dateRange.preset === 'custom') return;
      const today = formatLocalDate(new Date());
      onChange({ ...chart, dateRange: { preset: 'custom', from: today, to: today } });
      return;
    }

    onChange({ ...chart, dateRange: { preset: value as Exclude<DatePreset, 'custom'> } });
  }

  function setCustomDate(part: 'from' | 'to', event: Event) {
    if (chart.dateRange.preset !== 'custom') return;
    const value = event.currentTarget instanceof HTMLInputElement ? event.currentTarget.value : '';
    onChange({ ...chart, dateRange: { ...chart.dateRange, [part]: value } });
  }
</script>

<div class="field">
  <span>Date range</span>
  <Select.Root type="single" value={chart.dateRange.preset} onValueChange={setPreset}>
    <Select.Trigger class="w-full">
      <CalendarDays size={15} />
      {label}
    </Select.Trigger>
    <Select.Content>
      {#each datePresetOptions as option (option.value)}
        <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>

  {#if chart.dateRange.preset === 'custom'}
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <label class="field">
        <span>From</span>
        <input
          type="date"
          value={chart.dateRange.from}
          oninput={(event) => setCustomDate('from', event)}
        />
      </label>
      <label class="field">
        <span>To</span>
        <input
          type="date"
          value={chart.dateRange.to}
          oninput={(event) => setCustomDate('to', event)}
        />
      </label>
    </div>
  {/if}
</div>
