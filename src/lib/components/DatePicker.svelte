<!-- src/lib/components/DataPicker.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { formatDateToYYYYMMDD } from '$lib/utils/date';

	const dispatch = createEventDispatcher();
	export let selectedDate: Date;

	// Date 객체를 YYYY-MM-DD 문자열로 변환
	$: dateString = formatDateToYYYYMMDD(selectedDate);

	// KST 기준 오늘 날짜
	const today = formatDateToYYYYMMDD(new Date());

	function handleDateChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const newDate = new Date(input.value);
		if (!isNaN(newDate.getTime()) && input.value >= today) {
			selectedDate = newDate;
			dispatch('change', selectedDate);
		} else {
			// 오늘 이전 날짜 선택 시 오늘로 재설정
			selectedDate = new Date(today);
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
		min={today}
		class="w-full rounded border p-2"
	/>
	{#if dateString < today}
		<p class="text-sm text-red-500">오늘 이후 날짜를 선택하세요.</p>
	{/if}
</div>