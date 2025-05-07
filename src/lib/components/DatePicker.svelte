<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { toKSTDateString } from '$lib/utils/date';
	const dispatch = createEventDispatcher();
	export let selectedDate: Date;

	// Date 객체를 YYYY-MM-DD 문자열로 변환
	$: dateString = toKSTDateString(selectedDate);

	function handleDateChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const newDate = new Date(input.value);
		if (!isNaN(newDate.getTime())) {
			selectedDate = newDate;
			dispatch('change', selectedDate);
		}
	}
</script>

<div class="mb-4">
	<label for="date" class="mb-1 block text-sm font-medium">날짜 선택</label>
	<input
		id="date"
		type="date"
		bind:value={dateString}
		on:change={handleDateChange}
		class="w-full rounded border p-2"
	/>
</div>
