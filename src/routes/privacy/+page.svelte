<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<svelte:head>
  <title>Privacy · YNAD</title>
  <meta
    name="description"
    content="Learn how YNAD keeps your YNAB dashboard data private and what is stored on its servers."
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
      YNAD stores your account identity, your YNAB OAuth authorization (including the refresh token,
      used server-side to fetch data on your behalf), and your dashboard chart configuration and
      preferences in its database. Your YNAB connection and dashboards follow you across devices.
    </p>
    <p>
      YNAB financial data — transactions, accounts, categories, and payees — is fetched live from
      the YNAB API when you open your dashboard and is kept only in the in-memory app session. It is
      never written to the YNAD database.
    </p>
    <p>
      Signing out ends your session. To revoke YNAD's access to your YNAB data entirely, revoke the
      YNAD application from your YNAB account settings.
    </p>
  </div>
</main>
