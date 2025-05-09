<script lang="ts">
	// import { createEventDispatcher, } from 'svelte';
	// const dispatch = createEventDispatcher();
	import {formatDateToYYYYMMDD} from '$lib/utils/date';

	export let selectedDate: Date;

	// Date 객체를 YYYY-MM-DD 문자열로 변환
	$: dateString = formatDateToYYYYMMDD(selectedDate);
	function handleDateChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const newDate = new Date(input.value);
			// ✅ 최신 방식: dispatchEvent 사용
			dispatchEvent(new CustomEvent('change', {
				detail: newDate,
				bubbles: true // 부모 컴포넌트가 이벤트를 받을 수 있도록 설정
			}));
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