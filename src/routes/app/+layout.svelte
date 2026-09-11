<script lang="ts">
  import { onMount } from 'svelte';
  import { loadAppSettings } from '$lib/app/settings';

  let { children } = $props();

  onMount(() => {
    void loadAppSettings();
  });
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow, noarchive" />
</svelte:head>

{@render children()}
