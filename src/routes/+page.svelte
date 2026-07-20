<script lang="ts">
  import { resolve } from '$app/paths';
  import GithubIcon from '$lib/landing/github-icon.svelte';
  import SampleChart from '$lib/landing/sample-chart.svelte';
  import SignInButton from '$lib/landing/sign-in-button.svelte';
  import ThemeToggle from '$lib/landing/theme-toggle.svelte';
  import {
    GITHUB_URL,
    categoryPieChart,
    netWorthChart,
    spendingChart
  } from '$lib/landing/sample-data';
</script>

<svelte:head>
  <title>YNAD · You Need a Dashboard for YNAB</title>
  <meta
    name="description"
    content="Build a free, private YNAB dashboard with customizable charts for net worth, spending, income, account balances, and more."
  />
  <meta
    name="keywords"
    content="YNAB dashboard, YNAB charts, YNAB reports, personal finance dashboard, budget visualization, spending tracker, net worth tracker"
  />
  <meta name="robots" content="index, follow" />
  <meta name="author" content="YNAD" />
  <link rel="canonical" href="https://ynad.app/" />

  <meta property="og:title" content="YNAD · You Need a Dashboard for YNAB" />
  <meta
    property="og:description"
    content="Build a free, private YNAB dashboard with customizable charts for net worth, spending, income, account balances, and more."
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://ynad.app/" />
  <meta property="og:site_name" content="YNAD" />
  <meta property="og:locale" content="en_US" />

  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="YNAD · You Need a Dashboard for YNAB" />
  <meta
    name="twitter:description"
    content="Build a free, private YNAB dashboard with customizable charts for net worth, spending, income, account balances, and more."
  />

  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "YNAD",
      "alternateName": "You Need a Dashboard",
      "url": "https://ynad.app/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "description": "A free, private dashboard builder for creating customizable charts from YNAB personal finance data.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "isAccessibleForFree": true
    }
  </script>
</svelte:head>

<main class="relative flex min-h-svh flex-col overflow-hidden bg-background lg:h-svh">
  <div
    class="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
    style="background: radial-gradient(ellipse at top, color-mix(in oklab, var(--primary) 14%, transparent), transparent 65%)"
    aria-hidden="true"
  ></div>

  <header class="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
    <span class="text-lg font-semibold tracking-tight">YNAD</span>
    <div class="flex items-center gap-4 text-sm text-muted-foreground">
      <a class="hover:text-foreground" href={resolve('/privacy')}>Privacy Policy</a>
      <!-- eslint-disable svelte/no-navigation-without-resolve -->
      <a
        class="inline-flex items-center gap-1.5 hover:text-foreground"
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer"
      >
        <GithubIcon size={15} />
        GitHub
      </a>
      <!-- eslint-enable svelte/no-navigation-without-resolve -->
      <ThemeToggle variant="ghost" />
    </div>
  </header>

  <div class="flex flex-1 flex-col justify-center lg:gap-12 lg:pb-14">
    <section
      class="relative mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-10 text-center lg:py-0"
    >
      <h1 class="text-5xl leading-[1.04] font-semibold tracking-tight text-foreground md:text-6xl">
        You Need a Dashboard for YNAB
      </h1>
      <p class="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
        Visualize your personal finance into clean, beautiful charts showing your net worth,
        spending, income, and more. Highly customizable and built just the way you want.
      </p>
      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <SignInButton class="px-6" />
      </div>
      <p class="mt-5 text-sm text-muted-foreground" title="YNAD stores nothing on any server.">
        Privacy First — YNAD does not store or log your personal data anywhere. Everything is
        securely stored on-device in your browser.
      </p>
    </section>

    <section class="relative mx-auto w-full max-w-6xl px-6 pb-8 lg:pb-0">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-lg border border-border bg-card/70 p-4 backdrop-blur">
          <div class="mb-1 flex items-baseline justify-between gap-2">
            <h2 class="text-sm font-semibold">Net Worth</h2>
            <p class="text-xs text-muted-foreground">Last 12 months</p>
          </div>
          <SampleChart spec={netWorthChart} class="h-[190px]" />
        </div>
        <div class="rounded-lg border border-border bg-card/70 p-4 backdrop-blur">
          <div class="mb-1 flex items-baseline justify-between gap-2">
            <h2 class="text-sm font-semibold">Monthly Spending</h2>
            <p class="text-xs text-muted-foreground">Last 6 months</p>
          </div>
          <SampleChart spec={spendingChart} class="h-[190px]" />
        </div>
        <div class="rounded-lg border border-border bg-card/70 p-4 backdrop-blur">
          <div class="mb-1 flex items-baseline justify-between gap-2">
            <h2 class="text-sm font-semibold">Spending by Category</h2>
            <p class="text-xs text-muted-foreground">This month</p>
          </div>
          <SampleChart spec={categoryPieChart} class="mt-3 h-[175px]" />
        </div>
      </div>
    </section>
  </div>
</main>
