<script lang="ts">
  import { resolve } from '$app/paths';
  import {
    BarChart3,
    CircleDollarSign,
    Copy,
    GripVertical,
    LineChart,
    Plus,
    RefreshCcw,
    Settings,
    Trash2
  } from '@lucide/svelte';
  import { createQuery } from '@tanstack/svelte-query';
  import { onMount } from 'svelte';
  import {
    getChartMetadata,
    createDefaultChart,
    type ChartConfig,
    type ChartType
  } from '$lib/app/chart-config';
  import { readDashboard, reorderCharts, writeDashboard } from '$lib/app/dashboard-storage';
  import { getEffectiveWeekStart } from '$lib/app/settings';
  import { computeChart, type ChartResult } from '$lib/charts/compute';
  import { debugFetch } from '$lib/debug';
  import { cn, formatDateTime, formatMilliunits } from '$lib/utils';
  import { fetchBudgetSnapshot, fetchBudgets } from '$lib/ynab/client';
  import {
    readSelectedBudgetId,
    readToken,
    startYnabOAuth,
    writeSelectedBudgetId
  } from '$lib/ynab/auth';
  import type { YnabBudgetSnapshot } from '$lib/ynab/types';

  let token = $state<string | null>(null);
  let budgetId = $state<string | null>(null);
  let charts = $state<ChartConfig[]>([]);
  let editMode = $state(false);
  let editorOpen = $state(false);
  let editingChart = $state<ChartConfig | null>(null);
  let lastUpdated = $state<Date | null>(null);
  let draggedIndex = $state<number | null>(null);

  const budgetsQuery = createQuery(() => ({
    queryKey: ['ynab', 'budgets', token],
    queryFn: async () => {
      debugFetch('query:budgets:fn', { hasToken: Boolean(token) });
      if (!token) return [];
      return fetchBudgets(token);
    },
    enabled: Boolean(token)
  }));

  const snapshotQuery = createQuery<YnabBudgetSnapshot | null>(() => ({
    queryKey: ['ynab', 'snapshot', token, budgetId],
    queryFn: async () => {
      debugFetch('query:snapshot:fn', {
        hasToken: Boolean(token),
        budgetId
      });
      if (!token || !budgetId) return null;
      const snapshot = await fetchBudgetSnapshot(token, budgetId);
      lastUpdated = new Date();
      return snapshot;
    },
    enabled: Boolean(token && budgetId)
  }));

  onMount(() => {
    const storedToken = readToken();
    token = storedToken?.accessToken ?? null;
    budgetId = readSelectedBudgetId();
    charts = readDashboard(budgetId).charts;
    debugFetch('app:on-mount', {
      hasToken: Boolean(token),
      tokenExpiresAt: storedToken?.expiresAt ? new Date(storedToken.expiresAt).toISOString() : null,
      budgetId,
      charts: charts.length
    });
  });

  $effect(() => {
    const budgets = budgetsQuery.data;
    debugFetch('state:budgets-query', {
      hasToken: Boolean(token),
      status: budgetsQuery.status,
      fetchStatus: budgetsQuery.fetchStatus,
      hasError: Boolean(budgetsQuery.error),
      error: budgetsQuery.error instanceof Error ? budgetsQuery.error.message : null,
      budgetCount: budgets?.length ?? null,
      currentBudgetId: budgetId
    });
    if (!budgetId && budgets?.[0]) {
      const nextBudgetId = budgets[0].id;
      budgetId = nextBudgetId;
      writeSelectedBudgetId(nextBudgetId);
      charts = readDashboard(nextBudgetId).charts;
      debugFetch('state:auto-selected-budget', {
        budgetId: nextBudgetId,
        charts: charts.length
      });
    }
  });

  $effect(() => {
    debugFetch('state:snapshot-query', {
      hasToken: Boolean(token),
      budgetId,
      status: snapshotQuery.status,
      fetchStatus: snapshotQuery.fetchStatus,
      hasError: Boolean(snapshotQuery.error),
      error: snapshotQuery.error instanceof Error ? snapshotQuery.error.message : null,
      hasSnapshot: Boolean(snapshotQuery.data),
      accounts: snapshotQuery.data?.accounts.length ?? null,
      transactions: snapshotQuery.data?.transactions.length ?? null
    });
  });

  function persist(next: ChartConfig[]) {
    charts = next;
    if (budgetId) writeDashboard(budgetId, { charts: next });
  }

  function openNew(type: ChartType) {
    editingChart = createDefaultChart(type);
    editorOpen = true;
  }

  function openEdit(chart: ChartConfig) {
    editingChart = structuredClone(chart);
    editorOpen = true;
  }

  function saveChart() {
    if (!editingChart) return;
    const existing = charts.some((chart) => chart.id === editingChart?.id);
    persist(
      existing
        ? charts.map((chart) => (chart.id === editingChart?.id ? editingChart : chart))
        : [...charts, editingChart]
    );
    editorOpen = false;
    editingChart = null;
  }

  function duplicateChart(chart: ChartConfig) {
    persist([
      ...charts,
      { ...structuredClone(chart), id: crypto.randomUUID(), title: `${chart.title} copy` }
    ]);
  }

  function deleteChart(chart: ChartConfig) {
    if (confirm(`Delete "${chart.title}"?`)) persist(charts.filter((item) => item.id !== chart.id));
  }

  function moveChart(from: number, to: number) {
    if (to < 0 || to >= charts.length) return;
    persist(reorderCharts(charts, from, to));
  }

  function onDrop(to: number) {
    if (draggedIndex === null || draggedIndex === to) return;
    moveChart(draggedIndex, to);
    draggedIndex = null;
  }

  async function refresh() {
    debugFetch('action:manual-refresh', { hasToken: Boolean(token), budgetId });
    await Promise.all([budgetsQuery.refetch(), snapshotQuery.refetch()]);
  }

  function resultFor(chart: ChartConfig): ChartResult {
    return computeChart(chart, snapshotQuery.data ?? null, getEffectiveWeekStart());
  }
