<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<svelte:head>
  <title>Terms · YNAD</title>
  <meta
    name="description"
    content="Read the terms and disclaimer for YNAD, an independent read-only dashboard and visualization tool for YNAB."
  />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://ynad.app/terms" />
</svelte:head>

<main class="mx-auto max-w-3xl px-5 py-16">
  <a href={resolve('/')} class="text-sm font-medium text-primary">YNAD</a>
  <h1 class="mt-6 text-4xl font-semibold">Terms and disclaimer</h1>
  <div class="mt-8 space-y-5 text-muted-foreground">
    <p>
      YNAD is an independent third-party tool for YNAB users. It is not affiliated with, endorsed
      by, or sponsored by YNAB.
    </p>
    <p>
      YNAD requests read-only API access. It can fetch budget data for dashboard visualization, but
      it does not create, update, or delete YNAB budget data.
    </p>
    <p>
      YNAD is for personal visualization and analysis only. It is not financial, tax, legal, or
      investment advice.
    </p>
    <p>
      Use Disconnect YNAB to remove the browser-local token and selected budget for this browser.
      Dashboard configuration and settings are also browser-local.
    </p>
  </div>
</main>
