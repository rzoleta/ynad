<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { completeYnabOAuth } from '$lib/ynab/auth';

  let status = $state('Completing YNAB connection...');
  let error = $state('');

  onMount(async () => {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));

    if (!params.get('access_token') || !params.get('state')) {
      error = 'Missing OAuth callback parameters.';
      return;
    }

    try {
      completeYnabOAuth(params);
      await goto(resolve('/app'));
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to complete YNAB connection.';
      status = 'Connection failed.';
    }
  });
</script>

<svelte:head>
  <title>Connecting YNAB · YNAD</title>
  <meta name="robots" content="noindex, nofollow, noarchive" />
</svelte:head>

<main class="grid min-h-screen place-items-center px-5">
  <div class="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
    <h1 class="text-xl font-semibold">{status}</h1>
    {#if error}
      <p class="mt-3 text-sm text-danger">{error}</p>
      <a
        class="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground"
        href={resolve('/')}
      >
        Return home
      </a>
    {:else}
      <p class="mt-3 text-sm text-muted-foreground">You will be redirected shortly.</p>
    {/if}
  </div>
</main>
