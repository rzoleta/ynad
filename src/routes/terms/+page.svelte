<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Terms · YNAD</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-5 py-16">
	<a href={resolve('/')} class="text-sm font-medium text-primary">YNAD</a>
	<h1 class="mt-6 text-4xl font-semibold">Terms and disclaimer</h1>
	<div class="mt-8 space-y-5 text-muted-foreground">
		<p>
			YNAD is an independent third-party tool for YNAB users. It is not affiliated with, endorsed
			by, or sponsored by YNAB.
		</p>
		<p>
			YNAD is for personal visualization and analysis only. It is not financial, tax, legal, or
			investment advice.
		</p>
	</div>
</main>
