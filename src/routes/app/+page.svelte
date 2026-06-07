<script lang="ts">
  import { resolve } from '$app/paths';
  import {
    BarChart3,
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
  import * as Select from '$lib/components/ui/select/index.js';
  import {
    formatRateLimitPause,
    getRateLimitPauseUntil,
    isRateLimitPauseActive,
    readYnabConnectionState,
    shouldRetryYnabQuery,
    type YnabConnectionState
  } from '$lib/app/app-state';
  import { fetchBudgetSelectionState } from '$lib/app/budget-selection';
  import {
    getChartMetadata,
    createDefaultChart,
    type ChartConfig,
    type ChartType
  } from '$lib/app/chart-config';
  import { readDashboard, reorderCharts, writeDashboard } from '$lib/app/dashboard-storage';
  import { getEffectiveWeekStart } from '$lib/app/settings';
  import { computeChart, type ChartResult } from '$lib/charts/compute';
  import ChartRenderer from '$lib/charts/chart-renderer.svelte';
  import { debugFetch } from '$lib/debug';
  import { cn, formatDateTime } from '$lib/utils';
  import { fetchNormalizedBudgetSnapshot } from '$lib/ynab/snapshot';
  import { getYnabErrorCode, getYnabErrorMessage } from '$lib/ynab/errors';
  import { startYnabOAuth } from '$lib/ynab/auth';
  import type { NormalizedBudgetData } from '$lib/domain/types';

  let token = $state<string | null>(null);
  let budgetId = $state<string | null>(null);
  let connectionStatus = $state<YnabConnectionState['status']>('disconnected');
  let charts = $state<ChartConfig[]>([]);
  let editMode = $state(false);
  let editorOpen = $state(false);
  let editingChart = $state<ChartConfig | null>(null);
  let rateLimitPauseUntil = $state<number | null>(null);
  let lastRateLimitError = $state<unknown>(null);
  let now = $state(Date.now());
  let draggedIndex = $state<number | null>(null);

  const chartTypeOptions = [
    { value: 'balance', label: 'Balance' },
    { value: 'spending', label: 'Spending' },
    { value: 'income', label: 'Income' },
    { value: 'number', label: 'Number' }
  ];
  const chartSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' }
  ];
  const dateRangeOptions = [
    { value: 'this-month', label: 'This Month' },
    { value: 'this-year', label: 'This Year' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'last-year', label: 'Last Year' },
    { value: 'last-12-months', label: 'Last 12 Months' }
  ];
  const visualizationOptions = [
    { value: 'line', label: 'Line' },
    { value: 'bar', label: 'Bar' },
    { value: 'pie', label: 'Pie' }
  ];
  const granularityOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ];
  const categoryOptions = [{ value: 'all', label: 'All categories' }];
  const payeeOptions = [{ value: 'all', label: 'All payees from loaded transactions' }];
  const dashboardSubtitle = $derived(
    connectionStatus === 'connected'
      ? 'Live dashboard'
      : connectionStatus === 'expired'
        ? 'Reconnect YNAB to refresh'
        : 'Connect YNAB to start'
  );

  function optionLabel(options: { value: string; label: string }[], value: string | undefined) {
    return options.find((option) => option.value === value)?.label ?? '';
  }

  const budgetSelectionQuery = createQuery(() => ({
    queryKey: ['ynab', 'budget-selection', token],
    queryFn: async () => {
      debugFetch('query:budget-selection:fn', {
        hasToken: Boolean(token)
      });
      if (!token) return null;
      return fetchBudgetSelectionState(token);
    },
    enabled: Boolean(token),
    retry: shouldRetryYnabQuery,
    refetchOnWindowFocus: () => !isRateLimitPauseActive(rateLimitPauseUntil)
  }));
  const snapshotQuery = createQuery<NormalizedBudgetData | null>(() => ({
    queryKey: ['ynab', 'snapshot', token, budgetId],
    queryFn: async () => {
      debugFetch('query:snapshot:fn', {
        hasToken: Boolean(token),
        budgetId
      });
      if (!token || !budgetId) return null;
      return fetchNormalizedBudgetSnapshot(token, budgetId);
    },
    enabled: Boolean(token && budgetId),
    retry: shouldRetryYnabQuery,
    refetchOnWindowFocus: () => !isRateLimitPauseActive(rateLimitPauseUntil)
  }));
  const lastUpdated = $derived(snapshotQuery.data?.fetchedAt ?? null);
  const canRefresh = $derived(Boolean(token));
  const isRefreshing = $derived(budgetSelectionQuery.isFetching || snapshotQuery.isFetching);
  const dashboardError = $derived(snapshotQuery.error ?? budgetSelectionQuery.error ?? null);
  const rateLimitPauseLabel = $derived(formatRateLimitPause(rateLimitPauseUntil, now));

  onMount(() => {
    const connection = readYnabConnectionState();
    token = connection.accessToken;
    connectionStatus = connection.status;
    budgetId = null;
    charts = readDashboard(null).charts;
    debugFetch('app:on-mount', {
      hasToken: Boolean(token),
      connectionStatus,
      tokenExpiresAt: connection.expiresAt ? new Date(connection.expiresAt).toISOString() : null,
      budgetId,
      charts: charts.length
    });

    const interval = window.setInterval(() => {
      now = Date.now();
    }, 1000);

    return () => window.clearInterval(interval);
  });

  $effect(() => {
    const selectedBudgetId = budgetSelectionQuery.data?.selectedBudgetId ?? null;
    if (selectedBudgetId === budgetId) return;

    budgetId = selectedBudgetId;
    charts = readDashboard(selectedBudgetId).charts;
    debugFetch('budget-selection:applied', {
      budgetId: selectedBudgetId,
      charts: charts.length
    });
  });

  $effect(() => {
    debugFetch('state:snapshot-query', {
      hasToken: Boolean(token),
      connectionStatus,
      budgetId,
      budgetSelectionStatus: budgetSelectionQuery.status,
      status: snapshotQuery.status,
      fetchStatus: snapshotQuery.fetchStatus,
      hasError: Boolean(dashboardError),
      errorCode: dashboardError ? getYnabErrorCode(dashboardError) : null,
      error: dashboardError instanceof Error ? dashboardError.message : null,
      hasSnapshot: Boolean(snapshotQuery.data),
      accounts: snapshotQuery.data?.accounts.length ?? null,
      transactions: snapshotQuery.data?.transactions.length ?? null,
      rateLimitPauseUntil
    });
  });

  $effect(() => {
    if (!dashboardError) {
      lastRateLimitError = null;
      return;
    }

    if (dashboardError === lastRateLimitError) return;

    const pauseUntil = getRateLimitPauseUntil(dashboardError);
    if (pauseUntil) rateLimitPauseUntil = pauseUntil;
    lastRateLimitError = dashboardError;
  });

  $effect(() => {
    if (snapshotQuery.data && !snapshotQuery.error) rateLimitPauseUntil = null;
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
    rateLimitPauseUntil = null;
    await budgetSelectionQuery.refetch();
    await snapshotQuery.refetch();
  }

  function resultFor(chart: ChartConfig): ChartResult {
    if (!snapshotQuery.data && connectionStatus === 'expired') {
      return { status: 'error', message: 'Reconnect YNAB to refresh this chart.' };
    }

    if (!snapshotQuery.data && dashboardError) {
      return { status: 'error', message: getDashboardErrorMessage(dashboardError) };
    }

    return computeChart(chart, snapshotQuery.data ?? null, getEffectiveWeekStart());
  }

  function getDashboardErrorTitle(error: unknown) {
    const code = getYnabErrorCode(error);
    if (code === 'reconnect-required') return 'Reconnect YNAB';
    if (code === 'rate-limited') return 'YNAB rate limit reached';
    if (code === 'network-unavailable') return 'Network unavailable';
    if (code === 'budget-unavailable') return 'Budget unavailable';
    return 'YNAB data could not be fetched';
  }

  function getDashboardErrorMessage(error: unknown) {
    const code = getYnabErrorCode(error);
    if (code === 'reconnect-required') return 'Your YNAB connection needs to be renewed.';
    if (code === 'rate-limited') {
      return rateLimitPauseLabel
        ? `Automatic focus refresh is paused for ${rateLimitPauseLabel}. Manual refresh is still available.`
        : 'Automatic focus refresh is paused. Manual refresh is still available.';
    }
    if (code === 'network-unavailable') return 'Check your connection, then refresh YNAB data.';
    if (code === 'budget-unavailable') {
      return 'The selected budget is no longer available from YNAB.';
    }
    return getYnabErrorMessage(error);
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
          {dashboardSubtitle}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm text-muted-foreground">Updated {formatDateTime(lastUpdated)}</span>
        <button
          class="icon-button"
          title="Refresh YNAB data"
          disabled={!canRefresh || isRefreshing}
          onclick={refresh}
        >
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
    {#if connectionStatus === 'disconnected'}
      <div class="rounded-lg border border-border bg-card p-8">
        <h1 class="text-2xl font-semibold">Connect YNAB</h1>
        <p class="mt-2 max-w-xl text-muted-foreground">
          YNAD stores your OAuth token in this browser and fetches YNAB data directly from the YNAB
          API.
        </p>
        <button class="button primary mt-6" onclick={startYnabOAuth}>Connect YNAB</button>
      </div>
    {:else if connectionStatus === 'expired'}
      <div
        class="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-danger/40 bg-danger/10 p-4 text-danger"
      >
        <div>
          <p class="font-medium">Reconnect YNAB</p>
          <p class="mt-1 text-sm">
            The browser token has expired. Local chart cards remain available, but live data will
            not refresh until you reconnect.
          </p>
        </div>
        <button class="button primary" onclick={startYnabOAuth}>Reconnect YNAB</button>
      </div>
    {:else if dashboardError}
      <div
        class="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-danger/40 bg-danger/10 p-4 text-danger"
      >
        <div>
          <p class="font-medium">{getDashboardErrorTitle(dashboardError)}</p>
          <p class="mt-1 text-sm">{getDashboardErrorMessage(dashboardError)}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          {#if getYnabErrorCode(dashboardError) === 'reconnect-required'}
            <button class="button primary" onclick={startYnabOAuth}>Reconnect YNAB</button>
          {:else if getYnabErrorCode(dashboardError) === 'budget-unavailable'}
            <a class="button secondary" href={resolve('/app/settings')}>Settings</a>
          {:else}
            <button class="button secondary" disabled={!canRefresh} onclick={refresh}>
              <RefreshCcw size={16} />
              Refresh
            </button>
          {/if}
        </div>
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
            <ChartRenderer result={resultFor(chart)} {chart} type={chart.type} />
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
      class="fixed inset-y-0 right-0 z-50 flex w-full max-w-5xl flex-col border-l border-border bg-card shadow-2xl"
    >
      <div class="border-b border-border p-5">
        <h2 class="text-xl font-semibold">
          {charts.some((chart) => chart.id === editingChart?.id) ? 'Edit chart' : 'New chart'}
        </h2>
        <p class="text-sm text-muted-foreground">
          Grouped form with live preview from current data.
        </p>
      </div>
      <div
        class="grid flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[minmax(320px,1fr)_minmax(280px,0.9fr)] lg:items-start"
      >
        <div class="space-y-5">
          <label class="field">
            <span>Title</span>
            <input
              bind:value={editingChart.title}
              oninput={() => (editingChart!.titleEdited = true)}
            />
          </label>
          <label class="field">
            <span>Type</span>
            <Select.Root type="single" bind:value={editingChart.type}>
              <Select.Trigger class="w-full">
                {optionLabel(chartTypeOptions, editingChart.type)}
              </Select.Trigger>
              <Select.Content>
                {#each chartTypeOptions as option (option.value)}
                  <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item
                  >
                {/each}
              </Select.Content>
            </Select.Root>
          </label>
          <label class="field">
            <span>Size</span>
            <Select.Root type="single" bind:value={editingChart.size}>
              <Select.Trigger class="w-full">
                {optionLabel(chartSizeOptions, editingChart.size)}
              </Select.Trigger>
              <Select.Content>
                {#each chartSizeOptions as option (option.value)}
                  <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item
                  >
                {/each}
              </Select.Content>
            </Select.Root>
          </label>
          <label class="field">
            <span>Date range</span>
            <Select.Root type="single" bind:value={editingChart.dateRange.preset}>
              <Select.Trigger class="w-full">
                {optionLabel(dateRangeOptions, editingChart.dateRange.preset)}
              </Select.Trigger>
              <Select.Content>
                {#each dateRangeOptions as option (option.value)}
                  <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item
                  >
                {/each}
              </Select.Content>
            </Select.Root>
          </label>
          <label class="field">
            <span>Visualization</span>
            <Select.Root
              type="single"
              bind:value={editingChart.visualization}
              disabled={editingChart.type === 'number'}
            >
              <Select.Trigger class="w-full">
                {optionLabel(visualizationOptions, editingChart.visualization)}
              </Select.Trigger>
              <Select.Content>
                {#each visualizationOptions as option (option.value)}
                  <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item
                  >
                {/each}
              </Select.Content>
            </Select.Root>
          </label>
          <label class="field">
            <span>Granularity</span>
            <Select.Root
              type="single"
              bind:value={editingChart.granularity}
              disabled={editingChart.type === 'number' || editingChart.visualization === 'pie'}
            >
              <Select.Trigger class="w-full">
                {optionLabel(granularityOptions, editingChart.granularity)}
              </Select.Trigger>
              <Select.Content>
                {#each granularityOptions as option (option.value)}
                  <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item
                  >
                {/each}
              </Select.Content>
            </Select.Root>
          </label>
          <label class="field">
            <span>Categories</span>
            <Select.Root type="single" value="all" disabled={editingChart.type !== 'spending'}>
              <Select.Trigger class="w-full">All categories</Select.Trigger>
              <Select.Content>
                {#each categoryOptions as option (option.value)}
                  <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item
                  >
                {/each}
              </Select.Content>
            </Select.Root>
          </label>
          <label class="field">
            <span>Payees</span>
            <Select.Root
              type="single"
              value="all"
              disabled={editingChart.type !== 'spending' && editingChart.type !== 'income'}
            >
              <Select.Trigger class="w-full">All payees from loaded transactions</Select.Trigger>
              <Select.Content>
                {#each payeeOptions as option (option.value)}
                  <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item
                  >
                {/each}
              </Select.Content>
            </Select.Root>
          </label>
        </div>
        <div class="rounded-lg border border-border bg-background p-4 lg:sticky lg:top-5">
          <p class="mb-3 text-sm font-medium">Preview</p>
          <ChartRenderer
            result={resultFor(editingChart)}
            chart={editingChart}
            type={editingChart.type}
          />
        </div>
      </div>
      <div class="flex justify-end gap-2 border-t border-border p-5">
        <button class="button secondary" onclick={() => (editorOpen = false)}>Cancel</button>
        <button class="button primary" onclick={saveChart}>Save</button>
      </div>
    </aside>
  {/if}
</main>
