<script lang="ts">
  import { resolve } from '$app/paths';
  import dashboardScreenshotDark from '$lib/assets/screenshot_dark.png';
  import dashboardScreenshotLight from '$lib/assets/screenshot_light.png';
  import GithubIcon from '$lib/landing/github-icon.svelte';
  import SignInButton from '$lib/landing/sign-in-button.svelte';
  import ThemeToggle from '$lib/landing/theme-toggle.svelte';
  import { GITHUB_URL } from '$lib/landing/sample-data';
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

<main class="relative flex min-h-svh flex-col overflow-x-hidden bg-background">
  <div
    class="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
    style="background: radial-gradient(ellipse at top, color-mix(in oklab, var(--primary) 14%, transparent), transparent 65%)"
    aria-hidden="true"
  ></div>

  <header
    class="relative mx-auto flex w-full max-w-[96rem] items-center justify-between px-6 py-4 lg:px-10"
  >
    <span class="text-lg font-semibold tracking-tight">YNAD</span>
    <div class="flex items-center gap-4 text-sm text-muted-foreground">
      <a class="hover:text-foreground hover:opacity-50" href={resolve('/privacy')}>Privacy Policy</a>
      <!-- eslint-disable svelte/no-navigation-without-resolve -->
      <a
        class="inline-flex items-center gap-1.5 hover:text-foreground hover:opacity-50"
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

  <div class="flex flex-1 items-center py-10 lg:py-16">
    <section
      class="relative mx-auto grid w-full max-w-[96rem] items-center gap-10 px-6 lg:grid-cols-[minmax(22rem,0.75fr)_minmax(0,1.5fr)] lg:gap-16 lg:px-10"
    >
      <div class="flex flex-col items-center text-center lg:items-start lg:text-left">
        <h1
          class="text-5xl leading-[1.04] font-semibold tracking-tight text-foreground md:text-6xl lg:text-7xl"
        >
          You Need a <span class="text-[#1d4ed8]">Dashboard</span> for YNAB
        </h1>
        <p class="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
          Create beautiful custom dashboards for your personal finance data.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
          <SignInButton class="px-6" />
        </div>
        <p
          class="mt-5 max-w-xl text-sm text-muted-foreground"
          title="YNAD stores nothing on any server."
        >
          Privacy First — YNAD does not store or log your personal data anywhere. Everything is
          securely stored on-device in your browser.
        </p>
      </div>
      <img
        src={dashboardScreenshotLight}
        alt="YNAD dashboard showing balance, spending, income, net worth, and category charts"
        class="h-auto w-full lg:min-w-0 dark:hidden"
      />
      <img
        src={dashboardScreenshotDark}
        alt=""
        aria-hidden="true"
        class="hidden h-auto w-full lg:min-w-0 dark:block"
      />
    </section>
  </div>
</main>
