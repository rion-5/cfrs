<script lang="ts">
	// import { createEventDispatcher } from 'svelte';
	// const dispatch = createEventDispatcher();
	export let selectedTimeRange: { start: string; end: string };

	function handleChange() {
		// dispatch('change', selectedTimeRange);
					// ✅ 최신 방식: dispatchEvent 사용
					dispatchEvent(new CustomEvent('change', {
				detail: selectedTimeRange,
				bubbles: true // 부모 컴포넌트가 이벤트를 받을 수 있도록 설정
			}));
	}
</script>

<div class="mb-4">
	<label for="time" class="block text-sm font-medium mb-1">시간대 선택</label>
	<select
		bind:value={selectedTimeRange.start}
		on:change={handleChange}
		class="w-full p-2 border rounded mb-2"
	>
		{#each ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'] as time}
			<option value={time}>{time}</option>
		{/each}
	</select>
	<select
		bind:value={selectedTimeRange.end}
		on:change={handleChange}
		class="w-full p-2 border rounded"
	>
		{#each ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'] as time}
			<option value={time}>{time}</option>
		{/each}
	</select>
</div>