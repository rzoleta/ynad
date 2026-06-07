<script lang="ts">
  import { resolve } from '$app/paths';
  import { AlertTriangle, RefreshCcw } from '@lucide/svelte';
  import type { YnabErrorCode } from '$lib/ynab/errors';

  let {
    code,
    title,
    message,
    canRefresh,
    onRefresh,
    onReconnect
  }: {
    code: YnabErrorCode;
    title: string;
    message: string;
    canRefresh: boolean;
    onRefresh: () => void | Promise<void>;
    onReconnect: () => void | Promise<void>;
  } = $props();
</script>

<div
  class="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-danger/40 bg-danger/10 p-4 text-danger"
  role="alert"
>
  <div class="flex min-w-0 items-start gap-3">
    <AlertTriangle class="mt-0.5 shrink-0" size={19} />
    <div class="min-w-0">
      <p class="font-medium">{title}</p>
      <p class="mt-1 text-sm">{message}</p>
    </div>
  </div>

  <div class="flex flex-wrap gap-2">
    {#if code === 'reconnect-required'}
      <button type="button" class="button primary" onclick={onReconnect}>Reconnect YNAB</button>
    {:else if code === 'budget-unavailable'}
      <a class="button secondary" href={resolve('/app/settings')}>Settings</a>
    {:else}
      <button type="button" class="button secondary" disabled={!canRefresh} onclick={onRefresh}>
        <RefreshCcw size={16} />
        Refresh
      </button>
    {/if}
  </div>
</div>
