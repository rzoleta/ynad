<script lang="ts">
  import '@fontsource-variable/figtree/index.css';
  import './layout.css';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { ModeWatcher } from 'mode-watcher';
  import { shouldRetryYnabQuery } from '$lib/app/app-state';

  let { children } = $props();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: true,
        retry: shouldRetryYnabQuery
      }
    }
  });
</script>

<ModeWatcher defaultMode="system" />
<QueryClientProvider client={queryClient}>
  {@render children()}
</QueryClientProvider>
