<script lang="ts">
  import type { ChartConfig } from '$lib/app/chart-config';

  let {
    chart,
    onChange,
    compact = false
  }: {
    chart: ChartConfig;
    onChange: (chart: ChartConfig) => void;
    compact?: boolean;
  } = $props();

  function updateTitle(event: Event) {
    const title = event.currentTarget instanceof HTMLInputElement ? event.currentTarget.value : '';
    onChange({ ...chart, title, titleEdited: true });
  }
</script>

<label class="field">
  <span class={compact ? 'text-xs text-muted-foreground' : undefined}>Title</span>
  <input class="max-w-[20rem]" value={chart.title} oninput={updateTitle} />
</label>
