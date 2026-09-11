<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { LogOut } from '@lucide/svelte';
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { setMode, userPrefersMode } from 'mode-watcher';
  import { onMount } from 'svelte';
  import { shouldRetryYnabQuery } from '$lib/app/app-state';
  import { fetchBudgetSelectionState } from '$lib/app/budget-selection';
  import { authClient } from '$lib/client/auth-client';
  import * as Select from '$lib/components/ui/select/index.js';
  import BudgetSelector from '$lib/components/settings/budget-selector.svelte';
  import {
    getEffectiveWeekStart,
    readSettings,
    writeSettings,
    type WeekStart
  } from '$lib/app/settings';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

  let weekStart = $state<WeekStart>(7);
  let signOutDialogOpen = $state(false);
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
    queryKey: ['ynab', 'budget-selection'],
    queryFn: fetchBudgetSelectionState,
    retry: shouldRetryYnabQuery
  }));
  const budgetSelectorLoading = $derived(
    budgetSelectionQuery.status === 'pending' || budgetSelectionQuery.isFetching
  );

  onMount(() => {
    weekStart = getEffectiveWeekStart();
  });

  function saveWeekStart(value: WeekStart) {
    weekStart = value;
    writeSettings({ ...readSettings(), weekStart: value });
  }

  async function signOut() {
    await authClient.signOut();
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

    <div class="rounded-lg border border-border bg-card p-5">
      <BudgetSelector
        budgets={budgetSelectionQuery.data?.budgets ?? []}
        selectedBudgetId={budgetSelectionQuery.data?.selectedBudgetId ?? null}
        loading={budgetSelectorLoading}
        error={budgetSelectionQuery.error}
      />
    </div>

    <div class="rounded-lg border border-border bg-card p-5">
      <h2 class="text-lg font-semibold">Account</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        You are signed in with YNAB. Your YNAB connection is stored server-side and follows you
        across devices.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <AlertDialog.Root bind:open={signOutDialogOpen}>
          <AlertDialog.Trigger>
            {#snippet child({ props })}
              <Button variant="danger" {...props}>
                <LogOut size={16} />
                Sign out
              </Button>
            {/snippet}
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Sign out?</AlertDialog.Title>
              <AlertDialog.Description>
                Your dashboards stay saved to your account and will be here when you sign back in.
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action variant="danger" onclick={signOut}>Sign out</AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </div>
    </div>
  </section>
</main>
