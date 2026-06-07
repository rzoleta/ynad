<script lang="ts">
  import { X } from '@lucide/svelte';
  import { tick } from 'svelte';
  import {
    isChartPreviewable,
    normalizeChartForType,
    type ChartConfig
  } from '$lib/app/chart-config';
  import type { WeekStart } from '$lib/app/settings';
  import type { NormalizedBudgetData } from '$lib/domain/types';
  import AccountFilterControl from './account-filter-control.svelte';
  import CategoryFilterControl from './category-filter-control.svelte';
  import ChartPreview from './chart-preview.svelte';
  import ChartSizeControl from './chart-size-control.svelte';
  import ChartTypeControl from './chart-type-control.svelte';
  import DateRangeControl from './date-range-control.svelte';
  import GranularityControl from './granularity-control.svelte';
  import NumberMetricControls from './number-metric-controls.svelte';
  import PayeeFilterControl from './payee-filter-control.svelte';
  import TitleField from './title-field.svelte';
  import VisualizationControl from './visualization-control.svelte';

  let {
    open,
    chart,
    data,
    weekStart,
    onChange,
    onSave,
    onCancel
  }: {
    open: boolean;
    chart: ChartConfig | null;
    data: NormalizedBudgetData | null;
    weekStart: WeekStart;
    onChange: (chart: ChartConfig) => void;
    onSave: (chart: ChartConfig) => void;
    onCancel: () => void;
  } = $props();

  let dialogElement = $state<HTMLElement | null>(null);
  let previouslyFocusedElement: HTMLElement | null = null;

  const canSave = $derived(Boolean(chart && isChartPreviewable(chart)));
  const accounts = $derived(data?.accounts ?? []);
  const categoryGroups = $derived(data?.categoryGroups ?? []);
  const categories = $derived(data?.categories ?? []);
  const payees = $derived(data?.payees ?? []);

  function updateDraft(next: ChartConfig) {
    onChange(normalizeChartForType(next));
  }

  function save() {
    if (!chart || !canSave) return;
    onSave(normalizeChartForType(chart));
  }

  function cancel() {
    onCancel();
  }

  function getFocusableElements() {
    if (!dialogElement) return [];

    return Array.from(
      dialogElement.querySelectorAll<HTMLElement>(
        [
          'a[href]',
          'button:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          '[tabindex]:not([tabindex="-1"])'
        ].join(',')
      )
    ).filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!open) return;
    if (event.key === 'Escape') {
      cancel();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  $effect(() => {
    if (!open) return;

    previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    tick().then(() => {
      getFocusableElements()[0]?.focus();
    });

    return () => {
      previouslyFocusedElement?.focus();
      previouslyFocusedElement = null;
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open && chart}
  <button
    class="fixed inset-0 z-40 cursor-default bg-black/35"
    aria-label="Close chart builder"
    onclick={cancel}
  ></button>
  <div
    bind:this={dialogElement}
    class="fixed inset-0 z-50 flex flex-col border-l border-border bg-card shadow-2xl lg:left-auto lg:w-[min(1680px,96vw)]"
    role="dialog"
    aria-modal="true"
    aria-labelledby="chart-builder-title"
    aria-describedby="chart-builder-description"
  >
    <div class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div>
        <h2 id="chart-builder-title" class="text-xl font-semibold">Chart builder</h2>
        <p id="chart-builder-description" class="mt-1 text-sm text-muted-foreground">
          {chart.title}
        </p>
      </div>
      <button class="icon-button" title="Close" aria-label="Close chart builder" onclick={cancel}>
        <X size={17} />
      </button>
    </div>

    <div
      class="grid flex-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(360px,420px)_minmax(720px,1fr)]"
    >
      <form class="min-w-0 divide-y divide-border" onsubmit={(event) => event.preventDefault()}>
        <section class="space-y-4 p-5">
          <h3 class="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Basics
          </h3>
          <ChartTypeControl {chart} onChange={updateDraft} />
          <ChartSizeControl {chart} onChange={updateDraft} />
        </section>

        <section class="space-y-4 p-5">
          <h3 class="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Visualization
          </h3>
          <VisualizationControl {chart} onChange={updateDraft} />
        </section>

        <section class="space-y-4 p-5">
          <h3 class="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Filters
          </h3>
          <AccountFilterControl {chart} {accounts} onChange={updateDraft} />
          <CategoryFilterControl {chart} {categoryGroups} {categories} onChange={updateDraft} />
          <PayeeFilterControl {chart} {payees} onChange={updateDraft} />
        </section>

        <section class="space-y-4 p-5">
          <h3 class="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Number
          </h3>
          <NumberMetricControls {chart} onChange={updateDraft} />
        </section>
      </form>

      <div class="min-w-0 border-t border-border bg-background/65 p-5 lg:border-t-0 lg:border-l">
        <div class="lg:sticky lg:top-5">
          <div class="mb-4 flex flex-wrap items-end gap-3">
            <div class="min-w-0 flex-1">
              <TitleField {chart} onChange={updateDraft} compact />
            </div>
            <GranularityControl {chart} onChange={updateDraft} compact />
            <DateRangeControl {chart} onChange={updateDraft} compact />
          </div>
          <ChartPreview {chart} {data} {weekStart} />
        </div>
      </div>
    </div>

    <div
      class="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card/95 p-4 backdrop-blur"
    >
      <button class="button secondary" onclick={cancel}>Cancel</button>
      <button class="button primary" disabled={!canSave} onclick={save}>Save</button>
    </div>
  </div>
{/if}
