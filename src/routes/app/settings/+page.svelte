<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Moon, Sun, Unplug } from '@lucide/svelte';
  import { setMode, userPrefersMode } from 'mode-watcher';
  import { onMount } from 'svelte';
  import * as Select from '$lib/components/ui/select/index.js';
  import { readYnabConnectionState, type YnabConnectionState } from '$lib/app/app-state';
  import {
    getEffectiveWeekStart,
    readSettings,
    writeSettings,
    type WeekStart
  } from '$lib/app/settings';
  import { clearYnabConnection, startYnabOAuth } from '$lib/ynab/auth';
  import { DEFAULT_BUDGET_ID } from '$lib/ynab/client';

  let connectionStatus = $state<YnabConnectionState['status']>('disconnected');
  let weekStart = $state<WeekStart>(7);
  const tokenPresent = $derived(connectionStatus !== 'disconnected');

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
  const weekStartLabel = $derived(
    weekStartOptions.find((option) => option.value === weekStartValue)?.label ?? 'Sunday'
  );

  onMount(() => {
    connectionStatus = readYnabConnectionState().status;
    weekStart = getEffectiveWeekStart();
  });

  function saveWeekStart(value: WeekStart) {
    weekStart = value;
    writeSettings({ ...readSettings(), weekStart: value });
  }

  async function disconnect() {
    if (!confirm('Disconnect YNAB on this browser?')) return;
    clearYnabConnection();
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
      <a class="button secondary" href={resolve('/app')}>Dashboard</a>
    </div>
  </header>

  <section class="mx-auto max-w-4xl space-y-5 px-5 py-6">
    <div class="rounded-lg border border-border bg-card p-5">
      <h1 class="text-lg font-semibold">Appearance</h1>
      <p class="mt-1 text-sm text-muted-foreground">Theme preference is stored by mode-watcher.</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button class="button secondary" onclick={() => setMode('system')}>System</button>
        <button class="button secondary" onclick={() => setMode('light')}
          ><Sun size={16} /> Light</button
        >
        <button class="button secondary" onclick={() => setMode('dark')}
          ><Moon size={16} /> Dark</button
        >
      </div>
      <p class="mt-3 text-xs text-muted-foreground">
        Current preference: {userPrefersMode.current}
      </p>
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
      <h2 class="text-lg font-semibold">YNAB connection</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        {connectionStatus === 'connected'
          ? 'YNAB is connected in this browser.'
          : connectionStatus === 'expired'
            ? 'The YNAB token in this browser has expired.'
            : 'YNAB is not connected.'}
      </p>
      <p class="mt-2 text-xs text-muted-foreground">
        Selected budget: {tokenPresent ? DEFAULT_BUDGET_ID : 'None'}
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        {#if connectionStatus === 'expired'}
          <button class="button primary" onclick={startYnabOAuth}>Reconnect YNAB</button>
        {/if}
        <button class="button danger" onclick={disconnect}>
          <Unplug size={16} />
          Disconnect YNAB
        </button>
      </div>
    </div>
  </section>
</main>
