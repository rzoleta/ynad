<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Unplug } from '@lucide/svelte';
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { setMode, userPrefersMode } from 'mode-watcher';
  import { onMount } from 'svelte';
  import {
    readYnabConnectionState,
    shouldRetryYnabQuery,
    type YnabConnectionState
  } from '$lib/app/app-state';
  import { fetchBudgetSelectionState } from '$lib/app/budget-selection';
  import { clearLocalUserData } from '$lib/app/local-user-data';
  import * as Select from '$lib/components/ui/select/index.js';
  import BudgetSelector from '$lib/components/settings/budget-selector.svelte';
  import {
    getEffectiveWeekStart,
    readSettings,
    writeSettings,
    type WeekStart
  } from '$lib/app/settings';
  import { startYnabOAuth } from '$lib/ynab/auth';
  import { Button } from '$lib/components/ui/button/index.js';

  let token = $state<string | null>(null);
  let connectionStatus = $state<YnabConnectionState['status']>('disconnected');
  let weekStart = $state<WeekStart>(7);
  const queryClient = useQueryClient();

  const weekStartOptions = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
    { value: '7', label: 'Sunday' }
  ];
  const weekStartValue = $derived(String(weekStart));
  const themeOptions = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' }
  ];
  const themeValue = $derived(userPrefersMode.current ?? 'system');
  const themeLabel = $derived(
    themeOptions.find((option) => option.value === themeValue)?.label ?? 'System'
  );
  const weekStartLabel = $derived(
    weekStartOptions.find((option) => option.value === weekStartValue)?.label ?? 'Sunday'
  );
  const budgetSelectionQuery = createQuery(() => ({
    queryKey: ['ynab', 'budget-selection', token],
    queryFn: async () => {
      if (!token) return null;
      return fetchBudgetSelectionState(token);
    },
    enabled: Boolean(token),
    retry: shouldRetryYnabQuery
  }));
  const budgetSelectorLoading = $derived(
    Boolean(token) && (budgetSelectionQuery.status === 'pending' || budgetSelectionQuery.isFetching)
  );

  onMount(() => {
    const connection = readYnabConnectionState();
    connectionStatus = connection.status;
    token = connection.accessToken;
    weekStart = getEffectiveWeekStart();
  });

  function saveWeekStart(value: WeekStart) {
    weekStart = value;
    writeSettings({ ...readSettings(), weekStart: value });
  }

  async function disconnect() {
    if (!confirm('Disconnect YNAB and delete all local YNAD data on this browser?')) return;
    clearLocalUserData();
    queryClient.clear();
    await goto(resolve('/'));
  }
</script>

<svelte:head>
  <title>Settings · YNAD</title>
</svelte:head>

<main class="min-h-screen bg-background">
  <header class="border-b border-border bg-card">
    <div class="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
      <div>
        <a href={resolve('/app')} class="text-xl font-semibold">YNAD</a>
        <p class="text-sm text-muted-foreground">Settings</p>
      </div>
      <Button variant="secondary" href={resolve('/app')}>Dashboard</Button>
    </div>
  </header>

  <section class="mx-auto max-w-4xl space-y-5 px-5 py-6">
    <div class="rounded-lg border border-border bg-card p-5">
      <h1 class="text-lg font-semibold">Appearance</h1>
      <label class="field mt-4 max-w-sm">
        <span>Theme</span>
        <Select.Root
          type="single"
          value={themeValue}
          onValueChange={(value) => setMode(value as 'system' | 'light' | 'dark')}
        >
          <Select.Trigger class="w-full">{themeLabel}</Select.Trigger>
          <Select.Content>
            {#each themeOptions as option (option.value)}
              <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </label>
    </div>

    <div class="rounded-lg border border-border bg-card p-5">
      <h2 class="text-lg font-semibold">Localization</h2>
      <label class="field mt-4 max-w-sm">
        <span>Week starts on</span>
        <Select.Root
          type="single"
          value={weekStartValue}
          onValueChange={(value) => saveWeekStart(Number(value) as WeekStart)}
        >
          <Select.Trigger class="w-full">{weekStartLabel}</Select.Trigger>
          <Select.Content>
            {#each weekStartOptions as option (option.value)}
              <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </label>
    </div>

    {#if connectionStatus === 'connected'}
      <div class="rounded-lg border border-border bg-card p-5">
        <BudgetSelector
          budgets={budgetSelectionQuery.data?.budgets ?? []}
          selectedBudgetId={budgetSelectionQuery.data?.selectedBudgetId ?? null}
          loading={budgetSelectorLoading}
          error={budgetSelectionQuery.error}
        />
      </div>
    {/if}

    <div class="rounded-lg border border-border bg-card p-5">
      <h2 class="text-lg font-semibold">YNAB connection</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        {connectionStatus === 'connected'
          ? 'YNAB is connected in this browser.'
          : connectionStatus === 'expired'
            ? 'The YNAB token in this browser has expired.'
            : 'YNAB is not connected.'}
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        {#if connectionStatus === 'expired'}
          <Button variant="primary" onclick={startYnabOAuth}>Reconnect YNAB</Button>
        {/if}
        <Button variant="danger" onclick={disconnect}>
          <Unplug size={16} />
          Disconnect YNAB
        </Button>
      </div>
    </div>
  </section>
</main>
