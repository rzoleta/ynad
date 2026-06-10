<script lang="ts">
  import { Link, RefreshCw } from '@lucide/svelte';

  import { Button } from '$lib/components/ui/button/index.js';

  let {
    status,
    onConnect
  }: {
    status: 'disconnected' | 'expired';
    onConnect: () => void | Promise<void>;
  } = $props();

  const title = $derived(status === 'expired' ? 'Reconnect YNAB' : 'Connect YNAB');
  const message = $derived(
    status === 'expired'
      ? 'Your browser token expired. Local chart cards remain available.'
      : 'Live budget data is required before charts can calculate.'
  );
</script>

<div
  class="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-5"
>
  <div class="flex min-w-0 items-start gap-3">
    <div class="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
      {#if status === 'expired'}
        <RefreshCw size={20} />
      {:else}
        <Link size={20} />
      {/if}
    </div>
    <div class="min-w-0">
      <p class="font-medium">{title}</p>
      <p class="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
  <Button variant="primary" onclick={onConnect}>{title}</Button>
</div>
