<script lang="ts">
  import { Moon, Sun } from '@lucide/svelte';
  import { mode, toggleMode } from 'mode-watcher';
  import { Button, type ButtonVariant } from '$lib/components/ui/button/index.js';

  let {
    variant = 'secondary',
    class: className
  }: {
    variant?: ButtonVariant;
    class?: string;
  } = $props();

  const darkModeEnabled = $derived(mode.current === 'dark');
  const themeToggleLabel = $derived(
    darkModeEnabled ? 'Switch to light mode' : 'Switch to dark mode'
  );
</script>

<Button
  size="icon"
  {variant}
  class={className}
  title={themeToggleLabel}
  aria-label={themeToggleLabel}
  onclick={toggleMode}
>
  {#if darkModeEnabled}
    <Sun size={17} />
  {:else}
    <Moon size={17} />
  {/if}
</Button>
