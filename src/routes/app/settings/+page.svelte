<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Moon, Sun, Unplug } from '@lucide/svelte';
  import { setMode, userPrefersMode } from 'mode-watcher';
  import { onMount } from 'svelte';
  import {
    getEffectiveWeekStart,
    readSettings,
    writeSettings,
    type WeekStart
  } from '$lib/app/settings';
  import { clearYnabConnection, readSelectedBudgetId, readToken } from '$lib/ynab/auth';

  let tokenPresent = $state(false);
  let budgetId = $state<string | null>(null);
  let weekStart = $state<WeekStart>(7);

  onMount(() => {
    tokenPresent = Boolean(readToken());
    budgetId = readSelectedBudgetId();
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
        <select
          bind:value={weekStart}
          onchange={(event) => saveWeekStart(Number(event.currentTarget.value) as WeekStart)}
        >
          <option value={1}>Monday</option>
          <option value={2}>Tuesday</option>
          <option value={3}>Wednesday</option>
          <option value={4}>Thursday</option>
          <option value={5}>Friday</option>
          <option value={6}>Saturday</option>
          <option value={7}>Sunday</option>
        </select>
      </label>
    </div>

    <div class="rounded-lg border border-border bg-card p-5">
      <h2 class="text-lg font-semibold">YNAB connection</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        {tokenPresent ? 'YNAB is connected in this browser.' : 'YNAB is not connected.'}
      </p>
      <p class="mt-2 text-xs text-muted-foreground">Selected budget: {budgetId ?? 'None'}</p>
      <button class="button danger mt-4" onclick={disconnect}>
        <Unplug size={16} />
        Disconnect YNAB
      </button>
    </div>
  </section>
</main>
