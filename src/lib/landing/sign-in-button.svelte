<script lang="ts">
  import { LockKeyhole } from '@lucide/svelte';
  import { track } from '@vercel/analytics';
  import { signInWithYnab } from '$lib/client/auth-client';
  import { Button, type ButtonVariant } from '$lib/components/ui/button/index.js';

  let {
    variant = 'primary',
    class: className
  }: {
    variant?: ButtonVariant;
    class?: string;
  } = $props();

  let error = $state('');

  async function connect() {
    track('sign_in');

    try {
      await signInWithYnab();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to start YNAB sign-in.';
    }
  }
</script>

<Button {variant} class={className} onclick={connect}>
  <LockKeyhole size={18} />
  Sign in with YNAB
</Button>
{#if error}
  <p class="basis-full text-sm text-danger" role="alert">{error}</p>
{/if}
