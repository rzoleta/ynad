<script lang="ts">
  import { X } from '@lucide/svelte';
  import { tick } from 'svelte';
  import { cubicIn, cubicOut, quintOut } from 'svelte/easing';
  import { fade, fly } from 'svelte/transition';
  import {
    isChartPreviewable,
    normalizeChartForType,
    type ChartConfig
  } from '$lib/app/chart-config';
  import type { WeekStart } from '$lib/app/settings';
  import type { NormalizedBudgetData } from '$lib/domain/types';
  import AccountFilterControl from './account-filter-control.svelte';
  import BreakdownControl from './breakdown-control.svelte';
  import CategoryFilterControl from './category-filter-control.svelte';
  import ChartPreview from './chart-preview.svelte';
  import ChartSizeControl from './chart-size-control.svelte';
  import ChartTypeControl from './chart-type-control.svelte';
  import DateRangeControl from './date-range-control.svelte';
  import GranularityControl from './granularity-control.svelte';
  import NumberOperationControl from './number-operation-control.svelte';
  import PayeeFilterControl from './payee-filter-control.svelte';
  import TitleField from './title-field.svelte';
  import VisualizationControl from './visualization-control.svelte';
  import { Button } from '$lib/components/ui/button/index.js';

  let {
    open,
    chart,
    data,
    weekStart,
    onChange,
    onSave,
    onCancel,
    onDelete
  }: {
    open: boolean;
    chart: ChartConfig | null;
    data: NormalizedBudgetData | null;
    weekStart: WeekStart;
    onChange: (chart: ChartConfig) => void;
    onSave: (chart: ChartConfig) => void;
    onCancel: () => void;
    onDelete?: (chart: ChartConfig) => void;
  } = $props();

  let dialogElement = $state<HTMLElement | null>(null);
  let previouslyFocusedElement: HTMLElement | null = null;

  const canSave = $derived(Boolean(chart && isChartPreviewable(chart)));
  const accounts = $derived(data?.accounts ?? []);
  const categoryGroups = $derived(data?.categoryGroups ?? []);
  const categories = $derived(data?.categories ?? []);
  const payees = $derived(data?.payees ?? []);
  const reduceMotion = $derived(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  function sheetTransition(
    node: Element,
    { duration = 420, outro = false }: { duration?: number; outro?: boolean } = {}
  ) {
    const distance = Math.min(96, node.getBoundingClientRect().width * 0.08);
    const eased = outro ? cubicIn : quintOut;

    return {
      duration: reduceMotion ? 80 : duration,
      easing: eased,
      css: (t: number, u: number) => {
        const travel = outro ? u * distance : u * distance;
        const blur = reduceMotion ? 0 : u * 12;
        const scale = outro ? 0.985 + t * 0.015 : 0.975 + t * 0.025;

        return `
          opacity: ${0.2 + t * 0.8};
          transform: translate3d(${travel}px, 0, 0) scale(${scale});
          filter: blur(${blur}px);
        `;
      }
    };
  }

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

  function deleteChart() {
    if (!chart) return;
    onDelete?.(chart);
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
    in:fade={{ duration: reduceMotion ? 80 : 220, easing: cubicOut }}
    out:fade={{ duration: reduceMotion ? 80 : 180, easing: cubicIn }}
  ></button>
  <div
    bind:this={dialogElement}
    class="fixed inset-0 z-50 flex origin-right flex-col overflow-hidden border-l border-border bg-card shadow-2xl shadow-black/20 lg:left-auto lg:w-[min(1680px,96vw)]"
    role="dialog"
    aria-modal="true"
    aria-labelledby="chart-builder-title"
    aria-describedby="chart-builder-description"
    in:sheetTransition={{ duration: 460 }}
    out:sheetTransition={{ duration: 260, outro: true }}
  >
    <div
      class="flex items-start justify-between gap-4 border-b border-border px-5 py-4"
      in:fly={{
        x: reduceMotion ? 0 : 18,
        duration: reduceMotion ? 80 : 360,
        delay: 90,
        easing: quintOut
      }}
    >
      <div>
        <h2 id="chart-builder-title" class="text-xl font-semibold">Chart builder</h2>
        <p id="chart-builder-description" class="mt-1 text-sm text-muted-foreground">
          {chart.title}
        </p>
      </div>
      <Button
        size="icon"
        variant="secondary"
        title="Close"
        aria-label="Close chart builder"
        onclick={cancel}
      >
        <X size={17} />
      </Button>
    </div>

    <div
      class="grid flex-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(360px,420px)_minmax(720px,1fr)]"
    >
      <form
        class="min-w-0 divide-y divide-border"
        onsubmit={(event) => event.preventDefault()}
        in:fly={{
          x: reduceMotion ? 0 : 26,
          duration: reduceMotion ? 80 : 400,
          delay: 130,
          easing: quintOut
        }}
      >
        <section class="space-y-4 p-5">
          <h3 class="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Basics
          </h3>
          <ChartTypeControl {chart} onChange={updateDraft} />
          <VisualizationControl {chart} onChange={updateDraft} />
          <BreakdownControl {chart} onChange={updateDraft} />
        </section>

        <section class="space-y-6 p-5">
          <h3 class="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Filters
          </h3>
          <AccountFilterControl {chart} {accounts} onChange={updateDraft} />
          <CategoryFilterControl {chart} {categoryGroups} {categories} onChange={updateDraft} />
          <PayeeFilterControl {chart} {payees} onChange={updateDraft} />
        </section>

        {#if chart.visualization === 'number'}
          <section class="space-y-4 p-5">
            <h3 class="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Number
            </h3>
            <NumberOperationControl {chart} onChange={updateDraft} />
          </section>
        {/if}
      </form>

      <div
        class="flex min-w-0 flex-col border-t border-border bg-background/65 p-5 lg:border-t-0 lg:border-l"
        in:fly={{
          x: reduceMotion ? 0 : 34,
          duration: reduceMotion ? 80 : 440,
          delay: 180,
          easing: quintOut
        }}
      >
        <div class="flex min-h-0 flex-1 flex-col lg:sticky lg:top-5">
          <div class="mb-4 flex flex-wrap items-end gap-3">
            <div class="flex min-w-0 flex-1 flex-row gap-5">
              <TitleField {chart} onChange={updateDraft} compact />
              <ChartSizeControl {chart} onChange={updateDraft} />
            </div>
            <GranularityControl {chart} onChange={updateDraft} compact />
            <DateRangeControl {chart} onChange={updateDraft} compact />
          </div>
          <div class="flex flex-1 flex-col justify-center">
            <ChartPreview {chart} {data} {weekStart} />
          </div>
        </div>
      </div>
    </div>

    <div
      class="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-card/95 p-4 backdrop-blur"
      in:fly={{
        y: reduceMotion ? 0 : 18,
        duration: reduceMotion ? 80 : 340,
        delay: 230,
        easing: quintOut
      }}
    >
      {#if onDelete}
        <Button class="mr-auto" variant="danger" onclick={deleteChart}>Delete</Button>
      {/if}
      <Button variant="secondary" onclick={cancel}>Cancel</Button>
      <Button variant="primary" disabled={!canSave} onclick={save}>Save</Button>
    </div>
  </div>
{/if}
