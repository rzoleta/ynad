<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<svelte:head>
  <title>Privacy · YNAD</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-5 py-16">
  <a href={resolve('/')} class="text-sm font-medium text-primary">YNAD</a>
  <h1 class="mt-6 text-4xl font-semibold">Privacy</h1>
  <div class="mt-8 space-y-5 text-muted-foreground">
    <p>YNAD is designed as a browser-local, read-only dashboard for YNAB data.</p>
    <p>
      The MVP stores OAuth tokens, selected budget ID, app settings, and dashboard chart
      configuration in your browser. It does not operate a user database.
    </p>
    <p>
      YNAB financial data is fetched live from the YNAB API and kept in the in-memory app session
      cache. It is not persisted to localStorage or IndexedDB by YNAD.
    </p>
  </div>
</main>
