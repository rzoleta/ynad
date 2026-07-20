<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<svelte:head>
  <title>Privacy · YNAD</title>
  <meta
    name="description"
    content="Learn how YNAD keeps your YNAB dashboard data private and stores settings locally in your browser."
  />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://ynad.app/privacy" />
</svelte:head>

<main class="mx-auto max-w-3xl px-5 py-16">
  <a href={resolve('/')} class="text-sm font-medium text-primary">YNAD</a>
  <h1 class="mt-6 text-4xl font-semibold">Privacy</h1>
  <div class="mt-8 space-y-5 text-muted-foreground">
    <p>
      YNAD is an independent third-party dashboard for YNAB users. It uses read-only YNAB API access
      and does not modify your budget.
    </p>
    <p>
      OAuth access tokens, selected budget ID, app settings, and dashboard chart configuration are
      stored in your browser. YNAD does not operate a backend user account database.
    </p>
    <p>
      YNAB financial data is fetched live from the YNAB API and kept in the in-memory app session
      cache. It is not persisted to localStorage or IndexedDB by YNAD.
    </p>
    <p>
      The current connection flow stores an expiring browser-local access token. When that token
      expires or you use Disconnect YNAB, reconnect through YNAB to fetch fresh data again.
    </p>
  </div>
</main>
