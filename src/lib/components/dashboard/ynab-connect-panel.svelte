<script lang="ts">
  import { Link } from '@lucide/svelte';

  import { Button } from '$lib/components/ui/button/index.js';

  let {
    onConnect
  }: {
    onConnect: () => void | Promise<void>;
  } = $props();
</script>

<div
  class="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-5"
>
  <div class="flex min-w-0 items-start gap-3">
    <div class="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
      <Link size={20} />
    </div>
    <div class="min-w-0">
      <p class="font-medium">Reconnect YNAB</p>
      <p class="mt-1 text-sm text-muted-foreground">
        Your YNAB authorization needs to be renewed before charts can refresh.
      </p>
    </div>
  </div>
  <Button variant="primary" onclick={onConnect}>Reconnect YNAB</Button>
</div>
