
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { reservationStore } from '$lib/stores/reservation';
	import type { ClassroomAvailability } from '$lib/types';

	const dispatch = createEventDispatcher();

	// 강의실 데이터 정렬 및 슬롯 필터링
	let availability: ClassroomAvailability[] = [];
	$: sortedAvailability = $reservationStore.availability
		.sort((a, b) => a.room_number.localeCompare(b.room_number))
		.map((classroom) => ({
			...classroom,
			slots: classroom.slots.filter(
				(slot) =>
					slot.start >= '09:00' &&
					slot.end <= '22:00' &&
					['00', '30'].includes(slot.start.split(':')[1])
			)
		}));

	// 시간축: 9시 ~ 22시, 30분 단위
	const hours = Array.from({ length: 13 }, (_, i) => 9 + i); // 9 to 22
	const timeSlots = hours.flatMap((hour) => [
		{ start: `${hour.toString().padStart(2, '0')}:00`, end: `${hour.toString().padStart(2, '0')}:30` },
		{ start: `${hour.toString().padStart(2, '0')}:30`, end: `${(hour + 1).toString().padStart(2, '0')}:00` }
	]);
</script>

<div class="overflow-x-auto">
	<table class="w-full border-collapse">
		<thead>
			<tr>
				<th class="border p-2">강의실</th>
				{#each hours as hour}
					<th class="border p-2 text-center" colspan="2">{hour}</th>
				{/each}
			</tr>
			<tr>
				<th class="border p-2"></th>
				{#each timeSlots as slot}
					<th class="border p-2 text-center text-sm">
						{slot.start.split(':')[1] === '00' ? '00' : '30'}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each sortedAvailability as classroom}
				<tr>
					<td class="border p-2">{classroom.room_number}</td>
					{#each timeSlots as slot}
						{@const slotData = classroom.slots.find((s) => s.start === slot.start && s.end === slot.end)}
						<td
							class="border p-2 text-center"
							class:bg-gray-300={!slotData?.available}
							class:cursor-not-allowed={!slotData?.available}
							class:hover:bg-blue-100={slotData?.available}
							class:cursor-pointer={slotData?.available}
							on:click={() => slotData?.available && dispatch('select', { classroom, slot })}
						>
							{#if !slotData?.available}&#10003;{:else}&nbsp;{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	:global(.overflow-x-auto) {
		max-width: 100%;
		overflow-x: auto;
	}
	:global(table) {
		min-width: 1000px;
	}
	:global(th, td) {
		min-width: 40px;
	}
</style>
