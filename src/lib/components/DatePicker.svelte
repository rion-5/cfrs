<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	export let selectedDate: Date;

	function handleDateChange(event: Event) {
		const input = event.target as HTMLInputElement;
		selectedDate = new Date(input.value);
		dispatch('change', selectedDate);
	}
</script>

<div class="mb-4">
	<label for="date" class="block text-sm font-medium mb-1">날짜 선택</label>
	<input
    id="date"
		type="date"
		bind:value={selectedDate}
		on:change={handleDateChange}
		class="w-full p-2 border rounded"
	/>
</div>