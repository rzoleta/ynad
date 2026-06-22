<script lang="ts">
  import { CalendarDays } from '@lucide/svelte';
  import * as Select from '$lib/components/ui/select/index.js';
  import { datePresetOptions, type ChartConfig, type DatePreset } from '$lib/app/chart-config';

  let {
    chart,
    onChange,
    compact = false
  }: {
    chart: ChartConfig;
    onChange: (chart: ChartConfig) => void;
    compact?: boolean;
  } = $props();

  const label = $derived(
    datePresetOptions.find((option) => option.value === chart.dateRange.preset)?.label ??
      'Date range'
  );

  const disabled = $derived(chart.type === 'balance' && chart.visualization === 'pie');

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

{#if !disabled}
  <div class={compact ? 'field min-w-0' : 'field'}>
    <span class={compact ? 'text-xs text-muted-foreground' : undefined}>Date range</span>
    <div class={compact ? 'flex flex-wrap items-end gap-2' : 'grid gap-2'}>
      <Select.Root type="single" value={chart.dateRange.preset} onValueChange={setPreset}>
        <Select.Trigger class={compact ? 'w-48' : 'w-full'} size={compact ? 'sm' : 'default'}>
          <CalendarDays size={15} />
          <p class="flex-1 text-left">{label}</p>
        </Select.Trigger>
        <Select.Content>
          {#each datePresetOptions as option (option.value)}
            <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>

      {#if chart.dateRange.preset === 'custom'}
        <div
          class={compact
            ? 'flex flex-wrap items-end gap-2'
            : 'grid grid-cols-1 gap-2 sm:grid-cols-2'}
        >
          <label class="field">
            <span class={compact ? 'text-xs text-muted-foreground' : undefined}>From</span>
            <input
              class={compact ? 'w-[8.75rem]' : undefined}
              type="date"
              value={chart.dateRange.from}
              oninput={(event) => setCustomDate('from', event)}
            />
          </label>
          <label class="field">
            <span class={compact ? 'text-xs text-muted-foreground' : undefined}>To</span>
            <input
              class={compact ? 'w-[8.75rem]' : undefined}
              type="date"
              value={chart.dateRange.to}
              oninput={(event) => setCustomDate('to', event)}
            />
          </label>
        </div>
      {/if}
    </div>
  </div>
{/if}