</script>

<svelte:head>
  <title>Dashboard · YNAD</title>
</svelte:head>

<main class="min-h-screen bg-background">
  <header class="border-b border-border bg-card">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div>
        <a href={resolve('/')} class="text-xl font-semibold">YNAD</a>
        <p class="text-sm text-muted-foreground">
          {budgetId ? 'Live dashboard' : 'Connect YNAB to start'}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm text-muted-foreground">Updated {formatDateTime(lastUpdated)}</span>
        <button class="icon-button" title="Refresh YNAB data" onclick={refresh}>
          <RefreshCcw size={17} />
        </button>
        <a class="icon-button" title="Settings" href={resolve('/app/settings')}
          ><Settings size={17} /></a
        >
        <button class="button secondary" onclick={() => (editMode = !editMode)}>
          {editMode ? 'Done' : 'Edit dashboard'}
        </button>
        <button class="button primary" onclick={() => openNew('spending')}>
          <Plus size={17} />
          Add chart
        </button>
      </div>
    </div>
  </header>

  <section class="mx-auto max-w-7xl px-5 py-6">
    {#if !token}
      <div class="rounded-lg border border-border bg-card p-8">
        <h1 class="text-2xl font-semibold">Connect YNAB</h1>
        <p class="mt-2 max-w-xl text-muted-foreground">
          YNAD stores your OAuth token in this browser and fetches YNAB data directly from the YNAB
          API.
        </p>
        <button class="button primary mt-6" onclick={startYnabOAuth}>Connect YNAB</button>
      </div>
    {:else if snapshotQuery.error}
      <div class="mb-5 rounded-lg border border-danger/40 bg-danger/10 p-4 text-danger">
        YNAB data could not be fetched. Chart cards below will show per-chart fallback states.
      </div>
    {/if}

    {#if charts.length === 0}
      <div
        class="grid min-h-[520px] place-items-center rounded-lg border border-dashed border-border bg-card"
      >
        <div class="max-w-md p-6 text-center">
          <div
            class="mx-auto grid size-12 place-items-center rounded-md bg-primary/10 text-primary"
          >
            <BarChart3 size={24} />
          </div>
          <h1 class="mt-5 text-2xl font-semibold">Your dashboard is empty</h1>
          <p class="mt-2 text-muted-foreground">
            Add a chart to start building a browser-local finance dashboard.
          </p>
          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <button class="button primary" onclick={() => openNew('balance')}>Balance</button>
            <button class="button primary" onclick={() => openNew('spending')}>Spending</button>
            <button class="button primary" onclick={() => openNew('income')}>Income</button>
            <button class="button secondary" onclick={() => openNew('number')}>Number</button>
          </div>
        </div>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        {#each charts as chart, index (chart.id)}
          <div
            role="listitem"
            class={cn(
              'rounded-lg border border-border bg-card p-4 shadow-sm',
              chart.size === 'medium' && 'md:col-span-2',
              chart.size === 'large' && 'md:col-span-3'
            )}
            draggable={editMode}
            ondragstart={() => (draggedIndex = index)}
            ondragover={(event) => event.preventDefault()}
            ondrop={() => onDrop(index)}
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  {#if editMode}<GripVertical size={16} class="text-muted-foreground" />{/if}
                  <h2 class="font-semibold">{chart.title}</h2>
                </div>
                <p class="mt-1 text-xs text-muted-foreground capitalize">
                  {getChartMetadata(chart)}
                </p>
              </div>
              <div class="flex items-center gap-1">
                <button class="icon-button" title="Edit chart" onclick={() => openEdit(chart)}>
                  <LineChart size={16} />
                </button>
                {#if editMode}
                  <button
                    class="icon-button md:hidden"
                    title="Move up"
                    onclick={() => moveChart(index, index - 1)}>↑</button
                  >
                  <button
                    class="icon-button md:hidden"
                    title="Move down"
                    onclick={() => moveChart(index, index + 1)}>↓</button
                  >
                  <button
                    class="icon-button"
                    title="Duplicate"
                    onclick={() => duplicateChart(chart)}
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    class="icon-button danger"
                    title="Delete"
                    onclick={() => deleteChart(chart)}
                  >
                    <Trash2 size={16} />
                  </button>
                {/if}
              </div>
            </div>
            {@render ChartPreview(resultFor(chart), chart.type)}
          </div>
        {/each}
      </div>
    {/if}
  </section>

  {#if editorOpen && editingChart}
    <button
      class="fixed inset-0 z-40 cursor-default bg-black/35"
      aria-label="Close chart editor"
      onclick={() => (editorOpen = false)}
    ></button>
    <aside
      class="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl"
    >
      <div class="border-b border-border p-5">
        <h2 class="text-xl font-semibold">
          {charts.some((chart) => chart.id === editingChart?.id) ? 'Edit chart' : 'New chart'}
        </h2>
        <p class="text-sm text-muted-foreground">
          Grouped form with live preview from current data.
        </p>
      </div>
      <div class="flex-1 space-y-5 overflow-y-auto p-5">
        <label class="field">
          <span>Title</span>
          <input
            bind:value={editingChart.title}
            oninput={() => (editingChart!.titleEdited = true)}
          />
        </label>
        <label class="field">
          <span>Type</span>
          <select bind:value={editingChart.type}>
            <option value="balance">Balance</option>
            <option value="spending">Spending</option>
            <option value="income">Income</option>
            <option value="number">Number</option>
          </select>
        </label>
        <label class="field">
          <span>Size</span>
          <select bind:value={editingChart.size}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        <label class="field">
          <span>Date range</span>
          <select bind:value={editingChart.dateRange.preset}>
            <option value="this-month">This Month</option>
            <option value="this-year">This Year</option>
            <option value="last-month">Last Month</option>
            <option value="last-year">Last Year</option>
            <option value="last-12-months">Last 12 Months</option>
          </select>
        </label>
        <label class="field">
          <span>Visualization</span>
          <select bind:value={editingChart.visualization} disabled={editingChart.type === 'number'}>
            <option value="line">Line</option>
            <option value="bar">Bar</option>
            <option value="pie">Pie</option>
          </select>
        </label>
        <label class="field">
          <span>Granularity</span>
          <select
            bind:value={editingChart.granularity}
            disabled={editingChart.type === 'number' || editingChart.visualization === 'pie'}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
        <label class="field">
          <span>Categories</span>
          <select disabled={editingChart.type !== 'spending'}>
            <option>All categories</option>
          </select>
        </label>
        <label class="field">
          <span>Payees</span>
          <select disabled={editingChart.type !== 'spending' && editingChart.type !== 'income'}>
            <option>All payees from loaded transactions</option>
          </select>
        </label>
        <div class="rounded-lg border border-border bg-background p-4">
          <p class="mb-3 text-sm font-medium">Preview</p>
          {@render ChartPreview(resultFor(editingChart), editingChart.type)}
        </div>
      </div>
      <div class="flex justify-end gap-2 border-t border-border p-5">
        <button class="button secondary" onclick={() => (editorOpen = false)}>Cancel</button>
        <button class="button primary" onclick={saveChart}>Save</button>
      </div>
    </aside>
  {/if}
</main>

{#snippet ChartPreview(result: ChartResult, type: ChartType)}
  <div class="mt-5 min-h-48">
    {#if result.status === 'number'}
      <div class="flex h-48 items-center rounded-md bg-background p-5">
        <div>
          <p class="text-sm text-muted-foreground capitalize">{result.label}</p>
          <p class="mt-2 text-4xl font-semibold">{formatMilliunits(result.value)}</p>
        </div>
      </div>
    {:else if result.status === 'series'}
      <div class="space-y-3">
        <div class="flex h-44 items-end gap-2 rounded-md bg-background p-4">
          {#each result.points.slice(0, 12) as point (point.label)}
            <div class="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div
                class="w-full rounded-t bg-primary"
                style={`height:${Math.max(8, Math.min(100, (Math.abs(point.value) / Math.max(...result.points.map((item) => Math.abs(item.value)), 1)) * 100))}%`}
              ></div>
              <span class="w-full truncate text-center text-[10px] text-muted-foreground"
                >{point.label}</span
              >
            </div>
          {/each}
        </div>
        {#if result.excluded?.length}
          <p class="text-xs text-muted-foreground">
            Excluded non-positive pie slices: {result.excluded.join(', ')}
          </p>
        {/if}
      </div>
    {:else if result.status === 'error'}
      <div class="grid h-48 place-items-center rounded-md bg-danger/10 p-5 text-center text-danger">
        {result.message}
      </div>
    {:else}
      <div
        class="grid h-48 place-items-center rounded-md bg-background p-5 text-center text-muted-foreground"
      >
        <div>
          <CircleDollarSign class="mx-auto mb-3 text-primary" size={28} />
          <p>{result.message}</p>
          <p class="mt-1 text-xs capitalize">{type} chart</p>
        </div>
      </div>
    {/if}
  </div>
{/snippet}
