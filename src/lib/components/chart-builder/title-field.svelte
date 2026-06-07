<script lang="ts">
  import type { ChartConfig } from '$lib/app/chart-config';

  let {
    chart,
    onChange
  }: {
    chart: ChartConfig;
    onChange: (chart: ChartConfig) => void;
  } = $props();

  function updateTitle(event: Event) {
    const title = event.currentTarget instanceof HTMLInputElement ? event.currentTarget.value : '';
    onChange({ ...chart, title, titleEdited: true });
  }
</script>

<label class="field">
  <span>Title</span>
  <input value={chart.title} oninput={updateTitle} />
</label>
