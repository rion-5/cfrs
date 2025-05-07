<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	let _selectedDate = new Date(); // 내부 Date 객체

	export let selectedDate: Date;
	$: selectedDate = _selectedDate;

	function formatDateToYYYYMMDD(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function parseDateFromInput(value: string): Date {
		return new Date(value + 'T00:00:00'); // 시간 보정
	}

	let dateString = formatDateToYYYYMMDD(_selectedDate);

	// 반응형으로 동기화
	$: {
		_selectedDate = parseDateFromInput(dateString);
		dispatch('change', dateString);
	}
</script>

<div class="mb-4">
	<label for="date" class="block text-sm font-medium mb-1">날짜 선택</label>
	<input
		id="date"
		type="date"
		bind:value={dateString}
		class="w-full p-2 border rounded"
	/>
</div>
