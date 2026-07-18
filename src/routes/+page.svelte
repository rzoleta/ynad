<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { BarChart3, LockKeyhole, PanelsTopLeft, ShieldCheck } from '@lucide/svelte';
  import { chartColorForRank } from '$lib/charts/colors';
  import { startYnabOAuth, readToken } from '$lib/ynab/auth';
  import { Button } from '$lib/components/ui/button/index.js';

  let error = $state('');
  const sampleChartColor = chartColorForRank(2);

  $effect(() => {
    if (browser && readToken()) void goto(resolve('/app'));
  });

  async function connect() {
    try {
      await startYnabOAuth();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to start YNAB OAuth.';
    }
  }
</script>

<svelte:head>
  <title>YNAD · You Need A Dashboard</title>
  <meta
    name="description"
    content="A private, browser-local dashboard builder for visualizing YNAB budgets."
  />
</svelte:head>

<main class="min-h-screen bg-background">
  <section
    class="mx-auto grid min-h-[92vh] max-w-7xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_520px]"
  >
    <div class="max-w-3xl">
      <div
        class="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground"
      >
        <ShieldCheck size={16} />
        Privacy First
      </div>
      <h1
        class="max-w-4xl text-5xl leading-[1.02] font-semibold tracking-normal text-foreground md:text-7xl"
      >
        YNAD
      </h1>
      <p class="mt-4 max-w-2xl text-xl leading-8 text-muted-foreground">
        You Need A Dashboard. Build clean, personal finance dashboards from live YNAB data without
        creating a YNAD account. YNAD stores your connection, selected budget, settings, and chart
        layout only in this browser.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <Button variant="primary" class="px-5 py-3" onclick={connect}>
          <LockKeyhole size={18} />
          Connect YNAB
        </Button>
        <Button variant="secondary" class="px-5 py-3" href={resolve('/privacy')}>Privacy</Button>
      </div>
      {#if error}
        <p
          class="mt-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      {/if}
    </div>

    <div class="relative">
      <div class="rounded-lg border border-border bg-card p-4 shadow-xl shadow-sky-950/10">
        <div class="flex items-center justify-between border-b border-border pb-3">
          <div>
            <p class="text-sm font-semibold">Personal dashboard</p>
            <p class="text-xs text-muted-foreground">Live YNAB data · Local chart config</p>
          </div>
          <PanelsTopLeft size={20} class="text-primary" />
        </div>
        <div class="mt-4 grid grid-cols-3 gap-3">
          <div class="col-span-2 rounded-md border border-border bg-background p-4">
            <div class="mb-4 flex items-center justify-between">
              <span class="text-sm font-medium">Monthly spending</span>
              <BarChart3 size={16} class="text-primary" />
            </div>
            <div class="flex h-32 items-end gap-2">
              {#each [42, 68, 51, 74, 63, 88] as height, index (`bar-${index}`)}
                <div class="flex-1 rounded-t bg-primary/80" style={`height:${height}%`}></div>
              {/each}
            </div>
          </div>
          <div class="rounded-md border border-border bg-background p-4">
            <p class="text-xs text-muted-foreground">Net worth</p>
            <p class="mt-3 text-2xl font-semibold">$84.2k</p>
            <p class="mt-2 text-xs text-accent">+4.8%</p>
          </div>
          <div class="col-span-3 rounded-md border border-border bg-background p-4">
            <div class="mb-4 flex items-center justify-between">
              <span class="text-sm font-medium">Balance over time</span>
              <span class="text-xs text-muted-foreground">Last 12 months</span>
            </div>
            <svg
              viewBox="0 0 520 120"
              class="h-32 w-full"
              role="img"
              aria-label="Sample balance line"
            >
              <path
                d="M4 96 C 66 82, 86 64, 132 72 S 214 91, 258 58 S 326 18, 376 42 S 460 70, 516 24"
                fill="none"
                stroke={sampleChartColor}
                stroke-width="6"
                stroke-linecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
