<script lang="ts">
  import { LoaderCircle } from '@lucide/svelte';
</script>

<div
  class="grid min-h-[520px] place-items-center rounded-lg border border-dashed border-border bg-card"
  aria-live="polite"
  aria-busy="true"
>
  <div class="max-w-md p-6 text-center">
    <div class="mx-auto grid size-12 place-items-center rounded-md bg-primary/10 text-primary">
      <LoaderCircle class="animate-spin" size={24} />
    </div>
    <h1 class="mt-5 text-2xl font-semibold">Loading your YNAB data</h1>
    <p class="mt-2 text-muted-foreground">We're fetching your YNAB data and transaction history.</p>
  </div>
</div>
