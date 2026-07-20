<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { track } from '@vercel/analytics';
  import { flip } from 'svelte/animate';
  import { onMount } from 'svelte';
  import {
    dragHandleZone,
    SHADOW_ITEM_MARKER_PROPERTY_NAME,
    type DndEvent
  } from 'svelte-dnd-action';
  import {
    formatRateLimitPause,
    getRateLimitPauseUntil,
    isRateLimitPauseActive,
    readYnabConnectionState,
    shouldRetryYnabQuery,
    type YnabConnectionState
  } from '$lib/app/app-state';
  import { fetchBudgetSelectionState, readSelectedBudgetId } from '$lib/app/budget-selection';
  import {
    createDefaultChart,
    isChartPreviewable,
    normalizeChartForType,
    type ChartConfig,
    type ChartType
  } from '$lib/app/chart-config';
  import { cloneDashboardChart, readDashboard, writeDashboard } from '$lib/app/dashboard-storage';
  import { getEffectiveWeekStart } from '$lib/app/settings';
  import { computeChart, type ChartResult } from '$lib/charts/compute';
  import ChartBuilderSheet from '$lib/components/chart-builder/chart-builder-sheet.svelte';
  import ChartCard from '$lib/components/dashboard/chart-card.svelte';
  import DashboardToolbar from '$lib/components/dashboard/dashboard-toolbar.svelte';
  import EmptyDashboard from '$lib/components/dashboard/empty-dashboard.svelte';
  import LoadingDashboard from '$lib/components/dashboard/loading-dashboard.svelte';
  import YnabConnectPanel from '$lib/components/dashboard/ynab-connect-panel.svelte';
  import YnabErrorBanner from '$lib/components/dashboard/ynab-error-banner.svelte';
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
  import { fetchNormalizedBudgetSnapshot } from '$lib/ynab/snapshot';
  import { getYnabErrorCode, getYnabErrorMessage } from '$lib/ynab/errors';
  import { startYnabOAuth } from '$lib/ynab/auth';
  import type { NormalizedBudgetData } from '$lib/domain/types';

  let token = $state<string | null>(null);
  let budgetId = $state<string | null>(null);
  let connectionStatus = $state<YnabConnectionState['status']>('disconnected');
  let charts = $state<ChartConfig[]>([]);
  let editorOpen = $state(false);
  let editingChart = $state<ChartConfig | null>(null);
  let rateLimitPauseUntil = $state<number | null>(null);
  let lastRateLimitError = $state<unknown>(null);
  let now = $state(Date.now());
  let chartPendingDelete = $state<ChartConfig | null>(null);
  let deleteChartDialogOpen = $state(false);

  const reorderFlipDurationMs = 180;

  const dashboardSubtitle = $derived(
    connectionStatus === 'connected'
      ? 'You Need A Dashboard for YNAB'
      : connectionStatus === 'expired'
        ? 'Reconnect YNAB to refresh'
        : 'Connect YNAB to start'
  );

  const budgetSelectionQuery = createQuery(() => ({
    queryKey: ['ynab', 'budget-selection', token],
    queryFn: async () => {
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
  const isSnapshotLoading = $derived(Boolean(isRefreshing));
  const showInitialYnabLoading = $derived(
    connectionStatus === 'connected' && charts.length === 0 && isSnapshotLoading && !dashboardError
  );
  const rateLimitPauseLabel = $derived(formatRateLimitPause(rateLimitPauseUntil, now));
  const dragDisabled = $derived(isSnapshotLoading || charts.length < 2);
  const isEditingExistingChart = $derived(
    Boolean(editingChart && charts.some((chart) => chart.id === editingChart?.id))
  );
  const chartDragOptions = $derived({
    items: charts,
    type: 'dashboard-charts',
    flipDurationMs: reorderFlipDurationMs,
    dragDisabled,
    dropFromOthersDisabled: true,
    delayTouchStart: 120,
    useCursorForDetection: true,
    dropTargetClasses: dragDisabled ? [] : ['dashboard-grid-drop-target']
  });
  const compactNumberChartIds = $derived.by(() => {
    const compactIds: string[] = [];
    let row: ChartConfig[] = [];
    let rowWidth = 0;

    function flushRow() {
      if (row.length === 0) return;

      if (row.every((chart) => chart.visualization === 'number')) {
        for (const chart of row) compactIds.push(chart.id);
      }

      row = [];
      rowWidth = 0;
    }

    for (const chart of realChartItems(charts)) {
      const span = chartGridColumnSpan(chart);

      if (rowWidth > 0 && rowWidth + span > 3) flushRow();

      row.push(chart);
      rowWidth += span;

      if (rowWidth >= 3) flushRow();
    }

    flushRow();
    return compactIds;
  });

  onMount(() => {
    const connection = readYnabConnectionState();
    token = connection.accessToken;
    connectionStatus = connection.status;
    budgetId = connection.status === 'disconnected' ? null : readSelectedBudgetId();
    charts = readDashboard(budgetId).charts;

    const interval = window.setInterval(() => {
      now = Date.now();
    }, 1000);

    return () => window.clearInterval(interval);
  });

  $effect(() => {
    if (budgetSelectionQuery.data === undefined) return;

    const selectedBudgetId = budgetSelectionQuery.data?.selectedBudgetId ?? null;
    if (selectedBudgetId === budgetId) return;

    budgetId = selectedBudgetId;
    charts = readDashboard(selectedBudgetId).charts;
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
    editingChart = cloneDashboardChart(chart);
    editorOpen = true;
  }

  function updateEditingChart(chart: ChartConfig) {
    editingChart = normalizeChartForType(chart);
  }

  function saveChart(chart: ChartConfig) {
    const nextChart = normalizeChartForType(chart);
    const existing = charts.some((chart) => chart.id === nextChart.id);
    persist(
      existing
        ? charts.map((chart) => (chart.id === nextChart.id ? nextChart : chart))
        : [...charts, nextChart]
    );
    editorOpen = false;
    editingChart = null;
    if (!existing) track('add_chart');
  }

  function closeEditor() {
    editorOpen = false;
    editingChart = null;
  }

  function deleteEditingChart(chart: ChartConfig) {
    chartPendingDelete = chart;
    deleteChartDialogOpen = true;
  }

  function confirmDeleteEditingChart() {
    if (!chartPendingDelete) return;
    persist(charts.filter((item) => item.id !== chartPendingDelete?.id));
    chartPendingDelete = null;
    deleteChartDialogOpen = false;
    closeEditor();
  }

  function setDeleteChartDialogOpen(open: boolean) {
    deleteChartDialogOpen = open;
    if (!open) chartPendingDelete = null;
  }

  function handleChartDragConsider(event: CustomEvent<DndEvent<ChartDndItem>>) {
    charts = event.detail.items;
  }

  function handleChartDragFinalize(event: CustomEvent<DndEvent<ChartDndItem>>) {
    persist(realChartItems(event.detail.items));
  }

  function realChartItems(items: ChartDndItem[]): ChartConfig[] {
    return items.filter((chart) => !chart[SHADOW_ITEM_MARKER_PROPERTY_NAME]);
  }

  function chartGridColumnSpan(chart: ChartConfig) {
    if (chart.size === 'large') return 3;
    if (chart.size === 'medium') return 2;
    return 1;
  }

  function chartGridSpan(chart: ChartConfig, compactNumberChart: boolean) {
    const classes = [];

    if (chart.size === 'large') classes.push('md:col-span-3');
    if (chart.size === 'medium') classes.push('md:col-span-2');
    if (chart.visualization === 'number') {
      classes.push('self-start');
      if (!compactNumberChart) classes.push('md:self-stretch');
    }

    return classes.join(' ');
  }

  async function refresh() {
    rateLimitPauseUntil = null;
    await budgetSelectionQuery.refetch();
    await snapshotQuery.refetch();
  }

  function resultFor(chart: ChartConfig): ChartResult {
    const normalized = normalizeChartForType(chart);

    if (!isChartPreviewable(normalized)) {
      return { status: 'empty', message: 'Complete the chart settings to preview this chart.' };
    }

    if (!snapshotQuery.data && connectionStatus === 'expired') {
      return {
        status: 'error',
        message: 'Reconnect YNAB to refresh this chart.',
        code: 'reconnect-required'
      };
    }

    if (!snapshotQuery.data && dashboardError) {
      return {
        status: 'error',
        message: getDashboardErrorMessage(dashboardError),
        code: getYnabErrorCode(dashboardError)
      };
    }

    return computeChart(normalized, snapshotQuery.data ?? null, getEffectiveWeekStart());
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

  type ChartDndItem = ChartConfig & {
    [SHADOW_ITEM_MARKER_PROPERTY_NAME]?: boolean;
  };
</script>

<svelte:head>
  <title>Dashboard · YNAD</title>
</svelte:head>

<main class="min-h-screen bg-background">
  <DashboardToolbar
    subtitle={dashboardSubtitle}
    {lastUpdated}
    {canRefresh}
    {isRefreshing}
    disabled={isSnapshotLoading}
    onRefresh={refresh}
    onAddChart={openNew}
  />

  <section class="mx-auto max-w-7xl px-5 pb-6">
    {#if connectionStatus === 'disconnected'}
      <YnabConnectPanel status="disconnected" onConnect={startYnabOAuth} />
    {:else if connectionStatus === 'expired' && charts.length === 0}
      <YnabConnectPanel status="expired" onConnect={startYnabOAuth} />
    {:else if dashboardError}
      <YnabErrorBanner
        code={getYnabErrorCode(dashboardError)}
        title={getDashboardErrorTitle(dashboardError)}
        message={getDashboardErrorMessage(dashboardError)}
        {canRefresh}
        onRefresh={refresh}
        onReconnect={startYnabOAuth}
      />
    {/if}

    {#if showInitialYnabLoading}
      <LoadingDashboard />
    {:else if charts.length === 0}
      <EmptyDashboard onAddChart={openNew} disabled={isSnapshotLoading} />
    {:else}
      <div
        class="dashboard-grid grid grid-cols-1 gap-4 md:grid-cols-3"
        role="list"
        aria-label="Dashboard charts"
        use:dragHandleZone={chartDragOptions}
        onconsider={handleChartDragConsider}
        onfinalize={handleChartDragFinalize}
      >
        {#each charts as chart (chart.id)}
          {@const compactNumberChart = compactNumberChartIds.includes(chart.id)}
          <div
            class={chartGridSpan(chart, compactNumberChart)}
            role="listitem"
            aria-label={`${chart.title} chart`}
            animate:flip={{ duration: reorderFlipDurationMs }}
          >
            <ChartCard
              {chart}
              result={resultFor(chart)}
              data={snapshotQuery.data ?? null}
              dataLoading={isSnapshotLoading}
              disabled={isSnapshotLoading}
              total={charts.length}
              {compactNumberChart}
              onEdit={openEdit}
              onReconnect={startYnabOAuth}
            />
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <ChartBuilderSheet
    open={editorOpen}
    chart={editingChart}
    data={snapshotQuery.data ?? null}
    weekStart={getEffectiveWeekStart()}
    onChange={updateEditingChart}
    onSave={saveChart}
    onCancel={closeEditor}
    onDelete={isEditingExistingChart ? deleteEditingChart : undefined}
  />

  <AlertDialog.Root open={deleteChartDialogOpen} onOpenChange={setDeleteChartDialogOpen}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Delete chart?</AlertDialog.Title>
        <AlertDialog.Description>
          {#if chartPendingDelete}
            This will remove "{chartPendingDelete.title}" from this dashboard.
          {:else}
            This will remove the chart from this dashboard.
          {/if}
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action variant="danger" onclick={confirmDeleteEditingChart}>
          Delete
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>
</main>

<style>
  :global(.dashboard-grid-drop-target) {
    border-radius: 0.875rem;
    outline: 1px dashed color-mix(in oklab, var(--color-primary) 42%, transparent);
    outline-offset: 0.5rem;
  }

  :global(#dnd-action-dragged-el) {
    cursor: grabbing !important;
    opacity: 0.97;
    filter: drop-shadow(0 20px 24px rgb(0 0 0 / 0.16));
    transform: rotate(0.35deg);
  }
</style>
